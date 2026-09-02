import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics";

export async function GET() {
  try {
    const payload = await getAnalytics();
    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/analytics", err);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
