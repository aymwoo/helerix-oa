import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const types = db.prepare("SELECT * FROM event_types").all();
    return NextResponse.json(types);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch event types" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const type = await request.json();
    const id = type.id || `et_${Date.now()}`;
    db.prepare(
      "INSERT INTO event_types (id, name, colorClass) VALUES (?, ?, ?)",
    ).run(id, type.name, type.colorClass);
    return NextResponse.json({ id, ...type });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create event type" },
      { status: 500 },
    );
  }
}
