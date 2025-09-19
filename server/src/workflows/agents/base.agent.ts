import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, SystemMessage, HumanMessage } from "langchain";

/**
 * 基礎 Chat AI 服務，他可以做任何事情，不會做任何限制
 */
export class BaseChatAI {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-5-mini",
    });
  }

  async callLLM(message: string): Promise<BaseMessage[]> {
    const messages = [
      new SystemMessage(
        "你是 AI 知識學習助理，會回答 AI 相關知識，回應不超過 300 個字"
      ),
      new HumanMessage(message),
    ];
    const response = await this.model.invoke(messages);

    return [response];
  }
}
