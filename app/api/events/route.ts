import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const events = db.prepare("SELECT * FROM events").all();
    const parsed = events.map((e: any) => ({
      ...e,
      participants: JSON.parse(e.participants || "[]"),
    }));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    db.prepare(
      `
      INSERT INTO events (id, title, date, startTime, endTime, type, description, participants)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      event.id,
      event.title,
      event.date,
      event.startTime,
      event.endTime,
      event.type,
      event.description || "",
      JSON.stringify(event.participants || []),
    );
    return NextResponse.json(event);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}
