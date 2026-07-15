#!/usr/bin/env python3
"""
consult-creator.py — Consulta el Creator agent con el brief + patrones de memoria.

No genera código — pide al Creator un plan técnico + decisiones clave
basándose en el brief del usuario y los patrones extraídos del COSMIC RESONANCE.
"""

import importlib.util
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPTS_DIR))

# Load hero-loop
spec = importlib.util.spec_from_file_location("hero_loop", SCRIPTS_DIR / "hero-loop.py")
hero_loop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hero_loop)

from memory import MemorySystem, FakeEmbedder, clear_cache
from memory.extraction import extract_patterns_from_episode


def main():
    # User brief
    user_brief = """Build a hero section with VOLUMETRIC FOG + GOD RAYS for a creative studio.
Atmospheric, cinematic, immersive. Style references: Blade Runner 2049, Active Theory.

Requirements:
- Procedural volumetric fog in fragment shader (NOT a static image)
- God rays / light shafts cutting through the fog
- A headline silhouette that emerges from the mist (mask + fog interaction)
- Mouse interaction: cursor pushes the fog away radially
- Deep depth: multiple fog layers at different Z distances
- Palette: amber/sepia + deep black (no bright colors, film-like)
- Cinematic letterbox bars top/bottom that open on scroll
- 60fps target on mobile (use shader, not particle system)
- prefers-reduced-motion fallback: static fog gradient

Technical constraints:
- Stack: React Three Fiber (Next.js 16)
- NO particle system (fog is pure shader)
- NO post-processing library (do god rays in fragment shader directly)
- DPR clamp [1, 2]
- 1 canvas only"""

    print("=" * 70)
    print("CONSULTING CREATOR AGENT (GLM-4 real)")
    print("=" * 70)
    print()
    print(f"Brief: Volumetric Fog + God Rays hero")
    print()

    # Setup memory to retrieve patterns
    clear_cache()
    memory = MemorySystem(
        db_path=Path("/home/z/my-project/memory-data/memory.db"),
        lancedb_path=Path("/home/z/my-project/memory-data/lancedb"),
        embedder=FakeEmbedder(dimension=64),
    )

    memory.start_session(
        brief=user_brief,
        brief_summary="volumetric fog god rays cinematic atmospheric immersive hero",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
    )

    patterns = memory.working.retrieved_patterns
    anti_patterns = memory.working.retrieved_anti_patterns

    print(f"Retrieved from memory: {len(patterns)} patterns, {len(anti_patterns)} anti-patterns")
    print()

    memory.close()

    # Build Creator prompt
    skill_context = hero_loop.load_skill_context()
    system_prompt = hero_loop.load_prompt_template("creator")

    # Format memory context
    memory_block = "\n# Memory Context (from past sessions)\n"
    memory_block += "Apply these patterns/skills/anti-patterns if relevant.\n\n"
    if patterns:
        memory_block += "## Relevant Patterns (semantic memory)\n"
        for p in patterns[:5]:
            memory_block += f"- [imp={p.get('importance', 5)}/10] {p.get('content', '')}\n"
        memory_block += "\n"
    if anti_patterns:
        memory_block += "## Known Pitfalls (avoid these)\n"
        for ap in anti_patterns[:3]:
            memory_block += f"- [seen={ap.get('occurrence_count', 1)}x] {ap.get('description', '')}\n"
        memory_block += "\n"

    user_prompt = f"""# User Request
{user_brief}

# Skill Context
{skill_context}
{memory_block}
# Task
This is iteration 1. I need you to output:

1. A brief technical manifest (archetype, stack, palette, timing, asset list)
2. The key shader technique you'll use for volumetric fog + god rays
   (specifically: how to fake god rays in a single fragment shader without
   post-processing — explain the math approach)
3. The component structure (which React components, what each does)
4. Any risks or performance concerns

DO NOT write full code yet — I want the technical plan first so I can review
the approach. Output 200-400 words.
"""

    print("Calling Creator agent (this takes 30-60s)...")
    print()

    backend = hero_loop.get_backend("zai")
    response = backend.complete(system_prompt, user_prompt, temperature=0.7)

    print("=" * 70)
    print("CREATOR AGENT RESPONSE")
    print("=" * 70)
    print()
    print(response)
    print()

    # Save response for reference
    output_path = Path("/home/z/my-project/download/creator-volumetric-fog-plan.md")
    output_path.write_text(response, encoding="utf-8")
    print(f"💾 Saved to: {output_path}")


if __name__ == "__main__":
    main()
