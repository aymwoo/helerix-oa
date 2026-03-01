import { NextRequest, NextResponse } from "next/server";
import { getFeishuEvents, createFeishuEvent } from "@/lib/feishu";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") || undefined;
    const endDate = url.searchParams.get("endDate") || undefined;

    const events = await getFeishuEvents(startDate, endDate);
    return NextResponse.json(events);
  } catch (err: any) {
    console.error("Feishu API Error (GET):", err.message);
    return NextResponse.json(
      { error: "Failed to fetch events", details: err.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    const createdEvent = await createFeishuEvent(event);
    
    // For convenience in UI, we can just return the event struct it expected,
    // although technically Feishu provides a new ID. The frontend handles it.
    // It's better to return success since the frontend might rely on the returned structure or just refetch.
    return NextResponse.json({ success: true, event: createdEvent });
  } catch (err: any) {
    console.error("Feishu API Error (POST):", err.message);
    return NextResponse.json(
      { error: "Failed to create event", details: err.message },
      { status: 500 },
    );
  }
}
