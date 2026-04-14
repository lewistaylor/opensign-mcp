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
    "list_folders",
    "List folders. Optionally filter by parent folder ID to see sub-folders.",
    {
      parent_folder_id: z
        .string()
        .optional()
        .describe("Parent folder ID to list sub-folders of (omit for root folders)"),
    },
    safeHandler(async ({ parent_folder_id }) => {
      const params: Record<string, string> = {};
      if (parent_folder_id) {
        assertId(parent_folder_id, "parent_folder_id");
        params.parentFolderId = parent_folder_id;
      }
      const folders = await opensignRequest("/folderlist", { params });
      return jsonContent(folders);
    }),
  );

  server.tool(
    "create_folder",
    "Create a new folder to organise documents and templates.",
    {
      name: z.string().describe("Folder name"),
      parent_folder_id: z
        .string()
        .optional()
        .describe("Parent folder ID (omit for root-level folder)"),
    },
    safeHandler(async ({ name, parent_folder_id }) => {
      const body: Record<string, string> = { name };
      if (parent_folder_id) {
        assertId(parent_folder_id, "parent_folder_id");
        body.parentFolderId = parent_folder_id;
      }
      const result = await opensignRequest("/createfolder", {
        method: "POST",
        body,
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "rename_folder",
    "Rename an existing folder.",
    {
      folder_id: z.string().describe("The folder's unique ID"),
      name: z.string().describe("New folder name"),
    },
    safeHandler(async ({ folder_id, name }) => {
      assertId(folder_id, "folder_id");
      const result = await opensignRequest(`/folder/${folder_id}`, {
        method: "PUT",
        body: { name },
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "delete_folder",
    "Delete a folder by ID. The folder must be empty.",
    {
      folder_id: z.string().describe("The folder's unique ID"),
    },
    safeHandler(async ({ folder_id }) => {
      assertId(folder_id, "folder_id");
      const result = await opensignRequest(`/folder/${folder_id}`, {
        method: "DELETE",
      });
      return jsonContent(result);
    }),
  );

  server.tool(
    "move_document_to_folder",
    "Move a document into a different folder.",
    {
      document_id: z.string().describe("The document's unique ID"),
      folder_id: z.string().describe("Target folder ID"),
    },
    safeHandler(async ({ document_id, folder_id }) => {
      assertId(document_id, "document_id");
      assertId(folder_id, "folder_id");
      const result = await opensignRequest("/movedocument", {
        method: "POST",
        body: { documentId: document_id, folderId: folder_id },
      });
      return jsonContent(result);
    }),
  );
}
