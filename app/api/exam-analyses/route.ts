import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const analyses = db
      .prepare("SELECT * FROM exam_analyses ORDER BY timestamp DESC")
      .all();
    const parsed = analyses.map((a: any) => ({
      ...a,
      knowledgePoints: JSON.parse(a.knowledgePoints || "[]"),
      itemAnalysis: JSON.parse(a.itemAnalysis || "[]"),
    }));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch exam analyses" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const analysis = await request.json();
    db.prepare(
      `
      INSERT INTO exam_analyses (id, timestamp, subject, title, grade, difficulty, summary, knowledgePoints, itemAnalysis, teachingAdvice, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      analysis.id,
      analysis.timestamp,
      analysis.subject,
      analysis.title,
      analysis.grade,
      analysis.difficulty,
      analysis.summary,
      JSON.stringify(analysis.knowledgePoints),
      JSON.stringify(analysis.itemAnalysis),
      analysis.teachingAdvice,
      analysis.imageUrl || "",
    );
    return NextResponse.json(analysis);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create exam analysis" },
      { status: 500 },
    );
  }
}
