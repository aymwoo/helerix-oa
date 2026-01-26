import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const provider = await request.json();
    const userId = request.headers.get("x-user-id");

    const requester = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    const isAdmin =
      requester && JSON.parse(requester.roles || "[]").includes("系统管理员");

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can edit providers" },
        { status: 403 },
      );
    }

    db.prepare(
      `
      UPDATE ai_providers 
      SET name=?, baseUrl=?, apiKey=?, modelId=?, timestamp=?
      WHERE id=?
    `,
    ).run(
      provider.name,
      provider.baseUrl,
      provider.apiKey,
      provider.modelId,
      provider.timestamp || Date.now(),
      id,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update provider" },
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

    const requester = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    const isAdmin =
      requester && JSON.parse(requester.roles || "[]").includes("系统管理员");

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can delete providers" },
        { status: 403 },
      );
    }

    db.prepare("DELETE FROM ai_providers WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete provider" },
      { status: 500 },
    );
  }
}
