# Nexus MCP Server

The MCP (Model Context Protocol) server is a FastAPI application that provides standardized, live access to enterprise SaaS tools. It acts as the orchestration backend for the Nexus AI agent.

## Prerequisites

- Python 3.11 or higher
- [uv](https://docs.astral.sh/uv/getting-started/installation/) package manager

## Project Setup

The server is located in the `mcp/` directory and uses `pyproject.toml` for dependency management:

```toml
[project]
name = "nexus-mcp"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "pydantic>=2.9.0",
    "uvicorn>=0.32.0",
]
```

## Running the Server

All commands should be run from the `mcp/` directory.

### Development (with auto-reload)

```bash
cd mcp
uv run uvicorn app:app --reload --port 8000
```

### Production

```bash
cd mcp
uv run uvicorn app:app --host 0.0.0.0 --port 8000
```

`uv run` automatically creates the virtual environment, installs dependencies, and starts the server on the first invocation.

## Architecture

### Adapters

The server connects to SaaS tools through adapter modules:

| Adapter | File | Purpose |
|---------|------|---------|
| Salesforce | `adapters/salesforce.py` | Opportunities, cases, account validation |
| Jira | `adapters/jira.py` | Epics, ticket assignment |
| Slack | `adapters/slack.py` | Notifications and alerts |

Adapters are instantiated at startup and injected into the execution pipeline.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/intent` | Parse natural language intent into structured goal |
| POST | `/orchestrate` | Generate a workflow plan for a given intent |
| POST | `/execute` | Execute a single step via its target adapter |
| POST | `/resume` | Resume a workflow waiting for human approval |
| GET | `/workflow/{id}` | Retrieve workflow status and step results |
| GET | `/workflows` | List all persisted workflows |

### Workflow Persistence

Workflow state is stored in `workflows.json` with file-based locking to prevent corruption during concurrent writes. A backup is automatically created if the file becomes corrupted.

## Environment Variables

No environment variables are strictly required for local development. In production you should configure:

- SaaS API credentials per adapter ( Salesforce, Jira, Slack tokens)
- `VERIFY_AUTH` / API key validation in `verify_auth()`

## Next Steps

- See `mcp/README.md` for a quick reference card.
- See `web/README.md` (if present) for frontend setup.
