"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WorkflowTrace from "@/components/WorkflowTrace";
import ApprovalModal from "@/components/ApprovalModal";
import SystemSelector, { SaaSSystem } from "@/components/SystemSelector";
import styles from "./page.module.css";
import type { Workflow } from "@/lib/types";
import { apiCallProxy, fetchIntent, fetchWorkflow, orchestrateWorkflow, resumeWorkflow } from "@/lib/api";

export default function Home() {
  const [message, setMessage] = useState("");
  const [selectedSystems, setSelectedSystems] = useState<SaaSSystem[]>(["salesforce", "jira"]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [activeWorkflowMessage, setActiveWorkflowMessage] = useState<string>("");
  const [error, setError] = useState("");

  const executorLockRef = useRef(false);

  const results = useMemo(() => {
    const next: Record<string, any> = {};
    if (!workflow?.steps) return next;
    for (const step of workflow.steps) {
      const maybeResult = (step as any).result;
      if (maybeResult !== undefined) next[step.name] = maybeResult;
    }
    return next;
  }, [workflow]);

  const waitingApprovalStep = workflow?.steps.find((s) => s.status === "waiting_approval") || null;

  const isWorkflowDone = workflow?.status === "completed" || workflow?.status === "failed" || workflow?.status === "rejected";
  const isWorkflowActive = !!workflow && !isWorkflowDone;

  async function runExecutionLoop(workflowId: string, workflowMessage: string) {
    if (executorLockRef.current) return;
    executorLockRef.current = true;
    setExecuting(true);

    try {
      // Execute until we hit a waiting approval step, completion, or failure.
      while (true) {
        const latest = await fetchWorkflow(workflowId);
        setWorkflow(latest);

        const waiting = latest.steps.find((s) => s.status === "waiting_approval");
        if (waiting) break;

        if (latest.status === "failed" || latest.status === "completed" || latest.status === "rejected") break;

        const nextPending = latest.steps.find((s) => s.status === "pending");
        if (!nextPending) break;

        await apiCallProxy({
          endpoint: "execute",
          payload: {
            workflow_id: workflowId,
            step: nextPending.name,
            context: { message: workflowMessage },
          },
        });

        // Give polling a moment to pick up persisted state.
        // (Prevents rapid fire /execute + /workflow/:id hammering)
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      executorLockRef.current = false;
      setExecuting(false);
    }
  }

  useEffect(() => {
    const STORAGE_WORKFLOW_ID = "nexus.activeWorkflowId";
    const STORAGE_WORKFLOW_MESSAGE = "nexus.activeWorkflowMessage";
    const STORAGE_WORKFLOW_MESSAGE_BY_ID_PREFIX = "nexus.workflowMessageById:";

    // "Refresh recovery": if we were mid-workflow, restore enough state to poll and continue.
    try {
      const id = window.localStorage.getItem(STORAGE_WORKFLOW_ID);
      const msg = window.localStorage.getItem(STORAGE_WORKFLOW_MESSAGE);
      if (id) {
        setActiveWorkflowId(id);
        setActiveWorkflowMessage(msg || window.localStorage.getItem(`${STORAGE_WORKFLOW_MESSAGE_BY_ID_PREFIX}${id}`) || "");
      }
    } catch {
      // Ignore localStorage issues (private mode, disabled, etc.)
    }
  }, []);

  useEffect(() => {
    if (!activeWorkflowId) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const wf = await fetchWorkflow(activeWorkflowId);
        if (!cancelled) setWorkflow(wf);

        // If the workflow is done, we can stop auto-continuation but keep showing the trace.
        if (wf.status === "completed" || wf.status === "failed" || wf.status === "rejected") {
          try {
            window.localStorage.removeItem("nexus.activeWorkflowId");
            window.localStorage.removeItem("nexus.activeWorkflowMessage");
          } catch {
            // ignore
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load workflow");
      }
    };

    void tick();
    const intervalId = window.setInterval(() => void tick(), 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeWorkflowId]);

  // If we recovered from a refresh and the workflow isn't waiting for approval, continue executing.
  useEffect(() => {
    if (!activeWorkflowId) return;
    if (executing) return;

    if (!activeWorkflowMessage) {
      // We can still poll and show trace, but we can't safely continue execution without the message context.
      return;
    }

    // Let polling fetch once; then decide.
    const t = window.setTimeout(() => {
      void fetchWorkflow(activeWorkflowId)
        .then((wf) => {
          const waiting = wf.steps.find((s) => s.status === "waiting_approval");
          if (!waiting && wf.status !== "completed" && wf.status !== "failed" && wf.status !== "rejected") {
            void runExecutionLoop(activeWorkflowId, activeWorkflowMessage);
          }
        })
        .catch(() => {
          // polling effect will surface error
        });
    }, 1200);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkflowId, activeWorkflowMessage]);

  async function handleSend() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading || resuming || executing) return;

    setLoading(true);
    setError("");

    try {
      const intentData = await fetchIntent(trimmedMessage);

      if (intentData.intent === "unknown") {
        setError("Could not understand intent. Try: 'Acme Corp just signed' or 'Customer escalated'");
        return;
      }

      const orchData = await orchestrateWorkflow({
        intent: intentData.intent,
        message: trimmedMessage,
        selectedSystems,
      });

      setActiveWorkflowId(orchData.workflow_id);
      setActiveWorkflowMessage(trimmedMessage);
      setWorkflow({ workflow_id: orchData.workflow_id, status: "running", steps: orchData.steps, intent: intentData.intent });

      try {
        window.localStorage.setItem("nexus.activeWorkflowId", orchData.workflow_id);
        window.localStorage.setItem("nexus.activeWorkflowMessage", trimmedMessage);
        window.localStorage.setItem(`nexus.workflowMessageById:${orchData.workflow_id}`, trimmedMessage);
      } catch {
        // ignore
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResume(approved: boolean) {
    if (!activeWorkflowId) return;
    if (resuming || loading) return;

    setResuming(true);
    setError("");

    try {
      await resumeWorkflow({
        workflow_id: activeWorkflowId,
        approval: approved,
        notes: "",
      });

      if (!approved) {
        setError("Workflow rejected. Remaining steps were not executed.");
        return;
      }

      // Continue execution from the latest persisted workflow state.
      if (activeWorkflowMessage) {
        await runExecutionLoop(activeWorkflowId, activeWorkflowMessage);
      }
    } catch (e: any) {
      setError(e.message || "Failed to resume workflow");
    } finally {
      setResuming(false);
    }
  }

  const getWorkflowStatusIcon = (status?: string) => {
    switch (status) {
      case "running":
        return "⚡";
      case "completed":
        return "✓";
      case "failed":
        return "✗";
      case "waiting_approval":
        return "⚠";
      default:
        return "○";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nexus Agent</h1>
          <p className={styles.subtitle}>
            Enterprise SaaS orchestration. Coordinate workflows across Salesforce, Jira, Slack, SAP, and Snowflake.
          </p>
        </div>
        {workflow && (
          <div className={`${styles.statusIndicator} ${workflow.status}`}>
            <span className={styles.statusIcon}>{getWorkflowStatusIcon(workflow.status)}</span>
            <span className={styles.statusText}>{workflow.status || "running"}</span>
          </div>
        )}
      </div>

      <div className={styles.inputSection}>
        <SystemSelector 
          selected={selectedSystems} 
          onChange={setSelectedSystems}
          disabled={loading || resuming || executing}
        />
        <label className={styles.inputLabel}>Describe your event or goal</label>
        <div className={styles.inputRow}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Acme Corp just signed a $500K deal; Escalate support ticket #12345; Sync customer data from Salesforce to Snowflake"
            className={styles.input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleSend();
              }
            }}
            disabled={loading || resuming || executing}
          />
          <button
            onClick={handleSend}
            disabled={loading || resuming || executing || !message.trim()}
            className={styles.sendButton}
          >
            {loading ? "Orchestrating..." : executing ? "Executing..." : "Execute"}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>✗</span>
          <div className={styles.errorContent}>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {isWorkflowActive && workflow && (
        <WorkflowTrace steps={workflow.steps} results={results} />
      )}

      {workflow && workflow.status === "completed" && (
        <div className={styles.successMessage}>
          <span className={styles.successIcon}>✓</span>
          <div>
            <strong>Workflow completed successfully</strong>
            <p>All steps executed. {Object.keys(results).length} system(s) updated.</p>
          </div>
        </div>
      )}

      {workflow && (workflow.status === "failed" || workflow.status === "rejected") && !waitingApprovalStep && (
        <div className={styles.failureMessage}>
          <span className={styles.failureIcon}>✗</span>
          <div>
            <strong>Workflow failed</strong>
            <p>Check the error details above and try again.</p>
          </div>
        </div>
      )}

      <ApprovalModal
        step={waitingApprovalStep || null}
        loading={resuming}
        onApprove={() => handleResume(true)}
        onReject={() => handleResume(false)}
      />
    </div>
  );
}
