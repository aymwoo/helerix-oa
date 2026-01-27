import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";
import { UserStatus } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Try to get userId from header first (regular fetch), then from body (sendBeacon)
    let userId = request.headers.get("x-user-id");

    if (!userId) {
      try {
        const body = await request.json();
        userId = body.userId;
      } catch {
        // Body parsing failed, userId remains null
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Set user status to Offline and clear heartbeat
    db.prepare(
      "UPDATE users SET status = ?, lastHeartbeat = NULL WHERE id = ?",
    ).run(UserStatus.Offline, userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
