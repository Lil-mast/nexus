"use client";

import { useState } from "react";
import styles from "./WorkflowTrace.module.css";

const statusIcons: Record<string, string> = {
  pending: "○",
  running: "●",
  completed: "✓",
  failed: "✗",
  waiting_approval: "⚠",
  approved: "✓",
  rejected: "✗",
  skipped: "↷",
};

type Step = {
  name: string;
  adapter: string;
  status: string;
  requires_approval?: boolean;
};

export default function WorkflowTrace({
  steps,
  results,
}: {
  steps: Step[];
  results: Record<string, any>;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const getAdapterDisplay = (adapter: string): string => {
    const names: Record<string, string> = {
      salesforce: "Salesforce",
      jira: "Jira",
      slack: "Slack",
      internal: "Internal",
      sap: "SAP",
      snowflake: "Snowflake",
    };
    return names[adapter] || adapter;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Pending",
      running: "Running",
      completed: "Completed",
      failed: "Failed",
      waiting_approval: "Awaiting Approval",
      approved: "Approved",
      rejected: "Rejected",
      skipped: "Skipped",
    };
    return labels[status] || status;
  };

  const getExtraKeys = (result: any) => {
    if (!result || typeof result !== "object") return [];
    return Object.keys(result).filter((k) => !["status", "message", "error", "adapter"].includes(k));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Workflow Timeline</h2>
        <span className={styles.stepCount}>{steps.length} steps</span>
      </div>

      <div className={styles.timeline}>
        {steps.map((step, idx) => {
          const result = results[step.name];
          const isLast = idx === steps.length - 1;
          const isActive = step.status === "running" || step.status === "waiting_approval";

          return (
            <div key={idx} className={styles.timelineItem}>
              <div className={`${styles.connector} ${step.status}`} />
              <div className={`${styles.step} ${step.status} ${isActive ? styles.active : ""}`}>
                <div className={styles.stepHeader}>
                  <div className={styles.iconAndName}>
                    <div className={`${styles.stepIcon} ${step.status}`}>
                      {statusIcons[step.status] || "?"}
                    </div>
                    <div className={styles.nameAndAdapter}>
                      <div className={styles.stepName}>{step.name}</div>
                      <div className={styles.adapterTag}>{getAdapterDisplay(step.adapter)}</div>
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${step.status}`}>
                    {getStatusLabel(step.status)}
                  </div>
                </div>

                {result?.message && (
                  <div className={styles.message}>
                    <svg className={styles.messageIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="8" cy="12" r="0.5" fill="currentColor" />
                    </svg>
                    {result.message}
                  </div>
                )}

                {result?.error && (
                  <div className={styles.error}>
                    <svg className={styles.errorIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="8" cy="12" r="0.5" fill="currentColor" />
                    </svg>
                    {result.error}
                  </div>
                )}

                {step.requires_approval && (
                  <div className={styles.approvalHint}>
                    Requires manual approval before proceeding
                  </div>
                )}

                {result && getExtraKeys(result).length > 0 && (
                  <details className={styles.details}>
                    <summary className={styles.detailsSummary}>
                      Step details ({getExtraKeys(result).length} fields)
                    </summary>
                    <pre className={styles.jsonPre}>{JSON.stringify(result, null, 2)}</pre>
                    <div className={styles.detailsActions}>
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                            setCopiedKey(step.name);
                            window.setTimeout(() => setCopiedKey((k) => (k === step.name ? null : k)), 1200);
                          } catch {
                            // ignore copy errors (permissions, insecure context)
                          }
                        }}
                      >
                        {copiedKey === step.name ? "Copied" : "Copy JSON"}
                      </button>
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
