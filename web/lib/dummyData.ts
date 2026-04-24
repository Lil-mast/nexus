import type { Workflow } from "./types";

const now = new Date();
const iso = now.toISOString();

const DUMMY_WORKFLOWS: Workflow[] = [
  {
    workflow_id: "demo-new-deal-001",
    id: "demo-new-deal-001",
    intent: "new_deal",
    status: "waiting_approval",
    started_at: iso,
    ended_at: null,
    context: { message: "Acme Corp just signed a new deal", systems: ["salesforce", "jira", "slack"] },
    steps: [
      {
        name: "create_salesforce_opportunity",
        adapter: "salesforce",
        status: "completed",
        result: {
          status: "success",
          salesforce_opportunity_id: "OPP-DEMO1234",
          message: "Created opportunity OPP-DEMO1234 in Salesforce",
        },
      },
      {
        name: "get_finance_approval",
        adapter: "internal",
        status: "waiting_approval",
        requires_approval: true,
        result: {
          status: "waiting_approval",
          message: "Waiting for finance approval",
          adapter: "internal",
          action: "Approve budget threshold for enterprise contract",
        },
      },
      { name: "create_jira_epic", adapter: "jira", status: "pending" },
      { name: "notify_slack", adapter: "slack", status: "pending" },
    ],
  },
  {
    workflow_id: "demo-escalation-002",
    id: "demo-escalation-002",
    intent: "customer_escalation",
    status: "completed",
    started_at: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
    ended_at: new Date(now.getTime() - 1000 * 60 * 42).toISOString(),
    context: { message: "Customer escalated urgent issue", systems: ["salesforce", "jira", "slack"] },
    steps: [
      {
        name: "log_case_in_salesforce",
        adapter: "salesforce",
        status: "completed",
        result: { status: "success", salesforce_case_id: "CASE-DEMO9876", message: "Logged case CASE-DEMO9876 in Salesforce" },
      },
      {
        name: "assign_support_team",
        adapter: "jira",
        status: "completed",
        result: { status: "success", jira_ticket_id: "SUP-DEMO1234", message: "Assigned support ticket SUP-DEMO1234 in Jira" },
      },
      {
        name: "notify_slack",
        adapter: "slack",
        status: "completed",
        result: { status: "success", slack_channel: "#support", message: "Posted notification to #support" },
      },
    ],
  },
];

export function getDummyWorkflows(): Workflow[] {
  return DUMMY_WORKFLOWS;
}

export function getDummyWorkflowById(workflowId: string): Workflow | null {
  return DUMMY_WORKFLOWS.find((wf) => wf.workflow_id === workflowId || (wf as any).id === workflowId) ?? null;
}

