import { NextResponse } from "next/server";
import { getDay, isDayId } from "@/data/routine";
import {
  getPreferencesForDay,
  upsertPreferences,
  type PreferenceUpdate,
} from "@/lib/preferences";

type Params = { params: Promise<{ dayId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { dayId } = await params;
    if (!isDayId(dayId)) {
      return NextResponse.json({ error: "Invalid dayId" }, { status: 400 });
    }

    const preferences = await getPreferencesForDay(dayId);
    return NextResponse.json({ preferences });
  } catch (err) {
    console.error("GET /api/preferences/[dayId]", err);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { dayId } = await params;
    if (!isDayId(dayId) || !getDay(dayId)) {
      return NextResponse.json({ error: "Invalid dayId" }, { status: 400 });
    }

    const body = (await request.json()) as {
      exercises?: PreferenceUpdate[];
    };

    if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
      return NextResponse.json(
        { error: "exercises array required" },
        { status: 400 },
      );
    }

    for (const item of body.exercises) {
      if (!item || typeof item.exerciseId !== "string") {
        return NextResponse.json(
          { error: "Each exercise needs exerciseId" },
          { status: 400 },
        );
      }
    }

    const preferences = await upsertPreferences(dayId, body.exercises);
    return NextResponse.json({ preferences });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save";
    if (message.startsWith("Unknown exerciseId")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("PUT /api/preferences/[dayId]", err);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }
}
