import { NextResponse } from "next/server";

const MCP_BASE = process.env.MCP_SERVER_URL || "http://localhost:8000";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workflow_id: string }> }
) {
  const { workflow_id } = await params;
  const res = await fetch(`${MCP_BASE}/workflow/${encodeURIComponent(workflow_id)}`, { method: "GET" });
  const raw = await res.text();
  let data: unknown = null;
  if (raw && raw.trim()) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  return NextResponse.json(data, { status: res.status });
}

