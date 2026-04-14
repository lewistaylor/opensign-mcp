import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { opensignRequest, safeHandler, jsonContent } from "../opensign.js";

export function register(server: McpServer) {
  server.tool(
    "get_current_user",
    "Get the authenticated OpenSign user's account details including name, email, and plan information.",
    {},
    safeHandler(async () => {
      const user = await opensignRequest("/getuser");
      return jsonContent(user);
    }),
  );
}
