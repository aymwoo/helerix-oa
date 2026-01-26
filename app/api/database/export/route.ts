import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const buffer = db.serialize();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename=helerix_backup_${new Date().toISOString().slice(0, 10)}.db`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to export database" },
      { status: 500 },
    );
  }
}
