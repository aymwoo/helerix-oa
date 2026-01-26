import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const file = await request.json();
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(
      `
      INSERT INTO uploads (id, name, mimeType, data, size, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, file.name, file.mimeType, file.data, file.size, Date.now());
    return NextResponse.json({ uri: `file://${id}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
