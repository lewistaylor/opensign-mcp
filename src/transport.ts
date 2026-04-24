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

/**
 * JSON-RPC error code for "Session terminated" per the MCP streamable
 * HTTP transport convention. Returned when the client presents an
 * `Mcp-Session-Id` the server no longer holds — typically after an
 * upstream restart or session reap. Clients key off this code to
 * drive an automatic reinitialize + retry rather than surfacing a
 * generic "bad request" to the user.
 */
export const JSONRPC_SESSION_TERMINATED = -32002;

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

/**
 * Returns true if the given JSON-RPC request body represents an
 * `initialize` call. Accepts both single-message and batch shapes.
 */
export function isInitializeRequest(body: unknown): boolean {
  if (body == null) return false;
  if (Array.isArray(body)) return body.some(isInitializeRequest);
  if (typeof body !== "object") return false;
  return (body as { method?: unknown }).method === "initialize";
}

/**
 * Extracts the JSON-RPC `id` from a request body so error responses
 * can echo it back. Returns null for notifications, malformed
 * payloads, or batches that lack any id.
 */
export function extractJsonRpcId(body: unknown): string | number | null {
  if (body == null) return null;
  if (Array.isArray(body)) {
    const first = body.find(
      (m) => m != null && typeof m === "object" && "id" in m,
    );
    return first ? extractJsonRpcId(first) : null;
  }
  if (typeof body !== "object") return null;
  const id = (body as { id?: unknown }).id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

/**
 * Builds the JSON-RPC body returned to a client presenting an unknown
 * `Mcp-Session-Id`. Clients key off `error.code === -32002` to drive
 * an automatic reinitialize.
 */
export function buildSessionTerminatedBody(
  id: string | number | null,
): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: JSONRPC_SESSION_TERMINATED,
      message: "Session terminated",
    },
  };
}

/**
 * Structured log line emitted whenever an unknown session id is seen.
 * Session ids are opaque UUIDs, not credentials, so logging them is
 * safe; the active-session list stays small because of the reaper.
 *
 * Uses console.warn with a JSON payload so Railway's log aggregator
 * picks up the structured fields — opensign-mcp has no dedicated
 * logger module.
 */
function logUnknownSession(
  method: string,
  req: Request,
  sessionId: string | undefined,
  outcome: "rejected" | "resumed-as-new",
) {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "warn",
      msg: "unknown session id",
      method,
      path: req.path,
      receivedSessionId: sessionId ?? null,
      activeSessionCount: sessions.size,
      activeSessionIds: [...sessions.keys()],
      userAgent: req.headers["user-agent"] ?? null,
      outcome,
    }),
  );
}

/**
 * Creates and configures the Express app with MCP Streamable HTTP
 * transport and session management.
 *
 * Routing behaviour:
 *   - POST /mcp with a known session id → reuse the transport.
 *   - POST /mcp with no id OR with initialize (even w/ stale id)
 *     → spawn a fresh transport (stale header is stripped).
 *   - POST /mcp with an unknown id on a non-initialize call
 *     → 404 + JSON-RPC `-32002 "Session terminated"`.
 *   - GET / DELETE /mcp with an unknown id → same 404 + -32002 shape.
 */
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

      const initializing = isInitializeRequest(req.body);

      if (sessionId && !initializing) {
        logUnknownSession("POST", req, sessionId, "rejected");
        res.status(404).json(
          buildSessionTerminatedBody(extractJsonRpcId(req.body)),
        );
        return;
      }

      if (sessionId && initializing) {
        logUnknownSession("POST", req, sessionId, "resumed-as-new");
        delete req.headers["mcp-session-id"];
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
        logUnknownSession("GET", req, sessionId, "rejected");
        res.status(404).json(buildSessionTerminatedBody(null));
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
      res.status(200).end();
      return;
    }
    logUnknownSession("DELETE", req, sessionId, "rejected");
    res.status(404).json(buildSessionTerminatedBody(null));
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  startReaper();

  return app;
}
