from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
from datetime import datetime

from adapters.salesforce import SalesforceAdapter
from adapters.jira import JiraAdapter
from adapters.slack import SlackAdapter

app = FastAPI(title="Nexus MCP Server", version="0.1.0")

salesforce = SalesforceAdapter()
jira = JiraAdapter()
slack = SlackAdapter()

WORKFLOW_FILE = "workflows.json"


class IntentRequest(BaseModel):
    message: str


class OrchestrateRequest(BaseModel):
    intent: str
    context: Optional[Dict[str, Any]] = {}


class ExecuteStepRequest(BaseModel):
    step: str
    context: Optional[Dict[str, Any]] = {}


class ResumeRequest(BaseModel):
    workflow_id: str
    approval: bool
    notes: Optional[str] = ""


def load_workflows() -> List[Dict]:
    if os.path.exists(WORKFLOW_FILE):
        with open(WORKFLOW_FILE, "r") as f:
            return json.load(f)
    return []


def save_workflow(wf: Dict):
    workflows = load_workflows()
    # update if exists
    found = False
    for i, w in enumerate(workflows):
        if w.get("id") == wf.get("id"):
            workflows[i] = wf
            found = True
            break
    if not found:
        workflows.append(wf)
    with open(WORKFLOW_FILE, "w") as f:
        json.dump(workflows, f, indent=2)


def generate_id() -> str:
    import uuid
    return str(uuid.uuid4())[:8]


@app.post("/intent")
def parse_intent(req: IntentRequest):
    msg = req.message.lower()
    if "signed" in msg or "deal" in msg or "closed" in msg:
        return {"intent": "new_deal", "confidence": 0.95}
    elif "escalated" in msg or "escalation" in msg or "urgent" in msg:
        return {"intent": "customer_escalation", "confidence": 0.92}
    elif "refund" in msg or "cancel" in msg:
        return {"intent": "refund_request", "confidence": 0.88}
    return {"intent": "unknown", "confidence": 0.0}


@app.post("/orchestrate")
def orchestrate(req: OrchestrateRequest):
    intent = req.intent
    if intent == "new_deal":
        steps = [
            {"name": "create_salesforce_opportunity", "adapter": "salesforce", "status": "pending"},
            {"name": "get_finance_approval", "adapter": "internal", "status": "pending", "requires_approval": True},
            {"name": "create_jira_epic", "adapter": "jira", "status": "pending"},
            {"name": "notify_slack", "adapter": "slack", "status": "pending"}
        ]
    elif intent == "customer_escalation":
        steps = [
            {"name": "log_case_in_salesforce", "adapter": "salesforce", "status": "pending"},
            {"name": "assign_support_team", "adapter": "jira", "status": "pending"},
            {"name": "notify_slack", "adapter": "slack", "status": "pending"}
        ]
    elif intent == "refund_request":
        steps = [
            {"name": "validate_account", "adapter": "salesforce", "status": "pending"},
            {"name": "get_finance_approval", "adapter": "internal", "status": "pending", "requires_approval": True},
            {"name": "notify_slack", "adapter": "slack", "status": "pending"}
        ]
    else:
        steps = []

    workflow = {
        "id": generate_id(),
        "intent": intent,
        "status": "running",
        "context": req.context or {},
        "steps": steps,
        "started_at": datetime.utcnow().isoformat(),
        "ended_at": None
    }
    save_workflow(workflow)
    return {"workflow_id": workflow["id"], "steps": steps}


@app.post("/execute")
def execute_step(req: ExecuteStepRequest):
    step = req.step
    ctx = req.context or {}

    try:
        if step.startswith("create_salesforce") or step == "validate_account" or step == "log_case_in_salesforce":
            result = salesforce.execute(step, ctx)
        elif step.startswith("create_jira") or step == "assign_support_team":
            result = jira.execute(step, ctx)
        elif step == "notify_slack":
            result = slack.execute(step, ctx)
        elif step == "get_finance_approval":
            result = {"status": "waiting_approval", "message": "Waiting for finance approval"}
        else:
            result = {"status": "skipped", "message": f"No adapter for {step}"}
    except Exception as e:
        error_msg = str(e).lower()
        if "permission" in error_msg:
            result = {"status": "failed", "error": error_msg, "action": f"Find approver for {step}"}
        elif "ambiguous" in error_msg:
            result = {"status": "failed", "error": error_msg, "action": f"Ask human to clarify {step}"}
        else:
            result = {"status": "failed", "error": error_msg, "action": f"Alternative path for {step}"}

    return result


@app.post("/resume")
def resume_workflow(req: ResumeRequest):
    workflows = load_workflows()
    wf = next((w for w in workflows if w["id"] == req.workflow_id), None)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # find the waiting step and mark it
    for step in wf["steps"]:
        if step.get("status") == "waiting_approval" or step.get("requires_approval"):
            step["status"] = "approved" if req.approval else "rejected"
            step["approval_notes"] = req.notes
            break

    wf["status"] = "running"
    save_workflow(wf)
    return {"workflow_id": req.workflow_id, "status": "resumed", "approval": req.approval}


@app.get("/workflow/{workflow_id}")
def get_workflow(workflow_id: str):
    workflows = load_workflows()
    wf = next((w for w in workflows if w["id"] == workflow_id), None)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@app.get("/workflows")
def list_workflows():
    return load_workflows()
