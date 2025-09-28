import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createAgent, toolStrategy } from "langchain";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";

import { Configurable } from "../interfaces/configurable";

const checkpointer = new MemorySaver();

const BackGroupSchema = z.object({
  task: z.literal(TaskEnum.ASK_BACKGROUND),
  response: z.object({
    message: z.string().describe("你問的問題"),
  }),
}).describe("當學生提問想學習的領域後，你需要回傳的問題");

const AnswerBackGroupSchema = z.object({
  task: z.literal(TaskEnum.ANSWER_BACKGROUND),
  response: z.object({
    domain: z.string().describe("學生想學習的領域"),
    level: z.enum(["low", "medium", "high"])
      .describe("學生對想學習的領域的熟悉程度，low、medium、high"),
  }),
}).describe("當學生回答熟悉程度，低、中、高，你需要根據上下文，來回傳的學生背景");

const ResponseFormatSchema = z.discriminatedUnion("task", [
  BackGroupSchema,
  AnswerBackGroupSchema,
]);

export const enum TaskEnum {
  ASK_BACKGROUND = "ask-background",
  ANSWER_BACKGROUND = "answer-background",
}

/**
 * 背景 AI 服務，他用來尋問學生背景
 */
export class BackgroundAgent {
  private configurable: Configurable;
  private agent: any;

  constructor(configurable: Configurable) {
    this.configurable = configurable;
    this.agent = createAgent({
      model: "openai:gpt-5-nano",
      tools: [],
      checkpointer: checkpointer,
      responseFormat: toolStrategy([
        AnswerBackGroupSchema,
        BackGroupSchema,
      ]),
    });
  }

  async callLLM(
    message: string
  ): Promise<z.infer<typeof ResponseFormatSchema>> {
    const humanMessage = new HumanMessage(message);
    const systemMessage = new SystemMessage(`

## Context(上下文)
- Role: 你是一位教學型助教。

## Instructions(明確的指令)
1. 尋問學生背景，用以下兩個問題，為了準備後續的學習。
- 你對想學習的{domain}的熟悉程度是什麼? 低、中、高 ? 
2. 根據學生的回答，回傳學生的背景

## Example
#### Example 1:
學生提問: 我想學習日本戰國史，關於關原之戰的歷史
回答: 
{
    task: "ask-background",
    response: {
        message: "你對日本戰國史的熟悉程度是什麼? 低、中、高 ? "
    }
}

學生接下來的回答: 低

你會根據上一次學生的提問，回傳以下結果
回傳:
{
  task: "answer-background",
  response; {
    domain: "日本戰國史",
    level: "low",
  }
}  

#### Example 2:
學生提問: 我想學習 LangChain
回答: 
{
    task: "ask-background",
    response: {
        message: "你對 LangChain 的熟悉程度是什麼? 低、中、高 ? "
    }
}

學生接下來的回答: 低

你會根據上一次學生的提問，回傳以下結果
回傳:
{
  task: "answer-background",
  response; {
    domain: "LangChain",
    level: "low",
  }
}  

# Additional Requirements
- 嚴禁以文字回覆，必須以結構化輸出工具回傳
- 回傳的結果需符合 ResponseFormatSchema 的格式，並且只能回傳一個結果
    `);

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

    return response.structuredResponse;
  }
}
