import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    // Providers are shared or per-user?
    // Usually AI configurations are system-wide or per-user.
    // Based on previous edits, we want to restrict modifications to admins.
    // But let's allow users to see them.

    const providers = db
      .prepare("SELECT * FROM ai_providers ORDER BY timestamp DESC")
      .all();
    return NextResponse.json(providers);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const provider = await request.json();
    const userId = request.headers.get("x-user-id");

    // Check if requester is admin (optional but recommended)
    const requester = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    const isAdmin =
      requester && JSON.parse(requester.roles || "[]").includes("系统管理员");

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can add providers" },
        { status: 403 },
      );
    }

    db.prepare(
      `
      INSERT OR REPLACE INTO ai_providers (id, name, baseUrl, apiKey, modelId, timestamp, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      provider.id || Date.now().toString(),
      provider.name,
      provider.baseUrl,
      provider.apiKey,
      provider.modelId,
      provider.timestamp || Date.now(),
      userId,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save provider" },
      { status: 500 },
    );
  }
}
