"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Workflow } from "@/lib/types";
import { fetchWorkflows } from "@/lib/api";

type StatusView = {
  key: string;
  label: string;
};

function getWorkflowStatusView(wf: Workflow): StatusView {
  const waiting = wf.steps?.some((s) => s.status === "waiting_approval");
  if (waiting) return { key: "waiting_approval", label: "Waiting Approval" };
  if (wf.status === "completed") return { key: "completed", label: "Completed" };
  if (wf.status === "failed") return { key: "failed", label: "Failed" };
  return { key: wf.status || "running", label: wf.status || "Running" };
}

export default function HistoryPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setError("");
      try {
        const w = await fetchWorkflows();
        if (!cancelled) setWorkflows(w);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load workflows");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter((wf) => {
      const status = getWorkflowStatusView(wf).label.toLowerCase();
      return (
        wf.workflow_id.toLowerCase().includes(q) ||
        (wf.intent || "").toLowerCase().includes(q) ||
        status.includes(q)
      );
    });
  }, [workflows, query]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Workflow History</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
          Review past runs and jump into detailed execution views.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by intent, id, or status..."
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #30363d",
            background: "#0f1115",
            color: "#e6e8eb",
          }}
        />
        <button
          onClick={() => setRefreshTick((x) => x + 1)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #30363d",
            background: "#161b22",
            color: "#e6e8eb",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, border: "1px solid #f85149", color: "#f85149", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No workflows found.</div>
        ) : (
          filtered.map((wf) => {
            const st = getWorkflowStatusView(wf);
            return (
              <Link
                key={wf.workflow_id}
                href={`/workflows/${encodeURIComponent(wf.workflow_id)}`}
                style={{
                  textDecoration: "none",
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid #30363d",
                  background: "#0f1115",
                  color: "#e6e8eb",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "Monaco, Courier New, monospace", fontSize: 13, opacity: 0.9 }}>
                      {wf.workflow_id}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.85, fontSize: 14 }}>
                      Intent: {wf.intent || "unknown"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{st.label}</div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>{wf.steps.length} steps</div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

