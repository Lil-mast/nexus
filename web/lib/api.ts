"use client";

import type { Step, Workflow, SaaSSystem } from "./types";
import { getDummyWorkflowById, getDummyWorkflows } from "./dummyData";

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

  const data = await parseJsonSafe(response);
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
  const data = await parseJsonSafe(res);
  return (data ?? { workflow_id, status: "resumed", approval }) as { workflow_id: string; status: string; approval: boolean };
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  try {
    const res = await fetch("/api/workflows", { method: "GET" });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = (await parseJsonSafe(res)) as BackendWorkflowShape[] | null;
    if (!data || !Array.isArray(data)) throw new Error("Invalid workflows payload");
    return data.map(normalizeWorkflow);
  } catch {
    return getDummyWorkflows();
  }
}

export async function fetchWorkflow(workflow_id: string): Promise<Workflow> {
  try {
    const res = await fetch(`/api/workflow/${encodeURIComponent(workflow_id)}`, { method: "GET" });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = (await parseJsonSafe(res)) as BackendWorkflowShape | null;
    if (!data) throw new Error("Invalid workflow payload");
    return normalizeWorkflow(data);
  } catch {
    const fallback = getDummyWorkflowById(workflow_id);
    if (fallback) return fallback;
    return {
      workflow_id,
      id: workflow_id,
      intent: "demo_fallback",
      status: "waiting_approval",
      started_at: new Date().toISOString(),
      ended_at: null,
      steps: [
        {
          name: "illustration_step",
          adapter: "internal",
          status: "waiting_approval",
          requires_approval: true,
          result: {
            status: "waiting_approval",
            message: "Demo mode: backend unavailable, using fallback workflow.",
          },
        },
      ],
    } as Workflow;
  }
}

function normalizeWorkflow(wf: BackendWorkflowShape): Workflow {
  return {
    ...wf,
    workflow_id: wf.id,
    started_at: wf.started_at ?? null,
    ended_at: wf.ended_at ?? null,
  };
}

async function parseJsonSafe(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

