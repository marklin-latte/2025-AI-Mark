import {
  StateGraph,
  START,
  END,
  Annotation,
  MessagesAnnotation,
} from "@langchain/langgraph";

import { BaseChatAI } from "./agents/base.agent";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { BaseCheckpointSaver } from "@langchain/langgraph";

enum Steps {
  INITIAL = "initial",
  CALL_CHAT_AI = "call_chat_ai",
}

const ChatStateAnnotation = Annotation.Root({
  // 它可以自動 append messages
  ...MessagesAnnotation.spec,
  query: Annotation<string>,
  step: Annotation<Steps>,
});

type ChatState = typeof ChatStateAnnotation.State;

export class ChatWorkflow {
  private baseChatAI: BaseChatAI | null = null;
  private graph: ReturnType<typeof this.buildGraph>;
  private threadId: string | null = null;
  private checkpointSaver: BaseCheckpointSaver | null = null;

  constructor() {}

  public async initialize(threadId: string) {
    this.threadId = threadId;
    this.checkpointSaver = await RedisSaver.fromUrl(process.env.REDIS_URL!, {
      defaultTTL: 60, // TTL in minutes
      refreshOnRead: true,
    });
    this.baseChatAI = new BaseChatAI(this.checkpointSaver, {
      threadId: this.threadId,
    });
    this.graph = this.buildGraph();
  }

  private buildGraph() {
    const workflow = new StateGraph(ChatStateAnnotation)
      .addNode(Steps.INITIAL, async (state: ChatState): Promise<ChatState> => {
        return {
          step: Steps.INITIAL,
          query: state.query,
          messages: [],
        };
      })
      .addNode(
        Steps.CALL_CHAT_AI,
        async (state: ChatState): Promise<ChatState> => {
          const response = await this.baseChatAI!.callLLM(state.query);

          return {
            step: Steps.CALL_CHAT_AI,
            messages: [...response],
            query: state.query,
          };
        }
      )
      .addEdge(START, Steps.INITIAL)
      .addEdge(Steps.INITIAL, Steps.CALL_CHAT_AI)
      .addEdge(Steps.CALL_CHAT_AI, END);

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
    const initialState: ChatState = {
      query: message,
      step: Steps.INITIAL,
      messages: [],
    };

    const result: ChatState = await this.graph.invoke(initialState, {
      configurable: {
        thread_id: this.threadId,
      },
    });

    yield result.messages[result.messages.length - 1].content as string;
  }
}
