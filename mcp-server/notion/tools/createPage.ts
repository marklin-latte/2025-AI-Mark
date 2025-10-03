import { Client } from "@notionhq/client";
import { z } from "zod";
import moment from "moment";

import { LearningRecord } from "../index";
import BaseTool from "../../interface/baseTool";

export class CreatePageTool implements BaseTool {
  private notion: Client;
  private pageId: string;
  public name = "create_page";

  constructor(notion: Client, pageId: string) {
    this.notion = notion;
    this.pageId = pageId;
  }

  public initialize() {
    return {
      description: `
        ## 使用時機 (Use it when): 
          1.當學生想將學習記錄存入 Notion 時使用 (Use it when the student wants to save the learning record to Notion)

        ## tool call 的結束條件
          當成功建立學習筆記時，回傳 true，就結束這個工具的呼叫，並且回傳建立的學習筆記的連結的訊息
        `,
      inputSchema: {
        learningRecords: z
          .array(
            z.object({
              youLearned: z.string().describe("學生學習的內容"),
              yourOutput: z
                .string()
                .describe("學生對學習的回應與產出的教材內容"),
              feedback: z.string().describe("你對學習的回饋"),
              afterThoughtQuestions: z
                .string()
                .describe("學習後的課程思考的問題"),
              createdAt: z.string().describe("學生學習的時間"),
            })
          )
          .describe("學習記錄的陣列"),
      },
    };
  }

  public handle = async (input: { learningRecords: LearningRecord[] }) => {
    let index = 1;
    const promises = input.learningRecords.map(async (learningRecord) => {
      const pageData: any = {
        properties: {
          title: {
            title: [
              {
                text: {
                  content: `${moment(learningRecord.createdAt).format(
                    "YYYY-MM-DD"
                  )}-學習記錄-${index}`,
                },
              },
            ],
          },
        },
        parent: { page_id: this.pageId },
        children: this.convertToNotionBlocks(learningRecord),
      };

      index++;
      return this.notion.pages.create(pageData);
    });

    const result: any = await Promise.all(promises);
    console.log(
      "result",
      `你的 Notion 筆記已經建立成功，請至以下連結查看: 
        ${result.map((item) => item.url).join("\n")}`
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            url: result[0].url,
          }),
        }
      ],
    }
  };

  // notion 的 block 結構參考
  // page: https://developers.notion.com/docs/working-with-page-content
  // block: https://developers.notion.com/reference/block
  private convertToNotionBlocks(learningRecord: LearningRecord): any[] {
    const blocks: any[] = [];

    blocks.push(this.createHeadingBlock("heading_2", "你學習的內容"));
    blocks.push(this.createParagraphBlock(learningRecord.youLearned));
    blocks.push(this.createHeadingBlock("heading_2", "你的產出"));
    blocks.push(this.createParagraphBlock(learningRecord.yourOutput));
    blocks.push(this.createHeadingBlock("heading_2", "回饋"));
    blocks.push(this.createParagraphBlock(learningRecord.feedback));
    blocks.push(this.createHeadingBlock("heading_2", "課後思考的問題"));
    blocks.push(
      this.createParagraphBlock(learningRecord.afterThoughtQuestions)
    );
    blocks.push(this.createHeadingBlock("heading_3", "時間"));
    blocks.push(
      this.createParagraphBlock(
        moment(learningRecord.createdAt).format("YYYY-MM-DD HH:mm:ss")
      )
    );

    return blocks;
  }

  private createHeadingBlock(
    type: "heading_1" | "heading_2" | "heading_3",
    content: string
  ): object {
    return {
      type,
      [type]: {
        rich_text: [
          {
            type: "text",
            text: { content },
          },
        ],
      },
    };
  }

  private createParagraphBlock(content: string): object {
    return {
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content },
          },
        ],
      },
    };
  }
}
