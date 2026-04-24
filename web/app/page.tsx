"use client";

import { useState } from "react";
import WorkflowTrace from "@/components/WorkflowTrace";
import styles from "./page.module.css";

type Step = {
  name: string;
  adapter: string;
  status: string;
  requires_approval?: boolean;
};

type Workflow = {
  workflow_id: string;
  steps: Step[];
  status?: string;
};

type ProxyRequest = {
  endpoint: string;
  payload: Record<string, unknown>;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState("");

  async function callProxy<T>({ endpoint, payload }: ProxyRequest): Promise<T> {
    const response = await fetch("/api/mcp-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, payload }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || `Request failed with status ${response.status}`);
    }
    return data as T;
  }

  async function executeStepsSequentially(baseWorkflow: Workflow, startIndex: number, workflowMessage: string) {
    const updatedSteps = baseWorkflow.steps.map((step) => ({ ...step }));
    const nextResults = { ...results };

    for (let i = startIndex; i < updatedSteps.length; i += 1) {
      const step = updatedSteps[i];
      if (!step) continue;
      if (step.status !== "pending") continue;

      step.status = "running";
      setWorkflow({ ...baseWorkflow, steps: [...updatedSteps], status: "running" });

      const execData = await callProxy<Record<string, any>>({
        endpoint: "execute",
        payload: { step: step.name, context: { message: workflowMessage } },
      });
      nextResults[step.name] = execData;

      if (execData.status === "waiting_approval") {
        step.status = "waiting_approval";
        setWorkflow({ ...baseWorkflow, steps: [...updatedSteps], status: "waiting_approval" });
        setResults(nextResults);
        return { steps: updatedSteps, status: "waiting_approval", results: nextResults };
      }

      if (execData.status === "failed") {
        step.status = "failed";
        setWorkflow({ ...baseWorkflow, steps: [...updatedSteps], status: "failed" });
        setResults(nextResults);
        return { steps: updatedSteps, status: "failed", results: nextResults };
      }

      step.status = "completed";
      setWorkflow({ ...baseWorkflow, steps: [...updatedSteps], status: "running" });
      setResults(nextResults);
    }

    setWorkflow({ ...baseWorkflow, steps: updatedSteps, status: "completed" });
    setResults(nextResults);
    return { steps: updatedSteps, status: "completed", results: nextResults };
  }

  async function handleSend() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading || resuming) return;

    setLoading(true);
    setError("");
    setResults({});

    try {
      const intentData = await callProxy<{ intent: string }>({
        endpoint: "intent",
        payload: { message: trimmedMessage },
      });

      if (intentData.intent === "unknown") {
        setError("Could not understand intent. Try: 'Acme Corp just signed' or 'Customer escalated'");
        return;
      }

      const orchData = await callProxy<Workflow>({
        endpoint: "orchestrate",
        payload: { intent: intentData.intent, context: { message: trimmedMessage } },
      });

      setWorkflow(orchData);
      await executeStepsSequentially(orchData, 0, trimmedMessage);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResume(approved: boolean) {
    if (!workflow) return;
    if (resuming || loading) return;

    setResuming(true);
    setError("");

    try {
      const res = await fetch("/api/resume-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_id: workflow.workflow_id, approval: approved, notes: "" }),
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      await res.json();
      const updatedSteps = workflow.steps.map((s) =>
        s.status === "waiting_approval" ? { ...s, status: approved ? "approved" : "rejected" } : { ...s }
      );
      const updatedWorkflow = {
        ...workflow,
        steps: updatedSteps,
        status: approved ? "running" : "failed",
      };
      setWorkflow(updatedWorkflow);

      if (approved) {
        const pendingIndex = updatedWorkflow.steps.findIndex((step) => step.status === "pending");
        if (pendingIndex >= 0) {
          await executeStepsSequentially(updatedWorkflow, pendingIndex, message.trim());
        } else {
          setWorkflow({ ...updatedWorkflow, status: "completed" });
        }
      } else {
        setError("Workflow rejected. Remaining steps were not executed.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to resume workflow");
    } finally {
      setResuming(false);
    }
  }

  const hasWaitingApproval = workflow?.steps.some((s) => s.status === "waiting_approval");

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Nexus Agent</h1>
      <p className={styles.subtitle}>
        Goal-driven orchestrator for your SaaS stack. Type a natural event below.
      </p>

      <div className={styles.inputRow}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Acme Corp just signed a deal"
          className={styles.input}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || resuming || !message.trim()}
          className={styles.sendButton}
        >
          {loading ? "Running..." : "Send"}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {workflow && (
        <>
          <div className={styles.workflowStatus}>Workflow status: {workflow.status || "running"}</div>
          <WorkflowTrace steps={workflow.steps} results={results} />

          {hasWaitingApproval && (
            <div className={styles.approvalRow}>
              <button
                onClick={() => handleResume(true)}
                className={styles.approveButton}
                disabled={resuming}
              >
                {resuming ? "Applying..." : "Approve"}
              </button>
              <button
                onClick={() => handleResume(false)}
                className={styles.rejectButton}
                disabled={resuming}
              >
                {resuming ? "Applying..." : "Reject"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
