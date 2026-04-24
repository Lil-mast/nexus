# Nexus Web Frontend

This is the Next.js agent UI for Nexus.

- It never calls the MCP backend directly from the browser.
- All requests go through Next route handlers under `web/app/api/` (notably `/api/mcp-proxy`).
- The UI persists an “active workflow id” in `localStorage` so it can recover after refresh and keep polling.

## Prerequisites

- Node.js 20+
- `pnpm`
- MCP server running at `http://localhost:8000` (or set `MCP_SERVER_URL`)

## Run locally

### 1) Start the MCP server
From the repo root:

```bash
cd mcp
uv run uvicorn app:app --reload --port 8000
```

Server: `http://localhost:8000`

### 2) Start the Web frontend
In a separate terminal:

```bash
cd web
pnpm install
pnpm dev
```

Web: `http://localhost:3000`

## Environment variables

`MCP_SERVER_URL` is read by Next route handlers (`web/app/api/**`) to know where your MCP server is running.

Example:

```bash
MCP_SERVER_URL=http://localhost:8000 pnpm dev
```

For reference, see `web/.env.example`.

## Smoke test (agent + approval flow)

1. Open `http://localhost:3000`
2. In the **Run** screen, describe a signed deal or closed deal, for example:
   - `Acme Corp just signed a new deal`
3. You should see a workflow timeline appear.
4. When the workflow pauses on an approval step (badge: “Awaiting Approval”), click:
   - **Approve & Continue**
5. The remaining steps should execute automatically and the workflow should finish.

After completion, open **History** to view the workflow run and click into its **Workflow Details** page.

