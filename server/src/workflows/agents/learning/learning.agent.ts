import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { Configurable } from "../interfaces/configurable";
import { BaseCheckpointSaver } from "@langchain/langgraph";
import { BasePromptGenerator } from "./prompt";
import { ChatOpenAI } from "@langchain/openai";


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
 * 引導學生學習的 AI 服務，他可以引導學生學習，並且產出教材
 */
export class LearningAI {
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
      llm: new ChatOpenAI({
        model: "gpt-5-mini",
        timeout: 1200000,
        promptCacheKey: 'base-chat-ai',
      }),
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
