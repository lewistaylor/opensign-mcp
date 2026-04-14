# OpenSign MCP Server

An MCP (Model Context Protocol) server that exposes the
[OpenSign](https://www.opensignlabs.com/) digital signing API as tools for
LLMs. Deploy it as a remote HTTP endpoint and connect from Claude, Cursor,
or any MCP client.

## Tools

### User

| Tool | Description |
|---|---|
| `get_current_user` | Get the authenticated user's account details |

### Contacts

| Tool | Description |
|---|---|
| `get_contact` | Get a contact by ID |
| `create_contact` | Create a new contact (name, email, phone) |
| `update_contact` | Update an existing contact's details |
| `delete_contact` | Delete a contact |

### Documents

| Tool | Description |
|---|---|
| `list_documents` | List documents by status (Draft, In-Progress, Completed, Expired, Declined) |
| `self_sign` | Create a self-sign document from a base64 PDF |
| `create_document` | Create a document for signing with signer details and widget definitions |
| `create_document_from_template` | Create a document from an existing template |
| `resend_signing_request` | Resend a signing request email to a signer |
| `revoke_document` | Revoke a document (prevents further signing) |

### Templates

| Tool | Description |
|---|---|
| `list_templates` | List all available templates |
| `draft_template` | Create a draft template from a base64 PDF |
| `create_template` | Create and publish a template |
| `get_template` | Get template details by ID |
| `delete_template` | Delete a template |

### Folders

| Tool | Description |
|---|---|
| `list_folders` | List folders (optionally filtered by parent folder) |
| `create_folder` | Create a new folder |
| `rename_folder` | Rename a folder |
| `delete_folder` | Delete an empty folder |
| `move_document_to_folder` | Move a document into a folder |

### Webhooks

| Tool | Description |
|---|---|
| `get_webhook` | Get the current webhook URL |
| `save_webhook` | Save or update the webhook URL |
| `delete_webhook` | Delete the webhook URL |

## Setup

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENSIGN_API_TOKEN` | Yes | Your OpenSign API token ([generate one here](https://docs.opensignlabs.com/docs/help/Settings/APIToken)) |
| `PORT` | No | Server port (default: `3000`) |

### Run locally

```bash
npm install
OPENSIGN_API_TOKEN=your-token npm run build && npm start
```

The server listens on `http://localhost:3000/mcp` (Streamable HTTP transport).

### Deploy with Docker

```bash
docker build -t opensign-mcp .
docker run -p 3000:3000 -e OPENSIGN_API_TOKEN=your-token opensign-mcp
```

### Deploy to Railway

1. Create a new project on [Railway](https://railway.app) and connect this repo.
2. Set `OPENSIGN_API_TOKEN` in the service's environment variables.
3. Deploy. The included `Dockerfile` handles the build.

## Connect a client

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "opensign": {
      "url": "https://your-deployment.up.railway.app/mcp"
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "opensign": {
      "command": "npx",
      "args": [
        "-y", "supergateway",
        "--streamableHttp", "https://your-deployment.up.railway.app/mcp"
      ]
    }
  }
}
```

## Development

```bash
npm install
npm run build
npm test
```

### Project structure

```
src/
├── index.ts          # Entrypoint — validates API token, starts Express
├── opensign.ts       # OpenSign API client, helpers, error handling
├── transport.ts      # Express app, Streamable HTTP transport, sessions
└── tools/
    ├── index.ts      # Registers all tool groups
    ├── user.ts       # get_current_user
    ├── contact.ts    # CRUD for contacts
    ├── document.ts   # Create, list, sign, revoke documents
    ├── template.ts   # CRUD for templates
    ├── folder.ts     # CRUD for folders, move documents
    └── webhook.ts    # Get, save, delete webhook URL
```
