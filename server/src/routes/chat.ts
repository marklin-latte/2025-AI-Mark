import express from "express";
import { ChatWorkflow } from "../workflows/chat.workflow";
import { randomUUID } from "node:crypto";

const router = express.Router();

// GET route for EventSource connections
router.get("/chat", async (req, res) => {
  const { message } = req.query;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Message is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

  const threadId = randomUUID();
  const chatWorkflow = new ChatWorkflow();
  await chatWorkflow.initialize(threadId);

  try {
    for await (const chunk of chatWorkflow.processMessage(message)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");

    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Internal server error" })}\n\n`
    );
    res.end();
  }
});

router.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const threadId = randomUUID();
  const chatWorkflow = new ChatWorkflow();
  await chatWorkflow.initialize(threadId);

  try {
    for await (const chunk of chatWorkflow.processMessage(message)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");

    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Internal server error" })}\n\n`
    );
    res.end();
  }
});

export default router;
