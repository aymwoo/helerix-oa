import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const stats = db.prepare("SELECT * FROM agent_usage").all();
    // Convert to the format expected by AgentRegistry
    const result: Record<string, { count: number; lastUsed?: number }> = {};
    stats.forEach((s: any) => {
      result[s.agentId] = { count: s.count, lastUsed: s.lastUsed };
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();
    const timestamp = Date.now();

    const existing = db
      .prepare("SELECT * FROM agent_usage WHERE agentId = ?")
      .get(agentId) as any;

    if (existing) {
      db.prepare(
        "UPDATE agent_usage SET count = count + 1, lastUsed = ? WHERE agentId = ?",
      ).run(timestamp, agentId);
    } else {
      db.prepare(
        "INSERT INTO agent_usage (agentId, count, lastUsed) VALUES (?, 1, ?)",
      ).run(agentId, timestamp);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to record usage" },
      { status: 500 },
    );
  }
}
