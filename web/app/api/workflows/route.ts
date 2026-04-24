import { NextResponse } from "next/server";

const MCP_BASE = process.env.MCP_SERVER_URL || "http://localhost:8000";

export async function GET() {
  const res = await fetch(`${MCP_BASE}/workflows`, { method: "GET" });
  const raw = await res.text();
  let data: unknown = [];
  if (raw && raw.trim()) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = [];
    }
  }
  return NextResponse.json(data, { status: res.status });
}

