import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { BasePromptGenerator } from "./prompt";

export enum Intent {
  SUMMARY = "summary",
  LEARNING = "learning",
}

const IntentSchema = z.object({
  intent: z.enum(Object.values(Intent) as [string, ...string[]]),
});

/**
 * 路由 AI 服務，他可以根據不同的需求，選擇不同的 AI Agent
 */
export class RouteAgent {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      model: "gpt-5-nano",
    });
  }

  async callLLM(message: string): Promise<Intent> {
    const systemMessage = BasePromptGenerator.getBaseChatPrompt();

    const response = await this.model
      .withStructuredOutput(IntentSchema)
      .invoke([systemMessage, new HumanMessage(message)]);

    return response.intent as Intent;
  }
}
