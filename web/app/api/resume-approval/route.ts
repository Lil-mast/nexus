import { NextRequest, NextResponse } from "next/server";

const MCP_BASE = process.env.MCP_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${MCP_BASE}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
