"use client";

import styles from "./ApprovalModal.module.css";

type Step = {
  name: string;
  adapter: string;
  status: string;
  requires_approval?: boolean;
};

interface ApprovalModalProps {
  step: Step | null;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalModal({ step, loading, onApprove, onReject }: ApprovalModalProps) {
  if (!step) return null;

  const adapterDisplayName: Record<string, string> = {
    salesforce: "Salesforce CRM",
    jira: "Jira Tickets",
    slack: "Slack Messages",
    sap: "SAP System",
    snowflake: "Snowflake Data",
  };

  const stepDescriptions: Record<string, string> = {
    "update_crm": "Update customer record with latest deal information",
    "create_ticket": "Create a new support ticket in project tracking system",
    "notify_team": "Send notification to team about workflow event",
    "sync_data": "Sync data across multiple systems for consistency",
    "escalate_issue": "Escalate issue to management team",
    "update_database": "Update enterprise data warehouse",
  };

  const description = stepDescriptions[step.name] || `Execute ${step.name}`;
  const adapterName = adapterDisplayName[step.adapter] || step.adapter;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Approval Required</h2>
          <p className={styles.subtitle}>Step waiting for your decision</p>
        </div>

        <div className={styles.content}>
          <div className={styles.stepInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Next Step</span>
              <span className={styles.value}>{step.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>System</span>
              <span className={styles.badge}>{adapterName}</span>
            </div>
          </div>

          <div className={styles.descriptionBox}>
            <p className={styles.description}>{description}</p>
            <p className={styles.warning}>
              This action will connect to your enterprise systems and synchronize data across {adapterName.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onReject}
            disabled={loading}
            className={styles.rejectButton}
          >
            {loading ? "Processing..." : "Reject"}
          </button>
          <button
            onClick={onApprove}
            disabled={loading}
            className={styles.approveButton}
          >
            {loading ? "Approving..." : "Approve & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
