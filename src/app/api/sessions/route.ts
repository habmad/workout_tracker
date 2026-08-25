import { NextResponse } from "next/server";
import { isDayId } from "@/data/routine";
import { getOrCreateTodaySession } from "@/lib/sessions";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { dayId?: string };
    const dayId = body.dayId;

    if (!dayId || !isDayId(dayId)) {
      return NextResponse.json({ error: "Invalid dayId" }, { status: 400 });
    }

    const bundle = await getOrCreateTodaySession(dayId);
    return NextResponse.json(bundle);
  } catch (err) {
    console.error("POST /api/sessions", err);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 },
    );
  }
}
