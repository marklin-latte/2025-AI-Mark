import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { Configurable } from "./interfaces/configurable";
import { BaseCheckpointSaver } from "@langchain/langgraph";
import { BasePromptGenerator } from "./prompts/base";

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
 * 基礎 Chat AI 服務，他可以做任何事情，不會做任何限制
 */
export class BaseChatAI {
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
    const systemMessage = BasePromptGenerator.getBaseChatPrompt(["AI"]);
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
