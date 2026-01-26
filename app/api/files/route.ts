import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db from "@/lib/database";

// Helper to save base64 data to disk
async function saveFileToDisk(
  base64Data: string,
  fileName: string,
): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const buffer = Buffer.from(base64Data, "base64");
  // Generate unique filename to avoid collisions
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${fileName}`;
  const filePath = path.join(uploadDir, uniqueName);

  await fs.promises.writeFile(filePath, buffer);

  // Return relative path for URL access (e.g. /uploads/...)
  return `/uploads/${uniqueName}`;
}

export async function POST(request: NextRequest) {
  try {
    const file = await request.json();

    // Validate request
    if (!file.data || !file.name) {
      return NextResponse.json({ error: "Invalid file data" }, { status: 400 });
    }

    // Save to disk
    const relativePath = await saveFileToDisk(file.data, file.name);

    // Save metadata to DB (without blob data)
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(
      `
      INSERT INTO uploads (id, name, mimeType, data, size, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      file.name,
      file.mimeType,
      relativePath, // Store PATH instead of blob data
      file.size,
      Date.now(),
    );

    // Return the web-accessible URL
    // We keep the file:// protocol abstraction for frontend consistency if needed,
    // OR we could switch to returning the direct HTTP URL.
    // Given the current architecture uses `FileManager.getFile` to fetch content,
    // sticking to the abstraction layer but changing underlying storage is safer.
    // However, for performance, serving static files directly is better.
    // Let's return the ID as before to keep frontend logic stable,
    // but the GET endpoint will need to serve the file or redirect.
    return NextResponse.json({ uri: `file://${id}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
