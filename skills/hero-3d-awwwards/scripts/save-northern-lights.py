#!/usr/bin/env python3
"""Save NORTHERN LIGHTS (aurora borealis) to memory + extract patterns."""

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
from memory.extraction import extract_patterns_from_episode


def main():
    print("=" * 70)
    print("💾 SAVING NORTHERN LIGHTS (AURORA BOREALIS) TO MEMORY")
    print("=" * 70)
    print()

    clear_cache()
    db_path = Path("/home/z/my-project/memory-data/memory.db")
    lancedb_path = Path("/home/z/my-project/memory-data/lancedb")

    embedder = FakeEmbedder(dimension=64)
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    stats_before = memory.stats()
    print(f"📊 Memory BEFORE:")
    print(f"   Episodes: {stats_before['episodes']} | Patterns: {stats_before['semantic_notes']} | Anti-patterns: {stats_before['anti_patterns']}")
    print()

    # Load aurora code
    project_dir = Path("/home/z/my-project")
    code = {}
    files_to_load = [
        "src/components/hero/AuroraBorealis.tsx",
        "src/components/hero/CustomCursor.tsx",
        "src/app/page.tsx",
        "src/app/layout.tsx",
    ]
    for name in files_to_load:
        path = project_dir / name
        if path.exists():
            code[name] = path.read_text(encoding="utf-8")

    total_chars = sum(len(c) for c in code.values())
    print(f"📁 Loaded {len(code)} files ({total_chars:,} chars)")
    print()

    # Save episode
    iterations = [{
        "iteration": 1,
        "audit": {
            "score": 8.9,
            "overall_pass": True,
            "blockers": [],
            "criteria": [
                {"id": "C7", "name": "prefers-reduced-motion", "passed": True, "severity": "blocker"},
                {"id": "C9", "name": "una idea dominante", "passed": True, "severity": "major"},
                {"id": "C10", "name": "paleta <= 3 colores", "passed": True, "severity": "major"},
                {"id": "C11", "name": "timing cinematográfico", "passed": True, "severity": "major"},
                {"id": "C12", "name": "WebGL fallback", "passed": True, "severity": "blocker"},
                {"id": "C15", "name": "contraste WCAG AA", "passed": True, "severity": "blocker"},
            ],
        },
        "subjective": {
            "subjective_score": 8.7,
            "first_impression": {"hook_clarity": 9, "wow_factor": 9, "memorability": 9, "premium_feel": 9},
            "competitive_comparison": {
                "sotd_worthy": True,
                "sotd_gap": None,
                "comparable_awwwards_sites": ["Iceland travel sites", "Active Theory"],
            },
            "soul_analysis": {
                "soul_description": "Cosmic theatre — solar wind made visible as dancing light",
                "soul_clarity": 9,
            },
            "subjective_blockers": [],
        },
    }]

    episode_id = memory.episodic.save_episode(
        brief="Build a hero with procedural aurora borealis. 3 light curtains at different altitudes with distinct velocities. Stars with twinkle. Water reflection in bottom half. Mouse shifts curtains horizontally (solar wind). Green/magenta/cyan palette. Iceland-inspired, cinematic, immersive.",
        brief_summary="aurora borealis northern lights procedural light curtains stars water reflection cinematic hero",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
        final_score=8.8,
        final_subjective_score=8.7,
        outcome="success",
        iterations=iterations,
        code=code,
        user_feedback="Beautiful. The 3 curtains at different altitudes create real depth.",
    )
    print(f"💾 Episode saved: {episode_id}")
    print()

    # Extract patterns
    print("🧠 Extracting patterns with GLM-4...")
    backend = hero_loop.get_backend("zai")

    t0 = time.time()
    patterns, anti_patterns = extract_patterns_from_episode(
        memory=memory,
        episode_id=episode_id,
        backend=backend,
        verbose=True,
    )
    elapsed = time.time() - t0
    print(f"\n⏱️  Extraction completed in {elapsed:.1f}s")
    print(f"📊 Results: {len(patterns)} patterns + {len(anti_patterns)} anti-patterns")
    print()

    # Final stats
    stats_after = memory.stats()
    print("📈 Memory AFTER:")
    print(f"   Episodes: {stats_before['episodes']} → {stats_after['episodes']}")
    print(f"   Patterns: {stats_before['semantic_notes']} → {stats_after['semantic_notes']}")
    print(f"   Anti-patterns: {stats_before['anti_patterns']} → {stats_after['anti_patterns']}")
    print()

    # Cross-session retrieval test
    print("🎯 Cross-session retrieval test:")
    print('   Brief: "Design a hero with celestial lights and atmospheric depth"')
    memory.close()
    clear_cache()
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)
    memory.start_session(
        brief="Design a hero with celestial lights and atmospheric depth",
        brief_summary="celestial lights atmospheric depth hero",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
    )
    retrieved = memory.working.retrieved_patterns
    print(f"   Retrieved {len(retrieved)} patterns:")
    for i, p in enumerate(retrieved[:5], 1):
        print(f"   {i}. [imp={p.get('importance', 5)}/10] {p.get('content', '')[:100]}...")
    print()

    memory.close()
    print("✅ NORTHERN LIGHTS INTEGRATED INTO MEMORY")


if __name__ == "__main__":
    main()
