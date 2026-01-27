import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";
import { UserStatus } from "@/types";

// Heartbeat interval threshold (in milliseconds)
// Users are considered offline if no heartbeat received within this time
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();

    // Update user's heartbeat and set status to Active
    db.prepare(
      "UPDATE users SET lastHeartbeat = ?, status = ? WHERE id = ?",
    ).run(timestamp, UserStatus.Active, userId);

    return NextResponse.json({ success: true, timestamp });
  } catch (err) {
    console.error("Heartbeat error:", err);
    return NextResponse.json(
      { error: "Failed to update heartbeat" },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve online user count
export async function GET() {
  try {
    const threshold = Date.now() - HEARTBEAT_TIMEOUT;

    const onlineCount = (
      db
        .prepare("SELECT COUNT(*) as count FROM users WHERE lastHeartbeat > ?")
        .get(threshold) as any
    ).count;

    const onlineUsers = db
      .prepare("SELECT id, name, avatarUrl FROM users WHERE lastHeartbeat > ?")
      .all(threshold);

    return NextResponse.json({
      onlineCount,
      onlineUsers,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Get online status error:", err);
    return NextResponse.json(
      { error: "Failed to get online status" },
      { status: 500 },
    );
  }
}
