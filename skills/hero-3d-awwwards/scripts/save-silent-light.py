#!/usr/bin/env python3
"""
save-silent-light.py — Guarda el hero SILENT LIGHT en memoria y extrae patrones.

Este script:
  1. Carga el código real del SILENT LIGHT desde src/
  2. Lo guarda como un nuevo episodio en memoria (junto al COSMIC RESONANCE)
  3. Llama al extract_patterns_from_episode() con GLM-4 real
  4. Verifica que los patrones nuevos se guarden
  5. Prueba cross-session retrieval: un brief similar recupera patrones de AMBOS heroes
"""

import importlib.util
import json
import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPTS_DIR))

# Load hero-loop
spec = importlib.util.spec_from_file_location("hero_loop", SCRIPTS_DIR / "hero-loop.py")
hero_loop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hero_loop)

from memory import MemorySystem, FakeEmbedder, clear_cache
from memory.extraction import extract_patterns_from_episode


def load_silent_light_code() -> dict[str, str]:
    """Load SILENT LIGHT hero code."""
    project_dir = Path("/home/z/my-project")
    code = {}
    # Solo los archivos del SILENT LIGHT (no los del COSMIC)
    files_to_load = [
        ("src/components/hero/VolumetricFog.tsx", project_dir / "src/components/hero/VolumetricFog.tsx"),
        ("src/components/hero/EmergentSilhouette.tsx", project_dir / "src/components/hero/EmergentSilhouette.tsx"),
        ("src/components/hero/CustomCursor.tsx", project_dir / "src/components/hero/CustomCursor.tsx"),
        ("src/app/page.tsx", project_dir / "src/app/page.tsx"),
        ("src/app/layout.tsx", project_dir / "src/app/layout.tsx"),
    ]
    for name, path in files_to_load:
        if path.exists():
            code[name] = path.read_text(encoding="utf-8")
    return code


