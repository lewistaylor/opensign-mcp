import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { registerTools } from "./tools/index.js";

const SERVER_INFO = {
  name: "opensign",
  version: "1.0.0",
};

export const SESSION_TTL_MS = 30 * 60 * 1000;
export const REAP_INTERVAL_MS = 60 * 1000;

export interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  lastAccess: number;
}

export const sessions = new Map<string, SessionEntry>();

function touchSession(sessionId: string) {
  const entry = sessions.get(sessionId);
  if (entry) entry.lastAccess = Date.now();
}

export function reapStaleSessions() {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.lastAccess > SESSION_TTL_MS) {
      entry.transport.close().catch(() => {});
      sessions.delete(id);
    }
  }
}

let reapTimer: ReturnType<typeof setInterval> | undefined;

export function startReaper() {
  if (!reapTimer) {
    reapTimer = setInterval(reapStaleSessions, REAP_INTERVAL_MS);
    reapTimer.unref();
  }
}

export function stopReaper() {
  if (reapTimer) {
    clearInterval(reapTimer);
    reapTimer = undefined;
  }
}

export function createApp() {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        touchSession(sessionId);
        const { transport } = sessions.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, lastAccess: Date.now() });
        },
      });

      transport.onclose = () => {
        const id = [...sessions.entries()].find(
          ([, e]) => e.transport === transport,
        )?.[0];
        if (id) sessions.delete(id);
      };

      const sessionServer = new McpServer(SERVER_INFO);
      registerTools(sessionServer);
      await sessionServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !sessions.has(sessionId)) {
        res.status(400).json({ error: "Invalid or missing session ID" });
        return;
      }
      touchSession(sessionId);
      await sessions.get(sessionId)!.transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      await transport.close();
      sessions.delete(sessionId);
    }
    res.status(200).end();
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  startReaper();

  return app;
}
