export type SaaSSystem = "salesforce" | "jira" | "slack" | "sap" | "snowflake";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "skipped"
  | string;

export type Step = {
  name: string;
  adapter: string;
  status: StepStatus;
  requires_approval?: boolean;
  // Populated by the backend on resume (best-effort; may be absent if auth/persistence isn't enabled)
  approval_notes?: string;
  // Optional free-form extra metadata returned by backend.
  [key: string]: unknown;
};

export type Workflow = {
  workflow_id: string;
  intent?: string;
  status?: string;
  context?: Record<string, unknown>;
  steps: Step[];
  started_at?: string | null;
  ended_at?: string | null;
  // Optional additional fields from backend storage
  [key: string]: unknown;
};

export type WorkflowListItem = Workflow;

