import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const sessions = db
      .prepare("SELECT * FROM critic_sessions ORDER BY timestamp DESC")
      .all();
    const parsed = sessions.map((s: any) => ({
      ...s,
      messages: JSON.parse(s.messages || "[]"),
    }));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch critic sessions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await request.json();
    db.prepare(
      `
      INSERT OR REPLACE INTO critic_sessions (id, title, timestamp, messages)
      VALUES (?, ?, ?, ?)
    `,
    ).run(
      session.id,
      session.title,
      session.timestamp,
      JSON.stringify(session.messages),
    );
    return NextResponse.json(session);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save critic session" },
      { status: 500 },
    );
  }
}
