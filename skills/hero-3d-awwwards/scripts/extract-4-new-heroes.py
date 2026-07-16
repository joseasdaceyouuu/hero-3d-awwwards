#!/usr/bin/env python3
"""
extract-4-new-heroes.py — Extrae BRÚJULA, NOMADA, CRONOS, NEXUS a memoria.

Estos 4 heroes se construyeron después de la extracción inicial y no están
en la memoria. Son los más avanzados:
  - BRÚJULA: Layout B (split izq/der) + brújula animada + nieve
  - NOMADA: Layout H+G (tipográfico full + minimalist corner)
  - CRONOS: Layout C (grid 3-col) + sistema orbital 3D
  - NEXUS: Núcleo 3D con shader simplex noise + partículas esféricas
"""

import sys
import hashlib
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent
PROJECT_DIR = SKILL_DIR.parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from memory.stores import MemorySystem
from memory.embeddings import LLMKeywordEmbedder

DB_PATH = SKILL_DIR / "data" / "memory.db"
LANCEDB_PATH = SKILL_DIR / "data" / "lancedb"

HEROES = [
    {
        "id": "brujula",
        "route": "/brujula",
        "file": PROJECT_DIR / "src" / "app" / "brujula" / "page.tsx",
        "title": "BRÚJULA",
        "brief": "Hero split izquierda/derecha (Layout B) para agencia de viajes de aventura en Patagonia. Paleta azul hielo + blanco + verde bosque. Brújula animada que sigue al mouse con aguja roja + partículas nieve. Tipografía Space Grotesk bold. HUD bottom strip horizontal (no esquinas). Stats horizontales (no grid).",
        "vertical": "viajes",
        "archetype": "2.5D-Parallax",
        "stack": "css-3d",
        "outcome": "success",
        "final_score": 8.0,
        "patterns": [
            "Layout B: Split izq/der 60/40 (no centrado) — contenido izq, visual der",
            "Brújula animada con aguja que sigue al mouse (atan2 + rotación)",
            "Partículas de nieve cayendo con deriva sine",
            "HUD bottom strip horizontal (no esquinas) con backdrop-filter blur",
            "Stats horizontales alineados izquierda (no grid centrado)",
            "CTAs alineados izquierda (no centrados)",
            "Tipografía Space Grotesk bold (no serif)",
        ],
        "anti_patterns": [],
        "skills_used": ["component-letter-reveal"],
    },
    {
        "id": "nomada",
        "route": "/nomada",
        "file": PROJECT_DIR / "src" / "app" / "nomada" / "page.tsx",
        "title": "NÓMADA",
        "brief": "Hero tipográfico full (Layout H + G) para portfolio de arquitecto minimalista. Blanco/negro puro. Solo tipografía + espacio negativo. Sin canvas, sin partículas, sin HUD. Tipografía Playfair Display serif. Espacio negativo como protagonista.",
        "vertical": "portfolio",
        "archetype": "2.5D-Parallax",
        "stack": "css-3d",
        "outcome": "success",
        "final_score": 8.2,
        "patterns": [
            "Layout H: tipografía gigante que llena 80% del hero (clamp 80px-280px)",
            "Layout G: contenido pequeño en esquina inferior izquierda",
            "Sin canvas, sin partículas, sin HUD complejo (minimalismo extremo)",
            "Solo CSS + tipografía serif Playfair Display",
            "Espacio negativo como protagonista (60%+ vacío)",
            "Índice numérico en esquina inferior derecha (4 proyectos)",
            "Variante scale en LetterReveal (no reveal)",
        ],
        "anti_patterns": [],
        "skills_used": ["component-letter-reveal"],
    },
    {
        "id": "cronos",
        "route": "/cronos",
        "file": PROJECT_DIR / "src" / "app" / "cronos" / "page.tsx",
        "title": "CRONOS",
        "brief": "Hero Layout C (grid 3-col asimétrico) con sistema orbital 3D para relojes de lujo. Paleta azul medianoche + oro champagne. 3 órbitas concéntricas rotando a 30s/20s/15s + 10 planetas SVG + esfera central con reloj SVG custom. Multi-layer parallax con data-speed. Counter animation en stats. Parallax 3D con perspective rotateY/X.",
        "vertical": "relojes",
        "archetype": "3D-Scene",
        "stack": "css-3d",
        "outcome": "success",
        "final_score": 8.5,
        "patterns": [
            "Layout C: Grid 3-col asimétrico (1fr 1.2fr 1fr) — nombre/stats | orbital | traits",
            "Sistema orbital 3D: 3 órbitas concéntricas rotando a 30s/20s/15s",
            "10 planetas SVG con radial-gradient + box-shadow glow",
            "Esfera central con reloj SVG custom (marcas horas + manecillas)",
            "Multi-layer parallax con data-speed (4 capas, lerp 0.04)",
            "Counter animation: stats cuentan 0→N en 2s con requestAnimationFrame",
            "Parallax 3D del orbital con perspective(1000px) rotateY/X",
            "Estrellas pulsantes en esfera central (6 estrellas, delays 0-1.5s)",
        ],
        "anti_patterns": [
            "Preloader sin timer: hero se quedaba pegado (anti-pattern 5.18). Fix: useEffect separado con setTimeout.",
        ],
        "skills_used": ["component-letter-reveal"],
    },
    {
        "id": "nexus",
        "route": "/nexus",
        "file": PROJECT_DIR / "src" / "app" / "nexus" / "page.tsx",
        "title": "NEXUS",
        "brief": "Hero con núcleo 3D + shader de deformación (simplex noise) para IA/biotech. Paleta esmeralda + lime + blanco sobre negro. TorusKnot con ShaderMaterial deformando vértices via snoise + mouse force. 3000 partículas esféricas con vertexColors + AdditiveBlending. Drag para rotar + auto-rotación híbrida. Telemetría HUD dinámica. Film grain + scan line. Fresnel en fragment shader.",
        "vertical": "ia",
        "archetype": "Shaders",
        "stack": "threejs-vanilla",
        "outcome": "success",
        "final_score": 8.1,
        "patterns": [
            "Núcleo 3D con shader deformación simplex noise: snoise(pos*1.5 + uTime*0.5) + pos += normal * displacement",
            "Mouse force uniform con decaimiento *= 0.95 cada frame",
            "Fresnel en mesh 3D: pow(1.0 - dot(viewDir, vNormal), 2.0) para brillo bordes",
            "3000 partículas esféricas: distribución radius/theta/phi + vertexColors + AdditiveBlending",
            "Drag para rotar + auto-rotación híbrida: if(!isDragging) targetRotY += 0.002",
            "Telemetría HUD dinámica: setInterval 1.5s con Math.random en rango realista",
            "Film grain + scan line cinematográfico (SVG turbulence + steps(2))",
            "TorusKnot geometry (no Icosahedron como AETHER) — adaptación original",
            "Glow radial ampliado 90% 70% para reducir zonas negras muertas",
            "Scroll indicator con mouse outline + dot animado + glow",
        ],
        "anti_patterns": [
            "WebGL context conflict: no llamar canvas.getContext('webgl') después de que Three.js creó su context",
        ],
        "skills_used": [],
    },
]


