import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cert = db.prepare("SELECT * FROM certificates WHERE id = ?").get(id);
    if (!cert) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(cert);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch certificate" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cert = await request.json();
    db.prepare(
      `
      UPDATE certificates SET name=?, issuer=?, issueDate=?, level=?, category=?, credentialUrl=?, hours=?, timestamp=?
      WHERE id=?
    `,
    ).run(
      cert.name,
      cert.issuer,
      cert.issueDate,
      cert.level,
      cert.category,
      cert.credentialUrl || "",
      cert.hours || 0,
      cert.timestamp,
      id,
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update certificate" },
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
    db.prepare("DELETE FROM certificates WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete certificate" },
      { status: 500 },
    );
  }
}
