#!/usr/bin/env python3
"""
audit-heroes.py — Audita los 3 heroes existentes contra los estándares 2026.

Para cada hero:
  1. Carga el código real desde src/
  2. Llama al Auditor agent (GLM-4) con el checklist + estándares 2026
  3. Parsea el resultado JSON
  4. Reporta qué criterios pasan/fallan

Output: reporte comparativo de los 3 heroes.
"""

import importlib.util
import json
import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPTS_DIR))

# Load hero-loop for backend
spec = importlib.util.spec_from_file_location("hero_loop", SCRIPTS_DIR / "hero-loop.py")
hero_loop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hero_loop)


def load_hero_code(hero_name: str) -> dict[str, str]:
    """Load code for a specific hero from src/."""
    project_dir = Path("/home/z/my-project")
    code = {}

    if hero_name == "cosmic":
        files = [
            "src/components/hero/CosmicBackground.tsx",
            "src/components/hero/ParticleField.tsx",
            "src/components/hero/DistortedText.tsx",
            "src/components/hero/CustomCursor.tsx",
        ]
    elif hero_name == "silent":
        files = [
            "src/components/hero/VolumetricFog.tsx",
            "src/components/hero/EmergentSilhouette.tsx",
            "src/components/hero/CustomCursor.tsx",
        ]
    elif hero_name == "northern":
        files = [
            "src/components/hero/AuroraBorealis.tsx",
            "src/components/hero/CustomCursor.tsx",
        ]
    else:
        return {}

    for name in files:
        path = project_dir / name
        if path.exists():
            code[name] = path.read_text(encoding="utf-8")

    # Also load page.tsx and layout.tsx (shared)
    for name in ["src/app/page.tsx", "src/app/layout.tsx"]:
        path = project_dir / name
        if path.exists():
            code[name] = path.read_text(encoding="utf-8")

    return code


def build_audit_prompt(hero_name: str, code: dict[str, str], audit_checklist: str) -> tuple[str, str]:
    """Build (system, user) prompt for auditing a hero."""
    system = """You are the **Auditor Agent** for the hero-3d-awwwards skill.

Your job: evaluate a hero section's code against the 2026 web standards checklist.
Output STRICT JSON only — no prose, no markdown fences.

Output schema:
{
  "hero_name": "string",
  "overall_score": 0-10,
  "overall_pass": boolean,
  "criteria_results": [
    {
      "id": "string (e.g., C7, C10, PERF-1, A11Y-1)",
      "name": "string",
      "passed": boolean,
      "evidence": "string (cite specific code lines or patterns)",
      "fix_hint": "string or null"
    }
  ],
  "critical_failures": ["list of criterion IDs that critically fail"],
  "strengths": ["list of things the hero does well"],
  "recommendation": "deliver | continue_loop | major_rework"
}

Evaluate against these categories:

**Skill Checklist (C1-C26):**
- C5: DPR clamp [1, 2]
- C7: prefers-reduced-motion respected
- C9: One dominant idea (no competing effects)
- C10: Palette ≤ 3 colors
- C11: Cinematic timing (1.2s+, power3.out/power4.out, no linear)
- C12: WebGL fallback present
- C15: WCAG AA contrast (4.5:1)
- C16: Semantic HTML (h1, p, a)
- C18: Keyboard navigation (focus-visible)

**2026 Standards (from web-2026-standards.md):**
- PERF-1: Pause render loop when offscreen (IntersectionObserver)
- PERF-2: GLB < 2MB (if 3D models used)
- PERF-3: Draco compression (if geometry used)
- PERF-4: KTX2 textures (if textures used)
- PERF-5: Lazy-load / Suspense for async assets
- A11Y-1: Contrast 4.5:1 for solar legibility
- A11Y-2: WebGPU/WebGL fallback (no blank screen)
- A11Y-3: Keyboard navigation in 3D scene
- CLARITY-1: Every element justifies its existence (no decorative noise)
- CLARITY-2: One CTA per section (no dilution)
- MOTION-1: Movement serves purpose (no ad-hoc animation)
- TSL-1: Uses TSL or notes WebGPU readiness

Be strict but fair. Cite specific code evidence. If you can't find evidence
for a criterion, mark it as "passed: false" with evidence "Not found in code".
"""

    code_block = ""
    for path, content in code.items():
        # Truncate very long files
        lines = content.split("\n")
        if len(lines) > 300:
            code_block += f"\n### {path} (truncated, {len(lines)} lines total)\n```\n"
            code_block += "\n".join(lines[:300])
            code_block += f"\n... ({len(lines) - 300} more lines)\n```\n"
        else:
            code_block += f"\n### {path}\n```\n{content}\n```\n"

    user = f"""# Hero to Audit: {hero_name.upper()}

# Code
{code_block}

# Task
Audit this hero against the 2026 web standards. Output strict JSON.
Be specific with evidence — cite file names and line patterns.
"""
    return system, user


