# Nexus MCP Server

AI-driven orchestration server for enterprise SaaS tools.

## Run locally

```bash
uv run uvicorn app:app --reload --port 8000
```

## Endpoints

- `POST /intent` — Parse natural language intent
- `POST /orchestrate` — Plan workflow steps for an intent
- `POST /execute` — Execute a single step via its adapter
- `POST /resume` — Resume a workflow waiting for approval
- `GET /workflow/{id}` — Get workflow status
- `GET /workflows` — List all workflows
