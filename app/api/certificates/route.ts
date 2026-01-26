import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const certs = db
      .prepare("SELECT * FROM certificates ORDER BY timestamp DESC")
      .all();
    return NextResponse.json(certs);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cert = await request.json();
    db.prepare(
      `
      INSERT INTO certificates (id, name, issuer, issueDate, level, category, credentialUrl, hours, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      cert.id,
      cert.name,
      cert.issuer,
      cert.issueDate,
      cert.level,
      cert.category,
      cert.credentialUrl || "",
      cert.hours || 0,
      cert.timestamp,
    );
    return NextResponse.json(cert);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create certificate" },
      { status: 500 },
    );
  }
}
