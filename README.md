# Nexus

Nexus is an AI agent that solves the enterprise "SaaS sprawl" problem. Instead of teams manually copying data between Salesforce, Jira, Slack, SAP, and Snowflake, Nexus acts as a goal-driven orchestrator. It runs on MCP (**Model Context Protocol**) servers — an open protocol that provides standardized, live access to SaaS tools through a single natural-language interface.

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript)
- **Backend**: FastAPI MCP server managed with `uv`
- **Workflows**: Vercel Workflow Development Kit (WDK) for durable execution (workflows survive restarts and can resume after human approval)

---

## Quick Start

### Prerequisites

- Python 3.11 or higher and [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 20+ and [pnpm](https://pnpm.io/installation)

### 1. Start the MCP Server

```bash
cd mcp
uv run uvicorn app:app --reload --port 8000
# Add --host 0.0.0.0 if you need to access the server from another device or container
```

The server will be available at `http://localhost:8000`.

### 2. Start the Web Frontend

In a separate terminal:

```bash
cd web
pnpm install
pnpm dev
```

The frontend will be available at `http://localhost:3000`.

---

## Project Structure

```
nexus/
├─ mcp/                         # MCP server (FastAPI + uv)
│  ├─ app.py                    # FastAPI app, adapters, agent logic
│  ├─ adapters/
│  │  ├─ __init__.py
│  │  ├─ salesforce.py          # Salesforce CRM adapter
│  │  ├─ jira.py                # Jira project management adapter
│  │  └─ slack.py               # Slack notifications adapter
│  ├─ pyproject.toml            # uv project config & dependencies
│  ├─ workflows.json            # persisted workflow state (auto-created on first run if missing)
│  └─ README.md                 # quick reference card
├─ web/                         # Next.js 15 frontend (App Router)
│  ├─ app/
│  │  ├─ page.tsx               # main UI — natural language input & workflow trace
│  │  ├─ layout.tsx             # root layout
│  │  ├─ icon.tsx               # dynamic favicon
│  │  └─ api/
│  │     ├─ mcp-proxy/route.ts       # API proxy to MCP server
│  │     └─ resume-approval/route.ts # resume workflows waiting for human approval
│  ├─ components/
│  │  └─ WorkflowTrace.tsx      # real-time workflow visualization
│  ├─ workflows/
│  │  └─ nexusWorkflow.js       # Vercel WDK durable workflow
│  ├─ package.json              # pnpm dependencies
│  ├─ pnpm-lock.yaml
│  ├─ next.config.ts
│  └─ tsconfig.json
├─ infra/
│  └─ vercel.json               # Vercel build & routing config
├─ docs/
│  └─ mcp-server.md             # detailed MCP server documentation
├─ .gitignore                   # excludes .venv, node_modules, .next/
└─ README.md                    # this file
```

---

## Architecture

### Intent → Orchestrate → Execute → Resume

1. **Intent** (`POST /intent`)  
   User submits a natural-language request (e.g. *"A new deal just closed"*). The server classifies it into a structured intent (`new_deal`, `customer_escalation`, `refund_request`).

2. **Orchestrate** (`POST /orchestrate`)  
   Generates a multi-step workflow plan with adapters assigned to each step. Steps that require human sign-off are marked `requires_approval: true`.

3. **Execute** (`POST /execute`)  
   Runs one step through its designated adapter. If a step hits a permission error or ambiguous data, it surfaces a recoverable error with a suggested human action.

4. **Resume** (`POST /resume`)  
   A human approves or rejects a waiting step via the frontend. The workflow continues or halts based on the decision.

Frontend execution behavior:
- Steps run **sequentially** and update in real time (`pending → running → completed`).
- If a step returns `waiting_approval`, execution pauses immediately.
- On **Approve**, remaining pending steps continue from the pause point.
- On **Reject**, workflow is marked failed and remaining steps are not executed.

### Adapters

Each adapter is a self-contained module that maps generic step names to SaaS-specific API calls:

| Adapter | File | Operations |
|---------|------|-----------|
| Salesforce | `adapters/salesforce.py` | `create_salesforce_opportunity`, `validate_account`, `log_case_in_salesforce` |
| Jira | `adapters/jira.py` | `create_jira_epic`, `assign_support_team` |
| Slack | `adapters/slack.py` | `notify_slack` |

Adapters live in the MCP server, but are invoked through the Next.js proxy. The proxy centralizes CORS handling, request logging, and authentication — and prevents the browser from directly exposing backend URLs or credentials.

---

## Development Guidelines

### General Rules

- **`workflows.json` is the only stateful component** in the MCP server. Keep everything else stateless; all SaaS state lives in the target systems.
- **Never commit build artifacts**. `.next/`, `node_modules/`, `.venv/`, and `__pycache__/` are already excluded in `.gitignore`.
- **Use TypeScript for frontend code** and **type hints for Python backend code**.
- **One concern per file**: adapters are independent modules; API routes are isolated route handlers.

### Backend (Python / FastAPI)

- Run the server through `uv` (`uv run uvicorn ...`) — do not use `pip install -r requirements.txt`.
- Add new dependencies to `mcp/pyproject.toml`, then re-run `uv run uvicorn app:app`.
- Adapter methods must return a Pydantic-serializable `dict` with at minimum `{"status": "ok"}` or `{"status": "failed", "error": "..."}`. Use Pydantic models for complex responses to ensure automatic validation and OpenAPI schema generation.
- File-based locking (`workflows.json.lock`) protects concurrent writes. Do not remove it.

### Frontend (Next.js / TypeScript)

- Use the App Router convention (`app/page.tsx`, `app/api/.../route.ts`).
> **CRITICAL**: Never call `localhost:8000` (or the production MCP server) directly from the browser. Always route requests through the Next.js API proxy (`/api/mcp-proxy`). Direct browser calls bypass logging, CORS handling, and credential protection.
- The `WorkflowTrace` component subscribes to workflow updates via **polling** (default) or **Server-Sent Events (SSE)**. Polling is simpler to debug; SSE reduces latency and server load. Both are supported — choose based on your real-time requirements.
- The main UI now supports Enter-to-send, disables actions while requests are in flight, and surfaces step-level adapter messages/errors in the trace panel.

### Git Workflow

1. Create a feature branch from `main`.
2. Make focused commits.
3. Ensure `git status` shows no unexpected `.next/` or `node_modules/` files before committing.
4. Open a pull request. LiveReview runs pre-commit checks.

---

## Environment Variables

For local development, defaults are sufficient. For production, set:

| Variable | Used In | Purpose |
|----------|---------|---------|
| `MCP_SERVER_URL` | `infra/vercel.json`, frontend proxy | URL of the running MCP server |
| Salesforce API credentials | `adapters/salesforce.py` | OAuth2 / API key authentication |
| Jira API credentials | `adapters/jira.py` | API token authentication |
| Slack API credentials | `adapters/slack.py` | Bot token authentication |

> **Security Note**: Never hardcode credentials. Use environment variables or a secrets manager. The `verify_auth()` function in `app.py` is currently a placeholder — implement proper API-key or OAuth2 validation before deploying to production.

---

## Deployment

### MCP Server

The FastAPI server can be deployed anywhere that supports Python 3.11+:

- **Docker**: build from `mcp/pyproject.toml` with `uv` in a multi-stage image.
- **Vercel**: not recommended (stateful file writes conflict with serverless).
- **Fly.io / Railway / Render**: excellent fits for a persistent FastAPI process.

### Web Frontend

The Next.js app is configured for Vercel via `infra/vercel.json`. Deploy with:

```bash
cd web
vercel --prod
```

Ensure `MCP_SERVER_URL` in `vercel.json` (or Vercel dashboard environment variables) points to your deployed MCP server.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `413 Request Entity Too Large` on commit | `.next/` build files staged | `git restore --staged web/.next`, add `.next/` to `.gitignore` |
| `Module not found` in Next.js | Missing `pnpm install` | Run `pnpm install` in `web/` |
| MCP server 500 on first run | `workflows.json` missing | The server auto-creates it; check write permissions in `mcp/` |
| CORS / `NetworkError` in browser | Frontend calling MCP directly | **Use the Next.js proxy (`/api/mcp-proxy`)** — never call the MCP server from the browser |
| Workflow appears to stall at approval | Expected pause on `waiting_approval` | Use **Approve** or **Reject** in the UI; approve resumes remaining pending steps |

---

## Documentation

- `docs/mcp-server.md` — Detailed MCP server setup, adapter architecture, and API reference.
- `mcp/README.md` — Quick command reference for running the backend.

## License

See [LICENSE](./LICENSE).
