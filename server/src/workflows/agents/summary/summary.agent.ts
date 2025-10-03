import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware, toolStrategy } from "langchain";
import { Configurable } from "../interfaces/configurable";
import { BaseCheckpointSaver } from "@langchain/langgraph";
import { z } from "zod";

import { BasePromptGenerator } from "./prompt";
import { getLearningRecords } from "./tools/getLearningRecord";
import { DynamicStructuredTool } from "@langchain/core/tools";
export enum TaskEnum {
  SUMMARY = "summary",
  GET_LEARNING_RECORDS = "get-learning-records",
  CREATE_NOTION_PAGE = "create-notion-page",
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

const SummaryResponseSchema = z
  .object({
    task: z.literal(TaskEnum.SUMMARY).describe("只要回傳 summary"),
    response: z.object({
      youLearned: z.string().describe("你今天學了什麼（總結版）"),
      yourOutput: z.string().describe("你今天的產出"),
      feedback: z.string().describe("自我回饋"),
      afterThoughtQuestions: z.string().describe("課後思考"),
      createdAt: z.string().describe("這份總結生成時間（ISO）"),
    }),
  })
  .describe("當沒有用工具時，只進行總結時，回傳這個格式");

const GetLearningRecordsResponseSchema = z
  .object({
    task: z.literal(TaskEnum.GET_LEARNING_RECORDS).describe("只要回傳 get-learning-records"),
    response: z.object({
      youLearned: z.string().describe("學了什麼（總結版）"),
      yourOutput: z.string().describe("產出"),
      feedback: z.string().describe("自我回饋"),
      afterThoughtQuestions: z.string().describe("課後思考"),
      createdAt: z.string().describe("這份總結生成時間（ISO）"),
    }),
  })
  .describe(
    "有用到 getLearningRecords 工具時，回傳這個格式"
  );

const CreateNotionPageResponseSchema = z
  .object({
    task: z.literal(TaskEnum.CREATE_NOTION_PAGE).describe("只要回傳 create-notion-page"),
    response: z.object({
      success: z.boolean().describe("是否成功建立 Notion 筆記"),
      url: z.string().describe("只要回傳 tool call 回傳的 url"),
    }),
  })
  .describe(
    "有用到 createNotionPage MCP 工具時，回傳這個格式"
  );

/**
 * 總結 AI 服務，他可以總結今日的學習
 */
export class SummaryAgent {
  private checkpointSaver: BaseCheckpointSaver;
  private configurable: Configurable;
  private agent: any;

  constructor(
    checkpointSaver: BaseCheckpointSaver,
    configurable: Configurable,
    notionMcpTools: DynamicStructuredTool[]
  ) {
    this.checkpointSaver = checkpointSaver;
    this.configurable = configurable;
    this.agent = createAgent({
      model: "openai:gpt-5-mini",
      tools: [getLearningRecords, ...notionMcpTools],
      checkpointer: this.checkpointSaver,
      // ref: https://blog.langchain.com/agent-middleware/
      middleware: [cleanMessageMiddleware],
      responseFormat: toolStrategy([
        SummaryResponseSchema,
        GetLearningRecordsResponseSchema,
        CreateNotionPageResponseSchema,
      ]),
    });
  }

  async callLLM(
    message: string
  ): Promise<
    z.infer<
      | typeof SummaryResponseSchema
      | typeof GetLearningRecordsResponseSchema
      | typeof CreateNotionPageResponseSchema
    >
  > {
    const systemMessage = BasePromptGenerator.getBaseChatPrompt();
    const humanMessage = new HumanMessage(message);

    const response = await this.agent.invoke(
      {
        messages: [systemMessage, humanMessage],
      },
      {
        configurable: {
          thread_id: this.configurable.threadId,
          maxIterations: 3,
        },
      }
    );
    console.log("response", response);

    return response.structuredResponse;
  }
}
