import { NextRequest, NextResponse } from "next/server";

const MCP_BASE = process.env.MCP_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const { endpoint, payload } = await req.json();

  const res = await fetch(`${MCP_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data: unknown = null;
  if (raw && raw.trim()) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }
  return NextResponse.json(data, { status: res.status });
}
