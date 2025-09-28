import {
  StateGraph,
  START,
  END,
  Annotation,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

import { LearningAI } from "./agents/learning/learning.agent";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { BaseCheckpointSaver } from "@langchain/langgraph";
import { RouteAgent, Intent } from "./agents/route/route.agent";
import { SummaryAgent } from "./agents/summary/summary.agent";
import { BackgroundAgent } from "./agents/background/background.agent";
import { TaskEnum } from "./agents/background/background.agent";

enum Steps {
  INITIAL = "Initial",
  LEARNING_AI = "LearningAI",
  ROUTE_AI = "RouteAI",
  SUMMARY_AI = "SummaryAI",
  BACKGROUND_AI = "BackgroundAI",
}

const ChatStateAnnotation = Annotation.Root({
  // 它可以自動 append messages
  ...MessagesAnnotation.spec,
  query: Annotation<string>,
  step: Annotation<Steps>,
  intent: Annotation<Intent | null>,
  background: Annotation<{
    domain: string;
    level: string;
  } | null>,
});

type ChatState = typeof ChatStateAnnotation.State;

export class ChatWorkflow {
  private learningAgent: LearningAI | null = null;
  private routeAgent: RouteAgent | null = null;
  private summaryAgent: SummaryAgent | null = null;
  private backgroundAgent: BackgroundAgent | null = null;

  private graph: ReturnType<typeof this.buildGraph>;
  private threadId: string | null = null;
  private checkpointSaver: BaseCheckpointSaver | null = null;
  private currentState: ChatState | null = null;

  constructor() {}

  public async initialize(threadId: string) {
    this.threadId = threadId;
    this.checkpointSaver = await RedisSaver.fromUrl(process.env.REDIS_URL!, {
      defaultTTL: 60, // TTL in minutes
      refreshOnRead: true,
    });
    this.learningAgent = new LearningAI(this.checkpointSaver, {
      threadId: this.threadId,
    });
    this.routeAgent = new RouteAgent();
    this.summaryAgent = new SummaryAgent(this.checkpointSaver, {
      threadId: this.threadId,
    });
    this.backgroundAgent = new BackgroundAgent({
      threadId: this.threadId,
    });

    this.graph = this.buildGraph();
    this.currentState = await this.getCurrentState();
  }

  private buildGraph() {
    const workflow = new StateGraph(ChatStateAnnotation)
      .addNode(Steps.INITIAL, async (state: ChatState): Promise<ChatState> => {
        console.log("initial", state);
        return {
          step: Steps.INITIAL,
          query: state.query,
          messages: [],
          intent: null,
          background: state.background,
        };
      })
      .addNode(Steps.ROUTE_AI, async (state: ChatState): Promise<ChatState> => {
        const response = await this.routeAgent!.callLLM(state.query);
        console.log("response", response);

        return {
          step: Steps.ROUTE_AI,
          query: state.query,
          messages: [],
          intent: response,
          background: state.background,
        };
      })
      .addNode(
        Steps.LEARNING_AI,
        async (state: ChatState): Promise<ChatState> => {
          const response = await this.learningAgent!.callLLM(state.query);

          return {
            step: Steps.LEARNING_AI,
            messages: [...response],
            query: state.query,
            intent: state.intent,
            background: state.background,
          };
        }
      )
      .addNode(
        Steps.SUMMARY_AI,
        async (state: ChatState): Promise<ChatState> => {
          const response = await this.summaryAgent!.callLLM(state.query);

          return {
            step: Steps.SUMMARY_AI,
            messages: [...response],
            query: state.query,
            intent: state.intent,
            background: state.background,
          };
        }
      )
      .addNode(
        Steps.BACKGROUND_AI,
        async (state: ChatState): Promise<ChatState> => {
          if (state.background) {
            return state;
          }

          const result = await this.backgroundAgent!.callLLM(state.query);
          let messages: BaseMessage[] = [];
          let background: {
            domain: string;
            level: string;
          } | null = null;
          console.log("result", result);

          if (result.task === TaskEnum.ASK_BACKGROUND) {
            messages = [new HumanMessage((result.response as any).message!)];
          } else {
            background = result.response;
          }

          return {
            step: Steps.BACKGROUND_AI,
            messages: messages,
            query: state.query,
            intent: state.intent,
            background,
          };
        }
      )
      .addEdge(START, Steps.INITIAL)
      .addEdge(Steps.INITIAL, Steps.ROUTE_AI)
      .addConditionalEdges(Steps.ROUTE_AI, (state: ChatState) => {
        if (!state.intent) {
          return END;
        }
        if (state.intent === Intent.SUMMARY) {
          return Steps.SUMMARY_AI;
        }
        return Steps.BACKGROUND_AI;
      })
      .addEdge(Steps.SUMMARY_AI, END)
      .addConditionalEdges(Steps.BACKGROUND_AI, (state: ChatState) => {
        if (state.background) {
          return Steps.LEARNING_AI;
        }
        return END;
      })
      .addEdge(Steps.LEARNING_AI, END);

    if (!this.checkpointSaver) {
      throw new Error("Checkpoint saver is not initialized");
    }
    return workflow.compile({
      checkpointer: this.checkpointSaver,
    });
  }

  async getMermaidGraph(): Promise<string> {
    const workflow = this.buildGraph();
    return workflow.getGraph().drawMermaid();
  }

  async *processMessage(
    message: string
  ): AsyncGenerator<string, void, unknown> {
    this.currentState!.query = message;

    console.log("this.currentState", this.currentState);
    const result: ChatState = await this.graph.invoke(this.currentState, {
      configurable: {
        thread_id: this.threadId,
      },
    });

    yield result.messages[result.messages.length - 1].content as string;
  }

  async getCurrentState(): Promise<ChatState | null> {
    if (!this.threadId) return null;

    const config = {
      configurable: {
        thread_id: this.threadId,
      },
    };

    try {
      const stateSnapshot = await this.graph.getState(config);
      if(!stateSnapshot) return null;

      return stateSnapshot.values as ChatState;
    } catch (error) {
      console.error("Error getting current state:", error);
      return null;
    }
  }
}
