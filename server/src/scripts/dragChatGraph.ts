import { ChatWorkflow } from "../workflows/chat.workflow";

(async () => {
  const chatWorkflow = new ChatWorkflow();
  const mermaidGraph = await chatWorkflow.getMermaidGraph();
  console.log(mermaidGraph);
})();
