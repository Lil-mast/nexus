"use client";

import type { Step, Workflow, SaaSSystem } from "./types";

type ProxyRequest = {
  endpoint: string;
  payload: Record<string, unknown>;
};

type BackendWorkflowShape = {
  id: string;
  status?: string;
  intent?: string;
  context?: Record<string, unknown>;
  steps: Step[];
  started_at?: string | null;
  ended_at?: string | null;
  [key: string]: unknown;
};

export async function apiCallProxy<T>({ endpoint, payload }: ProxyRequest): Promise<T> {
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

export async function fetchIntent(message: string): Promise<{ intent: string; confidence?: number }> {
  return apiCallProxy<{ intent: string; confidence?: number }>({
    endpoint: "intent",
    payload: { message },
  });
}

export async function orchestrateWorkflow(params: {
  intent: string;
  message: string;
  selectedSystems: SaaSSystem[];
}): Promise<{ workflow_id: string; steps: Step[] }> {
  const { intent, message, selectedSystems } = params;
  // This matches `web/app/page.tsx` current request shape.
  return apiCallProxy<{ workflow_id: string; steps: Step[] }>({
    endpoint: "orchestrate",
    payload: { intent, context: { message, systems: selectedSystems } },
  });
}

export async function resumeWorkflow(params: {
  workflow_id: string;
  approval: boolean;
  notes?: string;
}): Promise<{ workflow_id: string; status: string; approval: boolean }> {
  const { workflow_id, approval, notes = "" } = params;
  const res = await fetch("/api/resume-approval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id, approval, notes }),
  });

  if (!res.ok) {
    throw new Error(`Server responded with ${res.status}`);
  }
  return (await res.json()) as { workflow_id: string; status: string; approval: boolean };
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  const res = await fetch("/api/workflows", { method: "GET" });
  if (!res.ok) throw new Error(`Server responded with ${res.status}`);
  const data = (await res.json()) as BackendWorkflowShape[];
  return data.map(normalizeWorkflow);
}

export async function fetchWorkflow(workflow_id: string): Promise<Workflow> {
  const res = await fetch(`/api/workflow/${encodeURIComponent(workflow_id)}`, { method: "GET" });
  if (!res.ok) throw new Error(`Server responded with ${res.status}`);
  const data = (await res.json()) as BackendWorkflowShape;
  return normalizeWorkflow(data);
}

function normalizeWorkflow(wf: BackendWorkflowShape): Workflow {
  return {
    ...wf,
    workflow_id: wf.id,
    started_at: wf.started_at ?? null,
    ended_at: wf.ended_at ?? null,
  };
}

