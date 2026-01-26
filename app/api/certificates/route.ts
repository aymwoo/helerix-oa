import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get requester info
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roles = JSON.parse(user.roles || "[]");
    const isAdmin = roles.includes("系统管理员");

    let certs;
    if (isAdmin) {
      // Admins see everything
      certs = db
        .prepare("SELECT * FROM certificates ORDER BY timestamp DESC")
        .all();
    } else {
      // Regular users see only their own
      certs = db
        .prepare(
          "SELECT * FROM certificates WHERE userId = ? ORDER BY timestamp DESC",
        )
        .all(userId);
    }

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
    const userIdFromHeader = request.headers.get("x-user-id");

    // Use userId from body (passed from client) or fallback to header
    const userId = cert.userId || userIdFromHeader;

    db.prepare(
      `
      INSERT INTO certificates (id, name, issuer, issueDate, level, category, credentialUrl, hours, timestamp, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      userId,
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