def extract_hero(memory: MemorySystem, hero: dict) -> str:
    """Extrae un hero y lo guarda en memoria."""
    code = hero["file"].read_text(encoding="utf-8")

    memory.start_session(
        brief=hero["brief"],
        brief_summary=f"{hero['title']} — {hero['vertical']}/{hero['archetype']} — {hero['stack']}",
        vertical=hero["vertical"],
        archetype=hero["archetype"],
        stack=hero["stack"],
    )

    memory.save_iteration(
        iteration=1,
        code={str(hero["file"]): code},
        audit={
            "score": hero["final_score"],
            "feedback": f"Hero {hero['title']} construido. Score: {hero['final_score']}/10",
            "patterns_applied": hero["patterns"],
        },
        subjective={"score": hero["final_score"], "feedback": "Extraído a memoria"},
    )

    episode_id = memory.finalize_session(
        outcome=hero["outcome"],
        final_score=hero["final_score"],
        final_subjective_score=hero["final_score"],
        user_feedback="Hero validado",
    )

    for pattern in hero["patterns"]:
        memory.semantic.add(
            content=pattern,
            vertical=hero["vertical"],
            category="pattern",
            importance=8,
            source_episodes=[episode_id],
        )

    for anti in hero["anti_patterns"]:
        existing = memory.anti_patterns.find_similar(anti)
        if existing:
            memory.anti_patterns.record_occurrence(existing["id"], episode_id=episode_id)
        else:
            memory.anti_patterns.add(
                description=anti,
                failure_mode="visual",
                episode_id=episode_id,
            )

    print(f"  ✓ {hero['title']}: episode={episode_id[:8]}..., patterns={len(hero['patterns'])}")
    return episode_id


def main():
    print("=" * 60)
    print("EXTRACCIÓN DE 4 HEROES NUEVOS A MEMORIA")
    print("=" * 60)

    memory = MemorySystem(
        db_path=str(DB_PATH),
        lancedb_path=str(LANCEDB_PATH),
        embedder=LLMKeywordEmbedder(),
    )

    for hero in HEROES:
        print(f"\nExtrayendo {hero['title']}...")
        try:
            extract_hero(memory, hero)
        except Exception as e:
            print(f"  ✗ Error: {e}")

    memory.close()

    # Verificar
    import sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    print(f"\n{'='*60}")
    print("VERIFICACIÓN")
    print("=" * 60)
    print(f"Episodios: {conn.execute('SELECT COUNT(*) FROM episodes').fetchone()[0]}")
    print(f"Patrones: {conn.execute('SELECT COUNT(*) FROM semantic_notes').fetchone()[0]}")
    print(f"Skills: {conn.execute('SELECT COUNT(*) FROM skills').fetchone()[0]}")
    print(f"Anti-patterns: {conn.execute('SELECT COUNT(*) FROM anti_patterns').fetchone()[0]}")
    conn.close()

    # Test retrieval
    print(f"\n{'='*60}")
    print("TEST RETRIEVAL CON BRIEF NUEVO")
    print("=" * 60)
    memory2 = MemorySystem(
        db_path=str(DB_PATH),
        lancedb_path=str(LANCEDB_PATH),
        embedder=LLMKeywordEmbedder(),
    )
    brief = "Hero para marca de música electrónica con visual 3D reactivo"
    print(f"\nBrief: '{brief}'")
    patterns = memory2.semantic.search(brief, top_k=5, vertical_filter=None)
    print(f"Patrones recuperados ({len(patterns)}):")
    for note, score in patterns:
        print(f"  [{score:.3f}] {note.get('content', '')[:90]}")
    memory2.close()


if __name__ == "__main__":
    main()
