import { ChatWorkflow } from "../workflows/chat.workflow";

(async () => {
  const chatWorkflow = new ChatWorkflow();
  await chatWorkflow.initialize('test');
  const mermaidGraph = await chatWorkflow.getMermaidGraph();
  console.log(mermaidGraph);
})();
