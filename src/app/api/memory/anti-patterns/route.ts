import { NextResponse } from "next/server";
import { getAntiPatterns } from "@/lib/memory-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const antiPatterns = getAntiPatterns();
    return NextResponse.json({ anti_patterns: antiPatterns });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read anti-patterns", details: String(error) },
      { status: 500 }
    );
  }
}
