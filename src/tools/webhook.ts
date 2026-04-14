import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { opensignRequest, safeHandler, jsonContent } from "../opensign.js";

export function register(server: McpServer) {
  server.tool(
    "get_webhook",
    "Get the currently configured webhook URL. Webhooks trigger on document events: viewed, created, signed, completed, declined.",
    {},
    safeHandler(async () => {
      const webhook = await opensignRequest("/webhook");
      return jsonContent(webhook);
    }),
  );

  server.tool(
    "save_webhook",
    "Save or update the webhook URL. Events (viewed, created, signed, completed, declined) will be POSTed to this URL.",
    {
      url: z.string().url().describe("The webhook endpoint URL to receive events"),
    },
    safeHandler(async ({ url }) => {
      const result = await opensignRequest("/webhook", {
        method: "POST",
        body: { url },
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "delete_webhook",
    "Delete the currently configured webhook URL.",
    {},
    safeHandler(async () => {
      const result = await opensignRequest("/webhook", {
        method: "DELETE",
      });
      return jsonContent(result);
    }),
  );
}
