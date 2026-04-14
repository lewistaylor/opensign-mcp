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
    "get_contact",
    "Get details of a specific contact by ID. Contacts are people who can act as document signers.",
    { contact_id: z.string().describe("The contact's unique ID") },
    safeHandler(async ({ contact_id }) => {
      assertId(contact_id, "contact_id");
      const contact = await opensignRequest(`/contact/${contact_id}`);
      return jsonContent(contact);
    }),
  );

  server.tool(
    "create_contact",
    "Create a new contact who can be used as a signer on documents. Provide at least a name and email.",
    {
      name: z.string().describe("Full name of the contact"),
      email: z.string().email().describe("Email address of the contact"),
      phone: z
        .string()
        .optional()
        .describe("Phone number of the contact (optional)"),
    },
    safeHandler(async ({ name, email, phone }) => {
      const body: Record<string, string> = { name, email };
      if (phone) body.phone = phone;
      const result = await opensignRequest("/createcontact", {
        method: "POST",
        body,
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "update_contact",
    "Update an existing contact's details (name, email, or phone).",
    {
      contact_id: z.string().describe("The contact's unique ID"),
      name: z.string().optional().describe("Updated name"),
      email: z.string().email().optional().describe("Updated email"),
      phone: z.string().optional().describe("Updated phone number"),
    },
    safeHandler(async ({ contact_id, name, email, phone }) => {
      assertId(contact_id, "contact_id");
      const body: Record<string, string> = {};
      if (name) body.name = name;
      if (email) body.email = email;
      if (phone) body.phone = phone;
      const result = await opensignRequest(`/contact/${contact_id}`, {
        method: "PUT",
        body,
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "delete_contact",
    "Delete a contact by ID. This cannot be undone.",
    { contact_id: z.string().describe("The contact's unique ID") },
    safeHandler(async ({ contact_id }) => {
      assertId(contact_id, "contact_id");
      const result = await opensignRequest(`/contact/${contact_id}`, {
        method: "DELETE",
      });
      return jsonContent(result);
    }),
  );
}
