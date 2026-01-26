import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get requester info
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roles = JSON.parse(user.roles || "[]");
    const isAdmin = roles.includes("系统管理员");

    let sessions;
    if (isAdmin) {
      sessions = db
        .prepare("SELECT * FROM critic_sessions ORDER BY timestamp DESC")
        .all();
    } else {
      sessions = db
        .prepare(
          "SELECT * FROM critic_sessions WHERE userId = ? ORDER BY timestamp DESC",
        )
        .all(userId);
    }

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
    const userIdFromHeader = request.headers.get("x-user-id");
    const userId = session.userId || userIdFromHeader;

    db.prepare(
      `
      INSERT OR REPLACE INTO critic_sessions (id, title, timestamp, messages, userId)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(
      session.id,
      session.title,
      session.timestamp,
      JSON.stringify(session.messages),
      userId,
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
