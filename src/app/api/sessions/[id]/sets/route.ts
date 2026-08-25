import { NextResponse } from "next/server";
import { upsertSetLog } from "@/lib/sessions";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id: sessionId } = await params;
    const body = (await request.json()) as {
      exerciseId?: string;
      setIndex?: number;
      reps?: number | null;
      weight?: number | null;
      note?: string | null;
    };

    if (!body.exerciseId || typeof body.setIndex !== "number") {
      return NextResponse.json(
        { error: "exerciseId and setIndex are required" },
        { status: 400 },
      );
    }

    const set = await upsertSetLog({
      sessionId,
      exerciseId: body.exerciseId,
      setIndex: body.setIndex,
      reps: body.reps ?? null,
      weight: body.weight ?? null,
      note: body.note ?? null,
    });

    return NextResponse.json({ set });
  } catch (err) {
    console.error("PUT /api/sessions/[id]/sets", err);
    return NextResponse.json(
      { error: "Failed to save set" },
      { status: 500 },
    );
  }
}
