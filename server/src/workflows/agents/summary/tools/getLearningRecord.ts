import { tool } from "langchain";
import { z } from "zod";
import moment from "moment";

import { LearningRecord } from "../../../../infrastructure/mongodb/models/learningRecord";

export const getLearningRecords = tool(
  async (params: { startDate?: string; endDate?: string }) => {
    try {
      let query = {};
      if (params.startDate && params.endDate) {
        query = {
          createdAt: {
            $gte: moment(params.startDate).startOf("day").toDate(),
            $lte: moment(params.endDate).endOf("day").toDate(),
          },
        };
      }
      console.log("query", query);

      const records = await LearningRecord.find(query).exec();
      if (records.length === 0) {
        return "沒有找到學習記錄";
      }

      return {
        isSuccess: true,
        data: records,
      };
    } catch (error) {
      console.error("Error fetching learning records:", error);
      return {
        isSuccess: false,
        data: error.message,
      };
    }
  },
  {
    name: "getLearningRecords",
    description: `取得/拿取/查詢學習記錄/取得昨天學習的結果/取得某一天學習的結果
    ## 使用時機 (Use it when): 
     - 1.當用戶有查詢/取得/拿取學習記錄的意圖時使用 ( Use it when the user shows an intention to query/get/take a learning record. )

    ## tool call 的結束條件
     - 當成功取得學習記錄時，回傳學習記錄物件，就結束這個工具的呼叫
    
    ## 不可使用此工具的時機
     - 當用戶沒有查詢/取得/拿取學習記錄的意圖時，不可使用此工具
     - notion 相關的意圖時，不可使用此工具
    `,
    schema: z.object({
      startDate: z
        .string()
        .optional()
        .describe("要取得哪些日期區間的學習記錄，格式為 ISO 格式"),
      endDate: z
        .string()
        .optional()
        .describe("要取得哪些日期區間的學習記錄，格式為 ISO 格式"),
    }),
  }
);
