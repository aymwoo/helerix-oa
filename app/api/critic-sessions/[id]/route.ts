import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requester = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    const isAdmin =
      requester && JSON.parse(requester.roles || "[]").includes("系统管理员");

    const existing = db
      .prepare("SELECT * FROM critic_sessions WHERE id = ?")
      .get(id) as any;
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isAdmin && existing.userId && existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    db.prepare("DELETE FROM critic_sessions WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete critic session" },
      { status: 500 },
    );
  }
}
