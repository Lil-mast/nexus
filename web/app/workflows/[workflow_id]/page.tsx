"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ApprovalModal from "@/components/ApprovalModal";
import WorkflowTrace from "@/components/WorkflowTrace";
import type { Workflow } from "@/lib/types";
import { apiCallProxy, fetchWorkflow, resumeWorkflow } from "@/lib/api";

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflow_id: string }>;
}) {
  const [workflowId, setWorkflowId] = useState<string>("");

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState("");
  const [resuming, setResuming] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionContextMessage, setExecutionContextMessage] = useState("");

  const executorLockRef = useRef(false);

  const waitingApprovalStep = workflow?.steps.find((s) => s.status === "waiting_approval") || null;

  const results = useMemo(() => {
    const next: Record<string, any> = {};
    if (!workflow?.steps) return next;
    for (const step of workflow.steps) {
      const maybeResult = (step as any).result;
      if (maybeResult !== undefined) next[step.name] = maybeResult;
    }
    return next;
  }, [workflow]);

  useEffect(() => {
    void Promise.resolve(params)
      .then((p) => setWorkflowId(p.workflow_id))
      .catch(() => setWorkflowId(""));
  }, [params]);

  useEffect(() => {
    if (!workflowId) return;
    const key = `nexus.workflowMessageById:${workflowId}`;
    try {
      setExecutionContextMessage(window.localStorage.getItem(key) || "");
    } catch {
      // ignore
    }
  }, [workflowId]);

  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const wf = await fetchWorkflow(workflowId);
        if (!cancelled) setWorkflow(wf);
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
  }, [workflowId]);

  async function runExecutionLoop() {
    if (!executionContextMessage) return;
    if (executorLockRef.current) return;
    executorLockRef.current = true;
    setExecuting(true);

    try {
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
            context: { message: executionContextMessage },
          },
        });

        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      executorLockRef.current = false;
      setExecuting(false);
    }
  }

  // If this workflow is already in a non-waiting state, try to continue automatically.
  useEffect(() => {
    if (!executionContextMessage) return;
    if (!workflow) return;

    const waiting = workflow.steps.find((s) => s.status === "waiting_approval");
    const done = workflow.status === "completed" || workflow.status === "failed" || workflow.status === "rejected";
    if (!waiting && !done) {
      void runExecutionLoop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, executionContextMessage]);

  async function handleResume(approved: boolean) {
    setResuming(true);
    setError("");
    try {
      await resumeWorkflow({
        workflow_id: workflowId,
        approval: approved,
        notes: "",
      });

      if (!approved) {
        setError("Workflow rejected. Remaining steps were not executed.");
        return;
      }

      if (!executionContextMessage) {
        setError(
          "Approval recorded, but execution context message was missing, so remaining steps were not executed automatically."
        );
        return;
      }

      await runExecutionLoop();
    } catch (e: any) {
      setError(e.message || "Failed to resume workflow");
    } finally {
      setResuming(false);
    }
  }

  const done = workflow?.status === "completed" || workflow?.status === "failed" || workflow?.status === "rejected";

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, wordBreak: "break-word" }}>Workflow Details</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.8, fontFamily: "Monaco, Courier New, monospace" }}>
          {workflowId}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #f85149",
            color: "#f85149",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {waitingApprovalStep && (
        <div style={{ marginBottom: 14, opacity: 0.9 }}>
          Waiting for approval on <span style={{ fontFamily: "Monaco, Courier New, monospace" }}>{waitingApprovalStep.name}</span>.
          {executionContextMessage ? null : (
            <div style={{ marginTop: 8, color: "#d29922" }}>
              Execution context message is missing; approvals will be recorded, but auto-continuation may not work.
            </div>
          )}
        </div>
      )}

      {!done && executing && (
        <div style={{ marginBottom: 14, opacity: 0.9 }}>
          Executing pending steps...
        </div>
      )}

      {workflow && <WorkflowTrace steps={workflow.steps} results={results} />}

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontSize: 13, opacity: 0.9, marginBottom: 8 }}>
          Execution context message (used for continuing after approval)
        </label>
        <input
          value={executionContextMessage}
          onChange={(e) => setExecutionContextMessage(e.target.value)}
          placeholder="Optional: message context to use for remaining steps"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #30363d",
            background: "#0f1115",
            color: "#e6e8eb",
          }}
        />
      </div>

      <ApprovalModal
        step={waitingApprovalStep || null}
        loading={resuming}
        onApprove={() => handleResume(true)}
        onReject={() => handleResume(false)}
      />
    </div>
  );
}

