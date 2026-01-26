import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let prompts;
    if (category) {
      prompts = db
        .prepare(
          "SELECT * FROM prompts WHERE category = ? ORDER BY timestamp DESC",
        )
        .all(category);
    } else {
      prompts = db
        .prepare("SELECT * FROM prompts ORDER BY timestamp DESC")
        .all();
    }
    const parsed = prompts.map((p: any) => ({
      ...p,
      isDefault: p.isDefault === 1,
    }));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const prompt = await request.json();
    if (prompt.isDefault) {
      db.prepare("UPDATE prompts SET isDefault = 0 WHERE category = ?").run(
        prompt.category,
      );
    }
    db.prepare(
      `
      INSERT INTO prompts (id, name, content, isDefault, timestamp, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      prompt.id,
      prompt.name,
      prompt.content,
      prompt.isDefault ? 1 : 0,
      prompt.timestamp,
      prompt.category,
    );
    return NextResponse.json(prompt);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 },
    );
  }
}
