#!/usr/bin/env node
// https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#streamable-http

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import { z } from "zod";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";

import { CreatePageTool } from "./tools/createPage";

dotenv.config();

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export type LearningRecord = {
  _id: string;
  youLearned: string;
  yourOutput: string;
  feedback: string;
  afterThoughtQuestions: string;
  createdAt: string;
};

class NotionMCPServer {
  private server: McpServer;
  private notion: Client;

  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_TOKEN,
      notionVersion: "2022-06-28",
    });
  }

  private setupTools(): void {
    const pageId = "fac17442ffa94d899332a60f725fb74d";
    const createPageTool = new CreatePageTool(this.notion, pageId);
    this.server.registerTool(
      createPageTool.name,
      createPageTool.initialize(),
      createPageTool.handle
    );
  }

  /**
   * Log errors to stderr
   */
  private logError(message: string): void {
    console.error(`[Notion MCP Server] Error: ${message}`);
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const app = express();
    app.use(express.json());
    app.use(
      cors({
        origin: "*",
        exposedHeaders: ["Mcp-Session-Id"],
        allowedHeaders: ["Content-Type", "mcp-session-id"],
        methods: ["GET", "POST", "OPTIONS"],
      })
    );
    app.post("/notion/mcp", async (req, res) => {
      console.log(
        "MCP POST request received:",
        req.body?.method || "unknown method"
      );

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        console.log("Reusing existing transport for session:", sessionId);
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        console.log("Creating new transport");
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (sessionId) => {
            console.log("Session initialized:", sessionId);
            transports[sessionId] = transport;
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };

        this.server = new McpServer(
          {
            name: "notion-mcp-server",
            version: "1.0.0",
          },
          {
            capabilities: {
              tools: {
                listChanged: true,
              },
            },
          }
        );
        this.setupTools();
        await this.server.connect(transport);
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      try {
        console.log("transport handleRequest init");
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("Error handling request:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });

    app.listen(3002, () => {
      console.log(
        "Notion MCP Server started on http://localhost:3002/notion/mcp"
      );
    });
  }
}

(async () => {
  const notionMCPServer = new NotionMCPServer();
  await notionMCPServer.start();
})();
