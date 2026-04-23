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

export default function Home() {
  const [message, setMessage] = useState("");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setLoading(true);
    setError("");
    setResults({});

    try {
      // Step 1: Parse intent
      const intentRes = await fetch("/api/mcp-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "intent", payload: { message } }),
      });
      const intentData = await intentRes.json();

      if (intentData.intent === "unknown") {
        setError("Could not understand intent. Try: 'Acme Corp just signed' or 'Customer escalated'");
        setLoading(false);
        return;
      }

      // Step 2: Orchestrate
      const orchRes = await fetch("/api/mcp-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "orchestrate", payload: { intent: intentData.intent, context: { message } } }),
      });
      const orchData = await orchRes.json();
      setWorkflow(orchData);

      // Step 3: Execute steps sequentially
      const newResults: Record<string, any> = {};
      const updatedSteps = orchData.steps.map((step: Step) => ({ ...step }));
      for (const step of updatedSteps) {
        const execRes = await fetch("/api/mcp-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: "execute",
            payload: { step: step.name, context: { message } },
          }),
        });
        const execData = await execRes.json();
        newResults[step.name] = execData;

        // Update step status in UI
        if (execData.status === "waiting_approval") {
          step.status = "waiting_approval";
        } else if (execData.status === "failed") {
          step.status = "failed";
        } else {
          step.status = "completed";
        }
      }
      setWorkflow({ ...orchData, steps: updatedSteps });
      setResults(newResults);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResume(approved: boolean) {
    if (!workflow) return;
    try {
      const res = await fetch("/api/resume-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_id: workflow.workflow_id, approval: approved, notes: "" }),
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const data = await res.json();
      // Update workflow status locally after resume
      const updatedSteps = workflow.steps.map((s) =>
        s.status === "waiting_approval" ? { ...s, status: approved ? "approved" : "rejected" } : { ...s }
      );
      setWorkflow({ ...workflow, steps: updatedSteps, status: data.status || "running" });
      alert(`Workflow ${data.workflow_id} ${approved ? "approved" : "rejected"}`);
    } catch (e: any) {
      setError(e.message || "Failed to resume workflow");
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
        />
        <button
          onClick={handleSend}
          disabled={loading || !message}
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
          <WorkflowTrace steps={workflow.steps} results={results} />

          {hasWaitingApproval && (
            <div className={styles.approvalRow}>
              <button
                onClick={() => handleResume(true)}
                className={styles.approveButton}
              >
                Approve
              </button>
              <button
                onClick={() => handleResume(false)}
                className={styles.rejectButton}
              >
                Reject
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