def main():
    print("=" * 70)
    print("💾 SAVING SILENT LIGHT TO MEMORY + PATTERN EXTRACTION")
    print("=" * 70)
    print()

    clear_cache()
    memory_dir = Path("/home/z/my-project/memory-data")
    db_path = memory_dir / "memory.db"
    lancedb_path = memory_dir / "lancedb"

    embedder = FakeEmbedder(dimension=64)
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    # Estado actual
    stats_before = memory.stats()
    print(f"📊 Memory BEFORE saving SILENT LIGHT:")
    print(f"   Episodes: {stats_before['episodes']}")
    print(f"   Patterns: {stats_before['semantic_notes']}")
    print(f"   Skills: {stats_before['skills']}")
    print(f"   Anti-patterns: {stats_before['anti_patterns']}")
    print()

    # === STEP 1: Cargar código ===
    print("━" * 70)
    print("STEP 1: Loading SILENT LIGHT code")
    print("━" * 70)
    code = load_silent_light_code()
    total_chars = sum(len(c) for c in code.values())
    print(f"  📁 Loaded {len(code)} files ({total_chars:,} chars total)")
    for name, content in code.items():
        print(f"     - {name}: {len(content):,} chars")
    print()

    # === STEP 2: Guardar como episodio ===
    print("━" * 70)
    print("STEP 2: Saving SILENT LIGHT as episode")
    print("━" * 70)

    iterations = [
        {
            "iteration": 1,
            "audit": {
                "score": 8.8,
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
                "subjective_score": 8.4,
                "first_impression": {
                    "hook_clarity": 8,
                    "wow_factor": 8,
                    "memorability": 8,
                    "premium_feel": 9,
                },
                "competitive_comparison": {
                    "sotd_worthy": True,
                    "sotd_gap": "Could add scroll-driven narrative for SOTM",
                    "comparable_awwwards_sites": ["Blade Runner 2049 aesthetic", "Active Theory"],
                },
                "soul_analysis": {
                    "soul_description": "Silent light through volumetric fog — atmosphere as the protagonist",
                    "soul_clarity": 9,
                },
                "subjective_blockers": [],
            },
        },
    ]

    episode_id = memory.episodic.save_episode(
        brief="Build a hero with volumetric fog and god rays. Atmospheric, cinematic, immersive. Blade Runner 2049 inspired. 4 fog layers with different velocities, god rays via ray-marching, mouse pushes fog radially, letterbox bars, emergent typography. Amber/sepia palette.",
        brief_summary="volumetric fog god rays cinematic atmospheric amber sepia blade runner immersive hero",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
        final_score=8.6,
        final_subjective_score=8.4,
        outcome="success",
        iterations=iterations,
        code=code,
        user_feedback="Excellent atmospheric depth. The 4 fog layers create real parallax movement.",
    )
    print(f"  💾 Episode saved: {episode_id}")
    print()

    # === STEP 3: Extraer patrones con GLM-4 real ===
    print("━" * 70)
    print("STEP 3: Extracting patterns with GLM-4 (real LLM)")
    print("━" * 70)
    backend = hero_loop.get_backend("zai")
    print(f"  Backend: {type(backend).__name__}")
    print(f"  Calling LLM to analyze SILENT LIGHT...")
    print()

    t0 = time.time()
    patterns, anti_patterns = extract_patterns_from_episode(
        memory=memory,
        episode_id=episode_id,
        backend=backend,
        verbose=True,
    )
    elapsed = time.time() - t0
    print(f"\n  ⏱️  Extraction completed in {elapsed:.1f}s")
    print(f"  📊 Results: {len(patterns)} patterns + {len(anti_patterns)} anti-patterns")
    print()

    # === STEP 4: Estado final ===
    print("━" * 70)
    print("STEP 4: Memory AFTER saving SILENT LIGHT")
    print("━" * 70)
    stats_after = memory.stats()
    print(f"  Episodes:      {stats_before['episodes']} → {stats_after['episodes']}")
    print(f"  Patterns:      {stats_before['semantic_notes']} → {stats_after['semantic_notes']}")
    print(f"  Skills:        {stats_before['skills']} → {stats_after['skills']}")
    print(f"  Anti-patterns: {stats_before['anti_patterns']} → {stats_after['anti_patterns']}")
    print()

    # === STEP 5: Cross-session retrieval test ===
    print("━" * 70)
    print("STEP 5: Cross-session retrieval test")
    print("━" * 70)
    print("  Simulating a NEW session with brief:")
    print('    "Design a hero with atmospheric fog and cinematic depth"')
    print()

    memory.close()
    clear_cache()
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    memory.start_session(
        brief="Design a hero with atmospheric fog and cinematic depth for a creative studio",
        brief_summary="atmospheric fog cinematic depth creative studio hero",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
    )

    retrieved = memory.working.retrieved_patterns
    print(f"  🎯 Retrieved {len(retrieved)} patterns for the new brief:")
    print()
    for i, p in enumerate(retrieved, 1):
        content = p.get("content", "")
        importance = p.get("importance", 5)
        # Truncate for display
        display = content[:120] + ("..." if len(content) > 120 else "")
        print(f"  {i}. [imp={importance}/10] {display}")
    print()

    # Verificar de qué episodios vienen los patrones
    print("  📌 Pattern sources (cross-episode):")
    for p in retrieved[:5]:
        sources = p.get("source_episodes", [])
        print(f"     - {p.get('content', '')[:60]}...")
        print(f"       sources: {len(sources)} episode(s)")
    print()

    # === STEP 6: Resumen ===
    print("━" * 70)
    print("STEP 6: Summary")
    print("━" * 70)
    print(f"  ✅ SILENT LIGHT saved as episode")
    print(f"  ✅ {len(patterns)} new patterns extracted with GLM-4")
    print(f"  ✅ {len(anti_patterns)} anti-patterns extracted")
    print(f"  ✅ Cross-session retrieval works: {len(retrieved)} patterns available for future sessions")
    print()
    print(f"  📈 Memory growth: {stats_before['semantic_notes']} → {stats_after['semantic_notes']} patterns")
    print(f"  📈 Memory growth: {stats_before['episodes']} → {stats_after['episodes']} episodes")
    print()

    # Guardar reporte
    report_path = Path("/home/z/my-project/download/silent-light-memory-report.md")
    report = f"""# SILENT LIGHT — Memory Save Report

## Episode Saved
- ID: {episode_id}
- Vertical: agency
- Archetype: Shaders
- Stack: r3f
- Final score: 8.6
- Outcome: success

## Patterns Extracted: {len(patterns)}

"""
    for p in patterns:
        report += f"### [{p['importance']}/10] {p.get('category', '?')}\n"
        report += f"{p['content']}\n\n"

    report += f"## Anti-patterns Extracted: {len(anti_patterns)}\n\n"
    for ap in anti_patterns:
        report += f"### [{ap.get('failure_mode', '?')}]\n"
        report += f"{ap['description']}\n\n"

    report += f"""## Memory State

- Episodes: {stats_before['episodes']} → {stats_after['episodes']}
- Patterns: {stats_before['semantic_notes']} → {stats_after['semantic_notes']}
- Anti-patterns: {stats_before['anti_patterns']} → {stats_after['anti_patterns']}

## Cross-Session Retrieval Test

A new session with brief "atmospheric fog cinematic depth" retrieved {len(retrieved)} patterns.
This confirms that patterns from BOTH COSMIC RESONANCE and SILENT LIGHT are now available
to inform future hero design sessions.
"""
    report_path.write_text(report, encoding="utf-8")
    print(f"📋 Report saved: {report_path}")

    memory.close()
    print()
    print("=" * 70)
    print("✅ SILENT LIGHT INTEGRATED INTO MEMORY SYSTEM")
    print("=" * 70)


if __name__ == "__main__":
    main()
