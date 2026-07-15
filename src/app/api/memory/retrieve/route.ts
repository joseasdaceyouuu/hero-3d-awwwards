import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

const RETRIEVE_SCRIPT = path.join(
  process.cwd(),
  "skills",
  "hero-3d-awwwards",
  "scripts",
  "retrieve.py"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brief, vertical, archetype, stack } = body;

    if (!brief || typeof brief !== "string") {
      return NextResponse.json(
        { error: "brief is required and must be a string" },
        { status: 400 }
      );
    }

    // Call Python retrieve.py with JSON via stdin
    const input = JSON.stringify({ brief, vertical: vertical || "", archetype: archetype || "", stack: stack || "" });

    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn("python3", [RETRIEVE_SCRIPT], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Python script exited with code ${code}. stderr: ${stderr}`));
        }
      });
      proc.on("error", (err) => {
        reject(err);
      });

      proc.stdin.write(input);
      proc.stdin.end();
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Retrieval failed", details: String(error) },
      { status: 500 }
    );
  }
}
