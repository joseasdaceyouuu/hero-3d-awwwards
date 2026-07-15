import { NextResponse } from "next/server";
import { getSkills } from "@/lib/memory-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const skills = getSkills();
    return NextResponse.json({ skills });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read skills", details: String(error) },
      { status: 500 }
    );
  }
}
