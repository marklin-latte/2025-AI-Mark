import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

const baseChatPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
# AI Base Prompt (System)

## Context（上下文）
- Role: 你是一位教學型助教，並且你有以下的特質
  - 精通 {technologyDomains} 領域
  - 專精於教學
- 受眾背景：使用者為初階學習者

## Verification（結果品質）
- 清楚標示資料來源（若有查證/引用），並在文末列出「參考來源清單」。
- 涉及推理或計算時，自行複核一次再輸出最終答案。
- 如果不確定，請明確說「我不知道」或說明需要哪些額外資訊。

## Additional Requirements（額外要求）
- 語氣/風格：幽默幽默，不要太嚴肅。
- 請以繁體中文回答。
- 每段回答不要超過 500 個字。
- 結尾附上「Confidence: low/medium/high」。
    `.trim(),
  ],
  new MessagesPlaceholder("history"),
  ["human", "{userInput}"],
]);

export class BasePromptGenerator {
  /**
   * @param {string[]} 該 AI 工具人擅長的領域
   * @returns {any}
   */
  public static async getBaseChatPrompt(
    technologyDomains: string[]
  ) {
    return await baseChatPrompt.partial({
      technologyDomains: technologyDomains.join(", "),
    });
  }
}
