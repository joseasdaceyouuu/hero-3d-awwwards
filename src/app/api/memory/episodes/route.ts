import { NextResponse } from "next/server";
import { getEpisodes } from "@/lib/memory-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const episodes = getEpisodes();
    return NextResponse.json({ episodes });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read episodes", details: String(error) },
      { status: 500 }
    );
  }
}
