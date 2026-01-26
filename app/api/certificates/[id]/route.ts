import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get requester info
    const requester = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    if (!requester) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const isAdmin = JSON.parse(requester.roles || "[]").includes("系统管理员");

    const cert = db
      .prepare("SELECT * FROM certificates WHERE id = ?")
      .get(id) as any;
    if (!cert) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 },
      );
    }

    // Check ownership
    if (!isAdmin && cert.userId && cert.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const certData = await request.json();
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get requester info
    const requester = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    if (!requester)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    const isAdmin = JSON.parse(requester.roles || "[]").includes("系统管理员");

    // Get existing cert to check ownership
    const existing = db
      .prepare("SELECT * FROM certificates WHERE id = ?")
      .get(id) as any;
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isAdmin && existing.userId && existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    db.prepare(
      `
      UPDATE certificates SET name=?, issuer=?, issueDate=?, level=?, category=?, credentialUrl=?, hours=?, timestamp=?
      WHERE id=?
    `,
    ).run(
      certData.name,
      certData.issuer,
      certData.issueDate,
      certData.level,
      certData.category,
      certData.credentialUrl || "",
      certData.hours || 0,
      certData.timestamp,
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
    const userId = request.headers.get("x-user-id");

    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requester = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    const isAdmin =
      requester && JSON.parse(requester.roles || "[]").includes("系统管理员");

    const existing = db
      .prepare("SELECT * FROM certificates WHERE id = ?")
      .get(id) as any;
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isAdmin && existing.userId && existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
