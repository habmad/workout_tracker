import { NextResponse } from "next/server";
import { getSessionBundle } from "@/lib/sessions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const bundle = await getSessionBundle(id);

    if (!bundle) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(bundle);
  } catch (err) {
    console.error("GET /api/sessions/[id]", err);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 },
    );
  }
}
