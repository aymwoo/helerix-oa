import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    user.roles = JSON.parse(user.roles || "[]");
    user.expertise = JSON.parse(user.expertise || "[]");
    return NextResponse.json(user);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch user" },
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
    const user = await request.json();
    db.prepare(
      `
      UPDATE users SET name=?, email=?, roles=?, department=?, status=?, avatarUrl=?, bio=?, phone=?, password=?, joinDate=?, expertise=?
      WHERE id=?
    `,
    ).run(
      user.name,
      user.email,
      JSON.stringify(user.roles),
      user.department,
      user.status,
      user.avatarUrl,
      user.bio || "",
      user.phone || "",
      user.password,
      user.joinDate || "",
      JSON.stringify(user.expertise || []),
      id,
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update user" },
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
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}
