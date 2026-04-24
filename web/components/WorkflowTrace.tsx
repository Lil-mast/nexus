"use client";

import styles from "./WorkflowTrace.module.css";

const statusEmoji: Record<string, string> = {
  pending: "⏳",
  running: "🔄",
  completed: "✅",
  failed: "❌",
  waiting_approval: "🛑",
  approved: "✅",
  rejected: "❌",
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
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Workflow Trace</h2>
      <div className={styles.stepList}>
        {steps.map((step, idx) => {
          const result = results[step.name];
          const statusClass = styles[step.status] || "";
          return (
            <div
              key={idx}
              className={`${styles.step} ${statusClass}`}
            >
              <div>
                <span className={styles.emoji}>
                  {statusEmoji[step.status] || "❓"}
                </span>
                <strong>{step.name}</strong>
                <span className={styles.adapter}>
                  ({step.adapter})
                </span>
              </div>
              <div className={`${styles.status} ${statusClass}`}>
                {step.status}
              </div>
              {result?.message && (
                <div className={styles.detail}>{result.message}</div>
              )}
              {result?.error && (
                <div className={styles.error}>{result.error}</div>
              )}
            </div>
          );
        })}
      </div>
      {Object.keys(results).length > 0 && (
        <pre className={styles.results}>
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  );
}
