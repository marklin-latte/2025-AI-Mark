import {
  StateGraph,
  START,
  END,
  Annotation,
  MessagesAnnotation,
} from "@langchain/langgraph";

import { BaseChatAI } from "./agents/base.agent";

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

  constructor() {}

  public async initialize(threadId: string) {
    this.baseChatAI = new BaseChatAI();
    this.graph = this.buildGraph();
    this.threadId = threadId;
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

    return workflow.compile();
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

    const result: ChatState = await this.graph.invoke(initialState);

    yield result.messages[result.messages.length - 1].content as string;
  }
}
