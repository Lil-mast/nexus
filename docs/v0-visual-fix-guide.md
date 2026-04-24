# Nexus + v0 + MCP: Visual Fix Guide

This guide shows how your Nexus fix connects directly to **v0**:

- v0 generates the React/Next.js UI from natural language.
- MCP gives that UI live access to tools/data.
- Nexus provides the workflow engine: **intent -> orchestrate -> execute -> approval -> resume**.

The result is a visual app that proves the workflow logic is no longer bugging out.

---

## How this relates to your statement

Your statement says:

> v0 generates React/Next.js code from natural language and can connect to MCP servers for external data/tools.

That is exactly what Nexus now supports:

- **Natural language input** in UI -> sent to `/intent`
- **MCP-backed orchestration** -> `/orchestrate` builds steps
- **Live step execution trace** -> `/execute` step by step
- **Human-in-the-loop approval** -> `/resume` with approve/reject

So v0 is the UI accelerator, and Nexus MCP endpoints are the runtime brain.

---

## Visual architecture

```mermaid
flowchart LR
  A[User types event in UI] --> B[/api/mcp-proxy -> /intent]
  B --> C[/api/mcp-proxy -> /orchestrate]
  C --> D[Sequential executor in page.tsx]
  D --> E[/api/mcp-proxy -> /execute for each step]
  E --> F{Step status}
  F -->|completed| D
  F -->|failed| G[Stop and show error]
  F -->|waiting_approval| H[Show Approve / Reject buttons]
  H -->|Approve| I[/api/resume-approval -> /resume]
  I --> J[Continue remaining pending steps]
  H -->|Reject| K[Mark workflow failed and stop]
```

---

## What was fixed (problem -> solution)

1. **Problem: fragile API flow**
   - Multiple direct fetch calls had inconsistent error handling.
   - **Fix:** centralized proxy request handling with response validation.

2. **Problem: workflow felt stuck or random**
   - Steps did not clearly show `running`, pause, and resume progression.
   - **Fix:** explicit sequential executor with live status transitions.

3. **Problem: approval step did not truly continue workflow**
   - Resume could update labels but not reliably continue pending steps.
   - **Fix:** approve path resumes execution from first remaining pending step.

4. **Problem: interaction felt clunky**
   - Blocking alerts and weak input ergonomics.
   - **Fix:** Enter-to-send, disabled controls while busy, inline status/errors.

---

## v0 prompt to generate a polished visual frontend

Use this in v0 (copy/paste):

```text
Build a modern dark-mode Next.js dashboard called "Nexus Agent Console".

Goal:
- Let user type a natural-language event (example: "Acme Corp just signed a deal")
- Run a workflow using these backend routes:
  - POST /api/mcp-proxy with { endpoint: "intent", payload: { message } }
  - POST /api/mcp-proxy with { endpoint: "orchestrate", payload: { intent, context } }
  - POST /api/mcp-proxy with { endpoint: "execute", payload: { step, context } }
  - POST /api/resume-approval with { workflow_id, approval, notes }

UI requirements:
- Input box + Send button + Enter key submit
- Workflow status badge (running, waiting_approval, failed, completed)
- Vertical step timeline cards with:
  - step name
  - adapter
  - status pill (pending/running/completed/failed/waiting_approval/approved/rejected)
  - inline message/error details
- Approval action bar appears only when a step is waiting approval:
  - Approve button
  - Reject button
- Disable action buttons while requests are in-flight
- Toast/inline error area for network/server failures

Behavior:
- Execute steps sequentially
- Pause immediately on waiting_approval
- On Approve: continue remaining pending steps
- On Reject: mark workflow failed and stop

Style:
- Premium SaaS look, glassmorphism cards, subtle gradients, clear status colors
- Responsive layout (desktop first, mobile-friendly)
```

---

## Quick verification script (to prove bug is fixed)

1. Start backend:
   - `cd mcp`
   - `uv run uvicorn app:app --reload --port 8000`

2. Start frontend:
   - `cd web`
   - `pnpm dev`

3. Test scenarios:
   - **Approval path:** `Acme Corp just signed a deal`
     - Expect: pause at `get_finance_approval`, then Approve resumes remaining steps.
   - **Escalation path:** `Customer escalated`
     - Expect: no approval pause, sequential completion/failure behavior.
   - **Reject path:** run approval flow then Reject
     - Expect: workflow marked failed, no further steps run.

---

## Optional: make it even more visual in v0

- Add a top progress bar: `completed_steps / total_steps`.
- Add a left-side mini event log: each status change timestamped.
- Add color legend for step statuses.
- Add a "Replay last workflow" button seeded from recent input.

---

If you want, next step I can also add a `docs/v0-demo-script.md` file with a 3-minute live demo talk track for pitching this flow.
