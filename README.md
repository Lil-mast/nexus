# nexus
Nexus is an AI agent that solves the enterprise “SaaS sprawl” problem. Instead of teams manually copying data between Salesforce, Jira, Slack, SAP, and Snowflake, Nexus acts as a goal‑driven orchestrator. It runs on MCP servers, giving standardized, live access to SaaS tools

nexus-mcp/
├─ mcp/                         # MCP server (FastAPI)
│  ├─ app.py                    # FastAPI app, adapters, agent logic
│  ├─ adapters/
│  │  ├─ salesforce.py
│  │  ├─ jira.py
│  │  └─ slack.py
│  ├─ workflows.json            # persisted workflow state
│  └─ requirements.txt
├─ web/                         # Next.js frontend and WDK workflows
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ next.config.js
│  ├─ pages/
│  │  ├─ index.js               # simple UI to send events and view status
│  │  └─ api/
│  │     ├─ mcp-proxy.js        # proxy to MCP server
│  │     └─ resume-approval.js  # endpoint to resume waiting workflows
│  ├─ workflows/                # Vercel WDK workflow files
│  │  └─ nexusWorkflow.js
│  └─ components/
│     └─ WorkflowTrace.js
├─ infra/
│  └─ vercel.json               # Vercel config and routes
└─ README.md
