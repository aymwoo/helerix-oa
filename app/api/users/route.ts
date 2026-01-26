import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const users = db.prepare("SELECT * FROM users").all();
    const parsed = users.map((u: any) => ({
      ...u,
      roles: JSON.parse(u.roles || "[]"),
      expertise: JSON.parse(u.expertise || "[]"),
    }));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await request.json();

    // Check if this is the first user - make them admin
    const count = (
      db.prepare("SELECT COUNT(*) as count FROM users").get() as any
    ).count;
    if (count === 0 && !user.roles.includes("系统管理员")) {
      user.roles = [...user.roles, "系统管理员"];
    }

    // Handle optional email: Generate unique placeholder if empty
    // Schema enforces UNIQUE NOT NULL, so we use a specific pattern
    if (!user.email) {
      user.email = `no_email_${Date.now()}_${Math.floor(Math.random() * 100000)}@helerix.internal`;
    }

    db.prepare(
      `
      INSERT INTO users (id, name, email, roles, department, status, avatarUrl, bio, phone, password, joinDate, expertise)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      user.id,
      user.name,
      user.email,
      JSON.stringify(user.roles),
      user.department,
      user.status,
      user.avatarUrl,
      user.bio || "",
      user.phone || "",
      user.password || "123456", // Default password if empty
      user.joinDate || "",
      JSON.stringify(user.expertise || []),
    );

    // Return the user with potentially updated roles
    const savedUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(user.id) as any;
    savedUser.roles = JSON.parse(savedUser.roles || "[]");
    savedUser.expertise = JSON.parse(savedUser.expertise || "[]");
    return NextResponse.json(savedUser);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
