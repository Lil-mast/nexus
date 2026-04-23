import { NextRequest, NextResponse } from "next/server";

const MCP_BASE = process.env.MCP_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const { endpoint, payload } = await req.json();

  const res = await fetch(`${MCP_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
