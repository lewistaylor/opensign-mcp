import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  opensignRequest,
  safeHandler,
  jsonContent,
  assertId,
} from "../opensign.js";

export function register(server: McpServer) {
  server.tool(
    "list_templates",
    "List all available document templates. Templates are reusable blueprints for creating documents.",
    {},
    safeHandler(async () => {
      const templates = await opensignRequest("/templatelist");
      return jsonContent(templates);
    }),
  );

  server.tool(
    "draft_template",
    "Create a new document template from a base64-encoded PDF. Templates can include signer roles and widget definitions. Returns a template_id and a URL for editing the template in the browser.",
    {
      file: z.string().describe("Base64-encoded PDF file content"),
      name: z.string().describe("Template name/title"),
      note: z.string().optional().describe("Default note for signers"),
      description: z.string().optional().describe("Template description"),
      signers: z
        .array(
          z.object({
            name: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            widgets: z.array(z.record(z.unknown())).optional(),
          }),
        )
        .optional()
        .describe("Signer roles with optional widget definitions"),
      folderId: z.string().optional().describe("Folder ID to store the template in"),
      sendInOrder: z.boolean().optional().describe("Send to signers sequentially when documents are created"),
    },
    safeHandler(async ({ file, name, note, description, signers, folderId, sendInOrder }) => {
      const body: Record<string, unknown> = { file, name };
      if (note) body.note = note;
      if (description) body.description = description;
      if (signers) body.signers = signers;
      if (sendInOrder !== undefined) body.sendInOrder = sendInOrder;
      if (folderId) {
        assertId(folderId, "folderId");
        body.folderId = folderId;
      }
      const result = await opensignRequest("/drafttemplate", {
        method: "POST",
        body,
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "create_template",
    "Create and publish a template from a base64-encoded PDF with fully defined signer roles and widgets.",
    {
      file: z.string().describe("Base64-encoded PDF file content"),
      name: z.string().describe("Template name/title"),
      note: z.string().optional().describe("Default note for signers"),
      description: z.string().optional().describe("Template description"),
      signers: z
        .array(
          z.object({
            name: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            widgets: z.array(z.record(z.unknown())).optional(),
          }),
        )
        .describe("Signer roles with widget definitions"),
      folderId: z.string().optional().describe("Folder ID"),
      sendInOrder: z.boolean().optional().describe("Send to signers sequentially"),
    },
    safeHandler(async ({ file, name, note, description, signers, folderId, sendInOrder }) => {
      const body: Record<string, unknown> = { file, name, signers };
      if (note) body.note = note;
      if (description) body.description = description;
      if (sendInOrder !== undefined) body.sendInOrder = sendInOrder;
      if (folderId) {
        assertId(folderId, "folderId");
        body.folderId = folderId;
      }
      const result = await opensignRequest("/createtemplate", {
        method: "POST",
        body,
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "get_template",
    "Get details of a specific template by ID.",
    { template_id: z.string().describe("The template's unique ID") },
    safeHandler(async ({ template_id }) => {
      assertId(template_id, "template_id");
      const template = await opensignRequest(`/template/${template_id}`);
      return jsonContent(template);
    }),
  );

  server.tool(
    "delete_template",
    "Delete a template by ID. This cannot be undone.",
    { template_id: z.string().describe("The template's unique ID") },
    safeHandler(async ({ template_id }) => {
      assertId(template_id, "template_id");
      const result = await opensignRequest(`/template/${template_id}`, {
        method: "DELETE",
      });
      return jsonContent(result);
    }),
  );
}
