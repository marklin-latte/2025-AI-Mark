import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { Configurable } from "../interfaces/configurable";
import { BaseCheckpointSaver } from "@langchain/langgraph";
import { BasePromptGenerator } from "./prompt";

const cleanMessageMiddleware = createMiddleware({
  name: "cleanMessageMiddleware",
  afterModel: (state: { messages: BaseMessage[] }) => {
    state.messages = state.messages.filter((message: BaseMessage) => {
      if (message instanceof HumanMessage || message instanceof AIMessage) {
        return true;
      }
      return false;
    });

    return state;
  },
});

/**
 * 總結 AI 服務，他可以總結今日的學習
 */
export class SummaryAgent {
  private checkpointSaver: BaseCheckpointSaver;
  private configurable: Configurable;
  private agent: any;

  constructor(
    checkpointSaver: BaseCheckpointSaver,
    configurable: Configurable
  ) {
    this.checkpointSaver = checkpointSaver;
    this.configurable = configurable;
    this.agent = createAgent({
      model: "openai:gpt-5-mini",
      tools: [],
      checkpointer: this.checkpointSaver,
      // ref: https://blog.langchain.com/agent-middleware/
      middleware: [cleanMessageMiddleware],
    });
  }

  async callLLM(message: string): Promise<BaseMessage[]> {
    const systemMessage = BasePromptGenerator.getBaseChatPrompt();
    const humanMessage = new HumanMessage(message);
    
    const response = await this.agent.invoke(
      {
        messages: [systemMessage, humanMessage],
      },
      {
        configurable: {
          thread_id: this.configurable.threadId,
        },
      }
    );

    return [response.messages[response.messages.length - 1]];
  }
}
