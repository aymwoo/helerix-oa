import { NextRequest, NextResponse } from "next/server";
import { deleteFeishuEvent } from "@/lib/feishu";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteFeishuEvent(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Feishu API Error (DELETE):", err.message);
    return NextResponse.json(
      { error: "Failed to delete event", details: err.message },
      { status: 500 },
    );
  }
}
