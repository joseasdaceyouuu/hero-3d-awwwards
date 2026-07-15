import { NextResponse } from "next/server";
import { getStats } from "@/lib/memory-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read memory stats", details: String(error) },
      { status: 500 }
    );
  }
}
