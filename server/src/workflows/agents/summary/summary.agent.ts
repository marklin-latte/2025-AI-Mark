import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { Configurable } from "../interfaces/configurable";
import { BaseCheckpointSaver } from "@langchain/langgraph";
import { z } from "zod";

import { BasePromptGenerator } from "./prompt";
import { getLearningRecords } from "./tools/getLearningRecord";
export enum TaskEnum {
  SUMMARY = "summary",
  GET_LEARNING_RECORDS = "get-learning-records",
}

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

const ResponseFormatSchema = z
  .object({
    task: z
      .enum(Object.values(TaskEnum) as [string, ...string[]])
      .describe(
        "任務: summary 總結今日的學習/ get-learning-records 取得學習記錄/取得昨天學習的結果/取得某一天學習的結果"
      ),
    response: z
      .array(
        z.object({
          youLearned: z.string().describe("你學習了什麼"),
          yourOutput: z.string().describe("你的產出"),
          feedback: z.string().describe("回饋"),
          afterThoughtQuestions: z.string().describe("課後思考的問題"),
          createdAt: z.string().describe("時間"),
        })
      )
      .describe("學習記錄的陣列格式，如果沒有學習記錄，則回傳空陣列"),
  })
  .describe("學習記錄的陣列格式");

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
      model: "openai:gpt-5",
      tools: [getLearningRecords],
      checkpointer: this.checkpointSaver,
      // ref: https://blog.langchain.com/agent-middleware/
      middleware: [cleanMessageMiddleware],
      responseFormat: ResponseFormatSchema,
    });
  }

  async callLLM(
    message: string
  ): Promise<z.infer<typeof ResponseFormatSchema>> {
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
    console.log("response", response);

    return response.structuredResponse;
  }
}
