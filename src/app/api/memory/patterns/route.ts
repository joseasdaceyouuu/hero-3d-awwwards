import { NextRequest, NextResponse } from "next/server";
import { getPatterns } from "@/lib/memory-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") || undefined;
    const vertical = searchParams.get("vertical") || undefined;
    const minImportance = searchParams.get("minImportance")
      ? parseInt(searchParams.get("minImportance")!)
      : undefined;

    const patterns = getPatterns({ category, vertical, minImportance });
    return NextResponse.json({ patterns });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read patterns", details: String(error) },
      { status: 500 }
    );
  }
}
