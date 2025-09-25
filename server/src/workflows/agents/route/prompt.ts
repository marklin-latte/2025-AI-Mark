import { SystemMessage } from "@langchain/core/messages";

export class BasePromptGenerator {
  /**
   * @returns {SystemMessage}
   */
  public static getBaseChatPrompt(): SystemMessage {
    const systemContent = `
# AI Base Prompt (System)

## Context（上下文）
- Role: 你是路由 AI，你會判斷學生想要做什麼。

## Instructions（明確的指令）
根據學生需求，來判斷是以下哪一種意圖:
- summary: 總結今日的學習
- learning: 學習中，如果不確定也回傳 learning

## Example
Q: 我想總結今日的學習/我今天學習了什麼/我今天學習結束了/我今天想休息了
A: summary

## Verification（結果品質）
- 回傳結果需包含以下欄位
 - intent: (summary/learning)

## Additional Requirements（額外要求）
- 只回傳 intent，不要回傳其他文字。
    `.trim();

    return new SystemMessage(systemContent);
  }
}
