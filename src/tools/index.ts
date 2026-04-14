import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register as registerUserTools } from "./user.js";
import { register as registerContactTools } from "./contact.js";
import { register as registerDocumentTools } from "./document.js";
import { register as registerTemplateTools } from "./template.js";
import { register as registerFolderTools } from "./folder.js";
import { register as registerWebhookTools } from "./webhook.js";

export function registerTools(server: McpServer) {
  registerUserTools(server);
  registerContactTools(server);
  registerDocumentTools(server);
  registerTemplateTools(server);
  registerFolderTools(server);
  registerWebhookTools(server);
}
