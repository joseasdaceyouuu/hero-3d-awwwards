#!/usr/bin/env python3
"""
inject-web-2026-patterns.py — Inyecta patrones de los manuales Web 2026 en memoria.

Los manuales contienen conocimiento técnico valioso que el Creator agent
debería usar. Lo extraemos como patrones de alta importancia.
"""

import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPTS_DIR))

from memory import MemorySystem, FakeEmbedder, clear_cache


def main():
    print("=" * 70)
    print("💾 INJECTING WEB 2026 STANDARDS INTO MEMORY")
    print("=" * 70)
    print()

    clear_cache()
    db_path = Path("/home/z/my-project/memory-data/memory.db")
    lancedb_path = Path("/home/z/my-project/memory-data/lancedb")

    embedder = FakeEmbedder(dimension=64)
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    stats_before = memory.stats()
    print(f"📊 Memory BEFORE: {stats_before['semantic_notes']} patterns")
    print()

    # Patrones extraídos de los manuales Web 2026
    # Cada uno con categoría, importancia y contenido accionable
    patterns = [
        # --- Filosofía Clarity-First ---
        {
            "content": "Clarity-First principle: every pixel must justify its existence. If it doesn't guide the user or reduce cognitive load, it's noise that drains conversion. Decorative design is dead in 2026.",
            "category": "philosophy",
            "importance": 10,
            "vertical": "",
        },
        {
            "content": "Interactive content is 93% more effective at educating buyers than static content. Intentional interfaces increase page dwell time by 30-40%.",
            "category": "philosophy",
            "importance": 9,
            "vertical": "",
        },
        {
            "content": "1-second delay in mobile load time reduces conversions by 20%. Performance is a financial metric, not a technical afterthought.",
            "category": "performance",
            "importance": 10,
            "vertical": "",
        },

        # --- Layouts orgánicos ---
        {
            "content": "Bento Stacking: organize dense data flows into clean, responsive compartments that fit naturally. Breaks rigid grids while maintaining hierarchy.",
            "category": "layout",
            "importance": 8,
            "vertical": "",
        },
        {
            "content": "Liquid Glass: translucent layers with real-time refraction give physical depth to elements. Ideal for hero sections requiring spatial depth.",
            "category": "layout",
            "importance": 8,
            "vertical": "",
        },
        {
            "content": "Overlapping text and images creates layered hierarchy (Hero Sections 2.5D). Organic ≠ chaotic: break grid with balanced weights and whitespace to guide reading.",
            "category": "layout",
            "importance": 7,
            "vertical": "",
        },

        # --- Tipografía ---
        {
            "content": "Variable fonts are the 2026 norm. Adjust weight, width, and slant dynamically via scroll to create living visual rhythm. Typography is the first emotional contact.",
            "category": "typography",
            "importance": 9,
            "vertical": "",
        },
        {
            "content": "Use one display font with character for headings + high-legibility sans-serif for body. Bold scale: dramatically large titles contrasting with airy body text.",
            "category": "typography",
            "importance": 8,
            "vertical": "",
        },

        # --- Movimiento ---
        {
            "content": "Movement rule: 'If it doesn't guide or confirm, remove it'. Movement is a conversion tool, not decoration. GSAP ScrollTrigger for narrative revelation.",
            "category": "animation",
            "importance": 9,
            "vertical": "",
        },
        {
            "content": "For massive effects (>1M elements), use Compute Shaders in WebGPU. Physics and collisions run entirely on GPU without CPU round-trips, guaranteeing 60fps on mobile.",
            "category": "performance",
            "importance": 8,
            "vertical": "",
        },
        {
            "content": "Pause render loop (requestAnimationFrame) when container exits viewport to preserve mobile battery. Mandatory for scroll-driven 3D scenes.",
            "category": "performance",
            "importance": 9,
            "vertical": "",
        },

        # --- WebGPU y TSL ---
        {
            "content": "WebGPU is the 2026 stateless standard. 100x performance increase over WebGL. Direct hardware access via Metal/Vulkan/DirectX 12. Always implement WebGL fallback.",
            "category": "performance",
            "importance": 9,
            "vertical": "",
        },
        {
            "content": "TSL (Three.js Shading Language): write shaders once in JS/TS, compile to WGSL (WebGPU) or GLSL (WebGL) automatically. Eliminates bifurcated codebases.",
            "category": "shader",
            "importance": 8,
            "vertical": "",
        },

        # --- Optimización de activos ---
        {
            "content": "Draco compression mandatory for 3D geometry. Reduces mesh weight up to 90% (e.g., 2.9MB → 46KB) via vertex quantization + topological analysis. GLB must be <2MB.",
            "category": "performance",
            "importance": 10,
            "vertical": "",
        },
        {
            "content": "KTX2 textures (Basis Universal) stay compressed inside VRAM unlike JPEG/PNG. ETC1S for ambient backgrounds/UI (ultra-light), UASTC for PBR materials (high fidelity).",
            "category": "performance",
            "importance": 9,
            "vertical": "",
        },

        # --- Accesibilidad ---
        {
            "content": "Contrast ratio 4.5:1 is non-optional in 2026. Darken gray texts for solar legibility — users must read under direct sunlight. Accessibility is SEO priority.",
            "category": "accessibility",
            "importance": 10,
            "vertical": "",
        },
        {
            "content": "WebGPU failure must NOT show blank screen. Critical content fallback is mandatory policy. Detect device capabilities, serve WebGPU by default, degrade gracefully.",
            "category": "accessibility",
            "importance": 9,
            "vertical": "",
        },

        # --- Workflows IA ---
        {
            "content": "For hyper-realistic volumetric/fluid backgrounds exceeding real-time capacity, use AI video loops (Runway/Sora) <5MB with muted, loop, playsinline attributes. Saves GPU for interactive elements.",
            "category": "workflow",
            "importance": 7,
            "vertical": "",
        },
        {
            "content": "AI-generated 3D assets are visual representations, not engineering models. Always pass through optimization pipeline ending in Draco compression before deployment.",
            "category": "workflow",
            "importance": 8,
            "vertical": "",
        },

        # --- Decisión 3D vs video ---
        {
            "content": "Before implementing 3D, answer: (1) Does it facilitate client action? (2) Does it fit brand identity? (3) Is performance viable on mobile? If 3D adds no pedagogical/narrative value, use AI video loop instead.",
            "category": "philosophy",
            "importance": 9,
            "vertical": "",
        },

        # --- Benchmarking ---
        {
            "content": "Apple uses baked lightmaps for photographic realism without GPU overload. Nike uses texture atlasing to maintain 60fps while exploring textiles. Stripe/Shopify use GLSL shaders for gradient transitions on dense data.",
            "category": "benchmark",
            "importance": 7,
            "vertical": "",
        },
        {
            "content": "E-commerce (31% of Awwwards winners) uses PBR configurators to reduce returns. Real Estate (18%) uses camera flythroughs to dignify brand. Match technique to vertical.",
            "category": "benchmark",
            "importance": 7,
            "vertical": "",
        },
    ]

    print(f"📝 Injecting {len(patterns)} patterns from Web 2026 manuals...")
    print()

    added = 0
    for p in patterns:
        try:
            note_id = memory.semantic.add(
                content=p["content"],
                vertical=p["vertical"],
                category=p["category"],
                importance=p["importance"],
                source_episodes=[],  # manual injection, no episode
            )
            added += 1
            print(f"  + [imp={p['importance']}/10] {p['category']:15s} | {p['content'][:80]}...")
        except Exception as e:
            print(f"  ⚠️  Failed: {e}")

    print()
    stats_after = memory.stats()
    print(f"📈 Memory AFTER: {stats_after['semantic_notes']} patterns")
    print(f"   Added: {added} new patterns")
    print()

    # Verificar que se pueden recuperar
    print("🎯 Retrieval test: 'web 2026 standards performance optimization'")
    results = memory.semantic.search(
        "web 2026 standards performance optimization draco ktx2 webgpu",
        top_k=5,
    )
    print(f"   Retrieved {len(results)} patterns:")
    for p, score in results:
        print(f"   [score={score:.3f}] {p['content'][:80]}...")
    print()

    memory.close()
    print("✅ WEB 2026 STANDARDS INJECTED INTO MEMORY")


if __name__ == "__main__":
    main()
