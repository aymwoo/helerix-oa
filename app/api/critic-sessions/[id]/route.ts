import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
