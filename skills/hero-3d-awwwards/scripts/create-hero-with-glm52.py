#!/usr/bin/env python3
"""
create-hero-with-glm52.py — Creator agent (GLM-5.2) genera un hero usando
patrones aprendidos de los 3 heroes anteriores + estándares 2026.

Este es el test real del sistema de aprendizaje: ¿puede el Creator
usar los patrones inyectados para generar código mejor que manualmente?
"""

import importlib.util
import json
import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPTS_DIR))

spec = importlib.util.spec_from_file_location("hero_loop", SCRIPTS_DIR / "hero-loop.py")
hero_loop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hero_loop)

from memory import MemorySystem, FakeEmbedder, clear_cache


def main():
    print("=" * 70)
    print("🧠 CREATOR AGENT (GLM-5.2) — HERO GENERADO CON MEMORIA INYECTADA")
    print("=" * 70)
    print()

    user_brief = """Build a hero with LIQUID METAL CHROME material.

Requirements:
- Procedural chrome/mercury surface in fragment shader (NOT a static image)
- Real-time reflections simulated via environment mapping in shader
- Mouse distorts the metal surface like physical contact (ripple effect)
- Depth via multiple reflection layers at different Z
- Palette: silver/chrome + deep black + single accent (choose wisely)
- Cinematic letterbox optional (CSS, not shader)
- 60fps target on mobile
- prefers-reduced-motion fallback
- WebGL fallback (CSS gradient)
- DPR clamp [1, 2]
- IntersectionObserver pause-offscreen (PERF-1)
- React.lazy + Suspense (PERF-5)
- focus-visible CSS (C18)
- Contrast 4.5:1 WCAG AA (C15)
- Semantic HTML (C16)
- One dominant idea (C9): the chrome surface IS the hero
- Palette <= 3 colors (C10)
- Cinematic timing 1.2s+ with power3.out (C11)

Technical stack: Next.js 16 + React Three Fiber + GSAP + Lenis
Output: Complete, runnable code for:
  1. A shader component (the chrome surface)
  2. A text component (emergent/animated headline)
  3. Integration in page.tsx

Be specific with shader code. Apply the patterns from memory where relevant.
Avoid the anti-patterns flagged in memory."""

    # Setup memory
    clear_cache()
    db_path = Path("/home/z/my-project/memory-data/memory.db")
    lancedb_path = Path("/home/z/my-project/memory-data/lancedb")

    embedder = FakeEmbedder(dimension=64)
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    memory.start_session(
        brief=user_brief,
        brief_summary="liquid metal chrome shader reflections distortion cinematic hero",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
    )

    patterns = memory.working.retrieved_patterns
    anti_patterns = memory.working.retrieved_anti_patterns

    stats = memory.stats()
    print(f"📊 Memory state: {stats['episodes']} episodes, {stats['semantic_notes']} patterns, {stats['anti_patterns']} anti-patterns")
    print(f"🎯 Retrieved for this brief: {len(patterns)} patterns, {len(anti_patterns)} anti-patterns")
    print()

    memory.close()

    # Build memory context block
    memory_block = "\n# Memory Context (from 3 past heroes + 2026 standards)\n"
    memory_block += "Apply these patterns/skills/anti-patterns if relevant.\n"
    memory_block += "These were extracted from COSMIC RESONANCE, SILENT LIGHT, NORTHERN LIGHTS,\n"
    memory_block += "and the Web 2026 Standards manuals.\n\n"

    if patterns:
        memory_block += "## Relevant Patterns (semantic memory)\n"
        for p in patterns[:5]:
            memory_block += f"- [imp={p.get('importance', 5)}/10] {p.get('content', '')}\n"
        memory_block += "\n"

    if anti_patterns:
        memory_block += "## Known Pitfalls (AVOID these — detected in past audits)\n"
        for ap in anti_patterns[:3]:
            memory_block += f"- [{ap.get('failure_mode', '?')}] {ap.get('description', '')}\n"
        memory_block += "\n"

    # Also inject the 2026 standards highlights
    memory_block += """## 2026 Standards (MANDATORY)
- PERF-1: IntersectionObserver to pause render when offscreen
- PERF-5: React.lazy + Suspense for WebGL components
- C15: Text opacity >= 0.95 for WCAG AA 4.5:1
- C18: focus-visible CSS for keyboard nav
- C7: prefers-reduced-motion fallback
- C12: WebGL fallback (no blank screen)
- TSL-1: Note WebGPU readiness (even if using GLSL now)
- Clarity-First: Every pixel justifies its existence
"""

    # Load Creator system prompt
    system_prompt = hero_loop.load_prompt_template("creator")

    # Build user prompt
    user_prompt = f"""# User Request
{user_brief}
{memory_block}
# Task
Generate iteration 1 of the hero. Follow the 7-step workflow strictly.
Output the manifest, files, setup commands, and notes.

IMPORTANT: This is a REAL production hero. The code must be:
1. Complete and runnable (no TODOs, no placeholders)
2. Apply the patterns from memory where relevant
3. Avoid the anti-patterns flagged
4. Follow 2026 standards (PERF-1, PERF-5, C15, C18, C7, C12)

Output format:
## Manifest
[JSON manifest]

## Files Created
[list of files]

## Code
### `path/to/file.tsx`
```tsx
[full code]
```

## Notes
[any trade-offs or decisions made]
"""

    print("🧠 Calling Creator agent (GLM-5.2)...")
    print("   This takes 60-120s — GLM-5.2 is generating complete production code")
    print()

    backend = hero_loop.get_backend("zai-direct", "glm-5.2")

    t0 = time.time()
    response = backend.complete(system_prompt, user_prompt, temperature=0.7)
    elapsed = time.time() - t0

    print(f"⏱️  Creator completed in {elapsed:.1f}s")
    print(f"📝 Response: {len(response):,} chars")
    print()

    # Save response
    output_path = Path("/home/z/my-project/download/creator-glm52-output.md")
    output_path.write_text(response, encoding="utf-8")
    print(f"💾 Saved to: {output_path}")
    print()

    # Print summary
    print("=" * 70)
    print("CREATOR AGENT OUTPUT (preview)")
    print("=" * 70)
    print()
    print(response[:3000])
    if len(response) > 3000:
        print(f"\n... ({len(response) - 3000} more chars)")
    print()

    print("=" * 70)
    print("✅ CREATOR AGENT COMPLETE — ready to implement")
    print("=" * 70)


if __name__ == "__main__":
    main()
