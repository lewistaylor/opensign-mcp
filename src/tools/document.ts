import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  opensignRequest,
  safeHandler,
  jsonContent,
  assertId,
  DOC_TYPES,
} from "../opensign.js";

export function register(server: McpServer) {
  server.tool(
    "list_documents",
    "List documents filtered by status. Valid statuses: Draft, In-Progress, Completed, Expired, Declined.",
    {
      status: z
        .enum(DOC_TYPES)
        .describe("Document status to filter by"),
    },
    safeHandler(async ({ status }) => {
      const docs = await opensignRequest(`/documentlist/${status}`);
      return jsonContent(docs);
    }),
  );

  server.tool(
    "self_sign",
    "Create a self-sign document from a base64-encoded PDF. Returns a URL where you can sign the document yourself. Optionally include widget definitions for signature fields, text boxes, etc.",
    {
      file: z
        .string()
        .describe("Base64-encoded PDF file content"),
      name: z.string().describe("Document name/title"),
      note: z
        .string()
        .optional()
        .describe("Note or message for the signer"),
      signers: z
        .array(
          z.object({
            name: z.string(),
            email: z.string(),
            phone: z.string().optional(),
            widgets: z.array(z.record(z.unknown())).optional(),
          }),
        )
        .optional()
        .describe("Array of signers with optional widget definitions"),
      folderId: z
        .string()
        .optional()
        .describe("Folder ID to store the document in"),
    },
    safeHandler(async ({ file, name, note, signers, folderId }) => {
      const body: Record<string, unknown> = { file, name };
      if (note) body.note = note;
      if (signers) body.signers = signers;
      if (folderId) {
        assertId(folderId, "folderId");
        body.folderId = folderId;
      }
      const result = await opensignRequest("/selfsign", {
        method: "POST",
        body,
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "create_document",
    "Create a new document for signing from a base64-encoded PDF. Include signer details and optional widget definitions (signature fields, text boxes, checkboxes, etc.).",
    {
      file: z.string().describe("Base64-encoded PDF file content"),
      name: z.string().describe("Document name/title"),
      note: z.string().optional().describe("Note or message for signers"),
      description: z.string().optional().describe("Document description"),
      signers: z
        .array(
          z.object({
            name: z.string(),
            email: z.string(),
            phone: z.string().optional(),
            widgets: z.array(z.record(z.unknown())).optional(),
          }),
        )
        .describe("Array of signers with optional widget definitions"),
      folderId: z.string().optional().describe("Folder ID to store the document in"),
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
      const result = await opensignRequest("/createdocument", {
        method: "POST",
        body,
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "create_document_from_template",
    "Create a new document from an existing template. Provide the template ID and signer details. Optionally set default widget values.",
    {
      template_id: z.string().describe("Template ID to create the document from"),
      signers: z
        .array(
          z.object({
            name: z.string(),
            email: z.string(),
            phone: z.string().optional(),
            widgets: z.array(z.record(z.unknown())).optional(),
          }),
        )
        .describe("Array of signers with optional widget value overrides"),
      note: z.string().optional().describe("Note or message for signers"),
      folderId: z.string().optional().describe("Folder ID to store the document in"),
      sendInOrder: z.boolean().optional().describe("Send to signers sequentially"),
    },
    safeHandler(async ({ template_id, signers, note, folderId, sendInOrder }) => {
      assertId(template_id, "template_id");
      const body: Record<string, unknown> = { signers };
      if (note) body.note = note;
      if (sendInOrder !== undefined) body.sendInOrder = sendInOrder;
      if (folderId) {
        assertId(folderId, "folderId");
        body.folderId = folderId;
      }
      const result = await opensignRequest(
        `/createdocument/${template_id}`,
        { method: "POST", body },
      );
      return jsonContent(result);
    }),
  );

  server.tool(
    "resend_signing_request",
    "Resend a signing request email to a specific signer for a document.",
    {
      document_id: z.string().describe("The document's unique ID"),
      email: z.string().email().describe("Email of the signer to resend to"),
    },
    safeHandler(async ({ document_id, email }) => {
      assertId(document_id, "document_id");
      const result = await opensignRequest("/resendmail", {
        method: "POST",
        body: { document_id, email },
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "revoke_document",
    "Revoke a document, preventing any further signing. This cannot be undone.",
    {
      document_id: z.string().describe("The document's unique ID"),
    },
    safeHandler(async ({ document_id }) => {
      assertId(document_id, "document_id");
      const result = await opensignRequest(`/document/${document_id}`, {
        method: "POST",
      });
      return jsonContent(result);
    }),
  );
}
