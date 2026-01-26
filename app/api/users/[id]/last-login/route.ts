import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const timestamp = Date.now();

    db.prepare("UPDATE users SET lastLogin = ? WHERE id = ?").run(
      timestamp,
      id,
    );

    return NextResponse.json({ success: true, lastLogin: timestamp });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update last login" },
      { status: 500 },
    );
  }
}
