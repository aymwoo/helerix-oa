import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const fileRecord = db
      .prepare("SELECT * FROM uploads WHERE id = ?")
      .get(id) as any;

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if 'data' seems to be a path (starts with /uploads/) or legacy base64
    // If it's a path, we read the file from disk and return it.
    // Ideally we should return a redirect or stream, but the frontend expects JSON with base64 for preview?
    // Let's check db.ts -> FileManager.getFile expects: { mimeType, data (base64) }

    let base64Data = "";

    if (fileRecord.data && fileRecord.data.startsWith("/uploads/")) {
      // It's a file path
      const filePath = path.join(process.cwd(), "public", fileRecord.data);
      if (fs.existsSync(filePath)) {
        const buffer = await fs.promises.readFile(filePath);
        base64Data = buffer.toString("base64");
      } else {
        // File missing from disk?
        console.error(`File missing at ${filePath}`);
        return NextResponse.json(
          { error: "File content missing" },
          { status: 404 },
        );
      }
    } else {
      // Legacy: It is the base64 data itself
      base64Data = fileRecord.data;
    }

    return NextResponse.json({
      ...fileRecord,
      data: base64Data, // Always return base64 to maintain frontend compatibility
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get file info first to delete from disk
    const fileRecord = db
      .prepare("SELECT * FROM uploads WHERE id = ?")
      .get(id) as any;

    if (
      fileRecord &&
      fileRecord.data &&
      fileRecord.data.startsWith("/uploads/")
    ) {
      const filePath = path.join(process.cwd(), "public", fileRecord.data);
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (e) {
          console.error("Failed to delete file from disk", e);
        }
      }
    }

    db.prepare("DELETE FROM uploads WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
