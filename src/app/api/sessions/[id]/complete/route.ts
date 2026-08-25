import { NextResponse } from "next/server";
import { completeSession } from "@/lib/sessions";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await completeSession(id);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("POST /api/sessions/[id]/complete", err);
    return NextResponse.json(
      { error: "Failed to complete session" },
      { status: 500 },
    );
  }
}