def parse_audit_output(output: str) -> dict | None:
    """Parse auditor JSON output."""
    output = output.strip()
    # Strip markdown fences
    if output.startswith("```"):
        lines = output.split("\n")[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        output = "\n".join(lines)

    try:
        return json.loads(output)
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse error: {e}")
        print(f"  Output preview: {output[:300]}...")
        return None


def main():
    print("=" * 70)
    print("🔍 AUDITING 3 HEROES AGAINST 2026 STANDARDS")
    print("=" * 70)
    print()

    backend = hero_loop.get_backend("zai-direct", "glm-5.2")

    # Load audit checklist for reference
    checklist_path = SCRIPTS_DIR.parent / "references" / "audit-checklist.md"
    audit_checklist = checklist_path.read_text(encoding="utf-8") if checklist_path.exists() else ""

    heroes = [
        ("COSMIC RESONANCE", "cosmic"),
        ("SILENT LIGHT", "silent"),
        ("NORTHERN LIGHTS", "northern"),
    ]

    results = {}

    for hero_name, hero_key in heroes:
        print(f"━" * 70)
        print(f"AUDITING: {hero_name}")
        print(f"━" * 70)

        # Load code
        code = load_hero_code(hero_key)
        total_chars = sum(len(c) for c in code.values())
        print(f"  📁 Loaded {len(code)} files ({total_chars:,} chars)")

        # Build prompt
        system, user = build_audit_prompt(hero_name, code, audit_checklist)

        # Call LLM
        print(f"  🧠 Calling GLM-4 auditor...")
        t0 = time.time()
        try:
            output = backend.complete(system, user, temperature=0.2)
            elapsed = time.time() - t0
            print(f"  ⏱️  Done in {elapsed:.1f}s")
        except Exception as e:
            print(f"  ❌ LLM call failed: {e}")
            results[hero_name] = {"error": str(e)}
            continue

        # Parse
        audit = parse_audit_output(output)
        if audit is None:
            results[hero_name] = {"error": "parse_failed", "raw": output[:500]}
            continue

        results[hero_name] = audit

        # Print summary
        score = audit.get("overall_score", 0)
        passed = audit.get("overall_pass", False)
        criteria = audit.get("criteria_results", [])
        passed_count = sum(1 for c in criteria if c.get("passed"))
        failed_count = sum(1 for c in criteria if not c.get("passed"))
        critical = audit.get("critical_failures", [])

        print(f"  📊 Score: {score}/10 | Pass: {passed}")
        print(f"  ✅ Passed: {passed_count} | ❌ Failed: {failed_count}")
        print(f"  🚨 Critical failures: {len(critical)}")
        if critical:
            print(f"     {', '.join(critical)}")
        print()

        # Print failed criteria
        if failed_count > 0:
            print(f"  ❌ FAILED CRITERIA:")
            for c in criteria:
                if not c.get("passed"):
                    cid = c.get("id", "?")
                    cname = c.get("name", "?")
                    hint = c.get("fix_hint", "")
                    print(f"     {cid}: {cname}")
                    if hint:
                        print(f"       → {hint[:100]}")
            print()

        # Print strengths
        strengths = audit.get("strengths", [])
        if strengths:
            print(f"  ✅ STRENGTHS:")
            for s in strengths[:3]:
                print(f"     + {s[:100]}")
            print()

    # === COMPARATIVE SUMMARY ===
    print("=" * 70)
    print("📊 COMPARATIVE SUMMARY")
    print("=" * 70)
    print()

    print(f"{'Hero':<25} {'Score':<8} {'Pass':<6} {'Passed':<8} {'Failed':<8} {'Critical':<10}")
    print("-" * 75)
    for hero_name, _ in heroes:
        r = results.get(hero_name, {})
        if "error" in r:
            print(f"{hero_name:<25} {'ERROR':<8} {'-':<6} {'-':<8} {'-':<8} {'-':<10}")
        else:
            score = r.get("overall_score", 0)
            passed = "✅" if r.get("overall_pass") else "❌"
            criteria = r.get("criteria_results", [])
            p = sum(1 for c in criteria if c.get("passed"))
            f = sum(1 for c in criteria if not c.get("passed"))
            crit = len(r.get("critical_failures", []))
            print(f"{hero_name:<25} {score:<8.1f} {passed:<6} {p:<8} {f:<8} {crit:<10}")

    print()

    # Save full report
    report_path = Path("/home/z/my-project/download/audit-report.json")
    report_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"📋 Full report saved: {report_path}")

    # Save markdown summary
    md_path = Path("/home/z/my-project/download/audit-report.md")
    md_lines = ["# Hero Audit Report — 2026 Standards\n"]
    for hero_name, _ in heroes:
        r = results.get(hero_name, {})
        md_lines.append(f"## {hero_name}\n")
        if "error" in r:
            md_lines.append(f"**ERROR**: {r['error']}\n")
            continue
        md_lines.append(f"- **Score**: {r.get('overall_score', 0)}/10")
        md_lines.append(f"- **Overall pass**: {r.get('overall_pass', False)}")
        md_lines.append(f"- **Critical failures**: {r.get('critical_failures', [])}\n")
        md_lines.append("### Criteria Results\n")
        md_lines.append("| ID | Name | Passed | Evidence |")
        md_lines.append("|---|---|---|---|")
        for c in r.get("criteria_results", []):
            status = "✅" if c.get("passed") else "❌"
            ev = c.get("evidence", "")[:80].replace("|", "\\|")
            md_lines.append(f"| {c.get('id', '?')} | {c.get('name', '?')} | {status} | {ev} |")
        md_lines.append("")
        strengths = r.get("strengths", [])
        if strengths:
            md_lines.append("### Strengths\n")
            for s in strengths:
                md_lines.append(f"- {s}")
            md_lines.append("")
    md_path.write_text("\n".join(md_lines), encoding="utf-8")
    print(f"📋 Markdown report: {md_path}")
    print()
    print("=" * 70)
    print("✅ AUDIT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
