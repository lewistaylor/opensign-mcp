# OpenSign MCP Server

An MCP server that exposes the [OpenSign](https://www.opensignlabs.com/)
digital signing API as tools for LLMs. Deploy it as a remote HTTP endpoint and
connect from Claude, Cursor, or any MCP client.

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

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENSIGN_API_TOKEN` | Yes | — | Your OpenSign API token ([generate one here](https://docs.opensignlabs.com/docs/help/Settings/APIToken)) |
| `PORT` | No | `8000` | Server port |

### Run locally

```bash
cp .env.example .env
# Fill in OPENSIGN_API_TOKEN

npm install
npm run build
npm start
```

The server listens on `http://localhost:8000/mcp` (Streamable HTTP transport)
with a health check at `/health`.

### Deploy with Docker

```bash
docker build -t opensign-mcp .
docker run -p 8000:8000 -e OPENSIGN_API_TOKEN=your-token opensign-mcp
```

### Deploy to Railway (behind auth gateway)

1. In your Railway project, add a new service and connect this repo.
2. Name it **`opensign-mcp`** (the auth gateway derives the upstream hostname
   from the service name: `opensign-mcp.railway.internal`).
3. Set env var: `OPENSIGN_API_TOKEN`.
4. **Pin the port**: set `PORT=8000` (must match the auth gateway's
   `INTERNAL_PORT`, which defaults to `8000`).
5. **Do NOT add a public domain** — the auth gateway handles public access.
6. Deploy. The included `railway.toml` configures the build and healthcheck.
7. The OpenSign MCP is now reachable at
   `https://<auth-gateway-domain>/opensign/mcp`.

## Connect a client

### Via auth gateway (OAuth 2.1)

```json
{
  "mcpServers": {
    "opensign": {
      "url": "https://<auth-gateway-domain>/opensign/mcp"
    }
  }
}
```

Claude/Cursor handle the OAuth flow automatically.

### Direct (standalone only)

```json
{
  "mcpServers": {
    "opensign": {
      "url": "http://localhost:8000/mcp"
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
opensign-mcp/
├── Dockerfile              # Multi-stage build, runs Node.js server
├── railway.toml            # Railway config (healthcheck, restart policy)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
├── .env.example            # Env var template
├── .dockerignore           # Docker build exclusions
└── src/
    ├── index.ts            # Entrypoint — validates API token, starts Express
    ├── opensign.ts         # OpenSign API client, helpers, error handling
    ├── transport.ts        # Express app, Streamable HTTP transport, sessions
    └── tools/
        ├── index.ts        # Registers all tool groups
        ├── user.ts         # get_current_user
        ├── contact.ts      # CRUD for contacts
        ├── document.ts     # Create, list, sign, revoke documents
        ├── template.ts     # CRUD for templates
        ├── folder.ts       # CRUD for folders, move documents
        └── webhook.ts      # Get, save, delete webhook URL
```
