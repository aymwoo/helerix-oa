import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    db.prepare("DELETE FROM event_types WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete event type" },
      { status: 500 },
    );
  }
}
