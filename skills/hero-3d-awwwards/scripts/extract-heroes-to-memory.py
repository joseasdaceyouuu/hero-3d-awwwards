#!/usr/bin/env python3
"""
extract-heroes-to-memory.py — Extrae patrones de los heroes construidos
y los guarda en la memoria de la skill.

Lee los 3 heroes construidos (PROFUNDIDAD, VERVAIN, PIXELVOID), identifica
patrones positivos y anti-patterns, y los almacena como:
  - Episodios (episodic memory): la sesión completa del hero
  - Notas semánticas (semantic memory): hechos atómicos extraídos
  - Skills procedurales (procedural memory): patrones reutilizables
  - Anti-patterns (negative knowledge): errores a evitar

Esto cierra el ciclo de aprendizaje: la skill ahora "recuerda" lo que
aprendió construyendo cada hero y puede recuperarlo en futuros briefs.
"""

import sys
import os
import json
import hashlib
from pathlib import Path
from datetime import datetime

# Paths
SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent
PROJECT_DIR = SKILL_DIR.parent.parent  # /home/z/my-project
sys.path.insert(0, str(SCRIPT_DIR))

from memory.stores import MemorySystem
from memory.embeddings import LLMKeywordEmbedder

DB_PATH = SKILL_DIR / "data" / "memory.db"
LANCEDB_PATH = SKILL_DIR / "data" / "lancedb"

# ============================================================
# HEROES CONSTRUIDOS — metadatos + contenido
# ============================================================

HEROES = [
    {
        "id": "profundidad",
        "route": "/",
        "file": PROJECT_DIR / "src" / "app" / "page.tsx",
        "canvas_file": PROJECT_DIR / "src" / "components" / "hero" / "CinematicCanvas.tsx",
        "title": "PROFUNDIDAD",
        "brief": "Hero cinematográfico 3D con profundidad Z real. 4 capas a distintas profundidades (fondo Z=8, niebla Z=4, partículas Z=1, frente Z=-1). Cámara dolly al scroll de Z=14 a Z=0.5 atravesando las capas. Crossfade por Z para transiciones elegantes. Burst orgánico al cruzar partículas. Coreografía de color en 4 fases. Letterbox cinematográfico. Mouse parallax en 3 capas a velocidades distintas.",
        "vertical": "agency",
        "archetype": "3D-Scene",
        "stack": "r3f",
        "outcome": "success",
        "final_score": 9.0,
        "patterns": [
            "Crossfade por Z: cada capa calcula su alpha basándose en la Z de la cámara relativa a su propia Z. Fórmula: appear * disappear con smoothstep.",
            "Niebla volumétrica intercapa: plano a Z intermedio con shader fBm + AdditiveBlending para sensación de atravesar bruma.",
            "Burst orgánico al cruzar capa: detección de cruce comparando prevCameraZ con camZ, disparar burst=1.0, decaer 0.018/frame.",
            "Coreografía de color en 4 fases: lejano (frío violeta) → aproximación → cruce (cálido) → llegada (amber pleno). uDepth inyectado con lerp 0.08.",
            "Sticky pinned 400vh: hero outer mide N*100vh, hero inner sticky top-0 h-screen. ScrollTrigger start='top top' end='bottom bottom'.",
            "overflow-x: clip (no hidden): hidden rompe position: sticky porque convierte overflow-y a auto, creando contenedor de scroll.",
            "Lenis + ScrollTrigger sincronizados: lenis.on('scroll', ScrollTrigger.update) + gsap.ticker.add para un solo loop.",
        ],
        "anti_patterns": [
            "overflow-x: hidden rompe position: sticky → usar overflow-x: clip",
            "Hero sticky sin altura suficiente: debe medir múltiples viewport-heights",
            "Lenis + ScrollTrigger sin sincronizar: triggers disparan con progreso equivocado",
            "smoothstep args invertidos: THREE.MathUtils.smoothstep(x, min, max) requiere min < max",
            "Pantalla negra por halo residual insuficiente: subir mix(0.12, 1.0, alpha) a mix(0.35, 1.0, alpha)",
        ],
        "skills_used": [
            "shader-noise", "shader-postprocessing", "component-shader-background",
            "component-split-text", "component-magnetic-button", "component-blend-cursor",
            "component-scroll-camera", "component-preloader",
        ],
    },
    {
        "id": "vervain",
        "route": "/vervain",
        "file": PROJECT_DIR / "src" / "app" / "vervain" / "page.tsx",
        "title": "VERVAIN",
        "brief": "Hero editorial minimalista para estudio de diseño chileno boutique. Paleta negro/crema/oro. Sin WebGL — Canvas 2D + CSS + Web Animations API. LetterReveal para título letra por letra. ConnectedParticles para constelación oro. GoldenDust para micro-reward al click. MouseGlow con mix-blend-mode: screen. Tipografía Cormorant Garamond serif.",
        "vertical": "agency",
        "archetype": "2.5D-Parallax",
        "stack": "css-3d",
        "outcome": "success",
        "final_score": 8.5,
        "patterns": [
            "Letter reveal secuencial: título letra por letra con translateY(60px) rotateX(-40deg) → translateY(0) rotateX(0), stagger 0.08s.",
            "Golden dust al click: 12 partículas radiales con Web Animations API, cubic-bezier(0.16, 1, 0.3, 1), pointer-events: none.",
            "Mouse glow con mix-blend-mode: screen: radial-gradient(circle, rgba(accent, 0.04), transparent 70%), suma luz suave.",
            "Partículas con conexiones (constelación): Canvas 2D, 150 partículas, O(n²), líneas entre cercanas con opacity=(1-dist/100)*0.08.",
            "Deco-line con gradient expansión: linear-gradient(90deg, transparent, accent, transparent) con scaleX(0)→scaleX(1).",
            "Loader 0% cinematográfico: counter tipográfico como experiencia de carga.",
        ],
        "anti_patterns": [
            "<h1> anidado en <h1>: LetterReveal default as='h1' anidaba dentro del wrapper. Fix: as='span'.",
            "Mouse listeners en canvas con pointer-events: none: listeners en canvas nunca disparan. Fix: window.addEventListener + getBoundingClientRect.",
            "Layout absoluto invertido: social-bar debe ir bottom:40px (al ras), scroll-indicator bottom:100px (encima). NUNCA invertir.",
        ],
        "skills_used": [
            "component-letter-reveal", "component-connected-particles",
            "component-golden-dust", "component-mouse-glow", "component-preloader",
        ],
    },
    {
        "id": "pixelvoid",
        "route": "/pixelvoid",
        "file": PROJECT_DIR / "src" / "app" / "pixelvoid" / "page.tsx",
        "title": "PIXELVOID",
        "brief": "Hero anti-ARAGAL cyberpunk dark fantasy gamer. Paleta neón saturado: magenta #FF006E + cyan #00F5FF + lime #C7FF00 sobre negro. Sin Three.js — WebGL crudo (canvas + getContext('webgl') directo). Shader glitch custom: RGB split, scanlines CRT, glitch blocks, chromatic aberration, grid cyberpunk, burst bands. Tipografía Space Grotesk bold + JetBrains Mono. Interacción: glitch burst on hover, shards lineales on click (no partículas circulares).",
        "vertical": "juegos",
        "archetype": "Shaders",
        "stack": "threejs-vanilla",
        "outcome": "success",
        "final_score": 8.8,
        "patterns": [
            "Shader glitch custom sin registry: RGB split horizontal con offset noise-driven + scanlines + CRT flicker + chromatic aberration radial.",
            "Glitch blocks: bandas que se desplazan horizontalmente con hash(floor(uv.y * 30.0) + floor(time * 12.0)).",
            "CRT flicker: sin(time * 60.0) * 0.02 + sin(time * 13.0) * 0.01 para brightness oscillation.",
            "Interacción shards on click: 6 líneas verticales/horizontales con glow neón, rotación aleatoria, NO partículas circulares.",
            "Clip-path angular en CTAs: estilo gamer, no border-radius.",
            "HUD terminal-style: stats técnicos (FRAME, GPU, LATENCY) en font-mono.",
        ],
        "anti_patterns": [
            "WebGL crudo sin precision: fragment shader requiere 'precision highp float;' explícito. Three.js lo inyecta, WebGL crudo no.",
            "WebGL crudo sin attributes declarados: vertex shader requiere 'attribute vec3 position; attribute vec2 uv; uniform mat4 modelViewMatrix, projectionMatrix;'. Three.js los inyecta, WebGL crudo no.",
            "Buffer attribute mismatch: position vec3 pero vertexAttribPointer con 2 componentes. Fix: interleaved buffer stride 20 bytes.",
        ],
        "skills_used": [
            "shader-noise",  # usado en el shader custom
        ],
    },
]


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def extract_hero_to_memory(memory: MemorySystem, hero: dict) -> str:
    """Extrae un hero y lo guarda en memoria. Retorna el episode_id."""
    # Leer código
    code_content = ""
    if hero["file"].exists():
        code_content = hero["file"].read_text(encoding="utf-8")
    if hero.get("canvas_file") and Path(hero["canvas_file"]).exists():
        code_content += "\n\n// === CANVAS ===\n\n" + Path(hero["canvas_file"]).read_text(encoding="utf-8")

    # Iniciar sesión
    memory.start_session(
        brief=hero["brief"],
        brief_summary=f"{hero['title']} — {hero['vertical']}/{hero['archetype']} — {hero['stack']}",
        vertical=hero["vertical"],
        archetype=hero["archetype"],
        stack=hero["stack"],
    )

    # Guardar iteración (formato que espera save_iteration)
    memory.save_iteration(
        iteration=1,
        code={str(hero["file"]): code_content},
        audit={
            "score": hero["final_score"],
            "feedback": f"Hero {hero['title']} construido. Score: {hero['final_score']}/10",
            "patterns_applied": hero["patterns"],
            "anti_patterns_avoided": hero["anti_patterns"],
            "skills_used": hero["skills_used"],
        },
        subjective={
            "score": hero["final_score"],
            "feedback": "Aceptado por el usuario",
        },
    )

    # Finalizar sesión → guarda episodio
    episode_id = memory.finalize_session(
        outcome=hero["outcome"],
        final_score=hero["final_score"],
        final_subjective_score=hero["final_score"],
        user_feedback="Hero aceptado y validado visualmente",
    )

    # Guardar patrones como notas semánticas
    for pattern in hero["patterns"]:
        memory.semantic.add(
            content=pattern,
            vertical=hero["vertical"],
            category="pattern",
            importance=8,
            source_episodes=[episode_id],
        )

    # Guardar anti-patterns (verificar si ya existen para no duplicar)
    for anti in hero["anti_patterns"]:
        existing = memory.anti_patterns.find_similar(anti)
        if existing:
            memory.anti_patterns.record_occurrence(
                existing["id"], episode_id=episode_id, criterion_id=""
            )
        else:
            memory.anti_patterns.add(
                description=anti,
                failure_mode="visual",
                episode_id=episode_id,
            )

    # Guardar skills procedurales (si no existen, crearlas)
    for skill_id in hero["skills_used"]:
        # Verificar si ya existe (por description que mencione el skill_id)
        existing = memory.conn.execute(
            "SELECT id FROM skills WHERE description LIKE ? AND status = 'active'",
            (f"%{skill_id}%",),
        ).fetchone()
        if existing:
            memory.procedural.record_outcome(existing["id"], success=True)
        else:
            # Crear skill nueva
            memory.procedural.add(
                description=f"Skill {skill_id} — usada en hero {hero['title']}",
                code_template=f"// Import from registry: {skill_id}",
                parameters={},
                source_episodes=[episode_id],
                valid_verticals=[hero["vertical"]],
            )

    print(f"  ✓ {hero['title']}: episode={episode_id[:8]}..., patterns={len(hero['patterns'])}, anti={len(hero['anti_patterns'])}")
    return episode_id


def main():
    print("=" * 60)
    print("EXTRACCIÓN DE HEROES A MEMORIA")
    print("=" * 60)

    # Forzar LLMKeywordEmbedder (no requiere API key)
    embedder = LLMKeywordEmbedder()

    # Inicializar memoria
    memory = MemorySystem(
        db_path=str(DB_PATH),
        lancedb_path=str(LANCEDB_PATH),
        embedder=embedder,
    )
    print(f"\nMemory system: DB={DB_PATH}")
    print(f"               LanceDB={LANCEDB_PATH}")
    print(f"               Embedder: LLMKeywordEmbedder (dim={embedder.dimension})\n")

    # Extraer cada hero
    episode_ids = []
    for hero in HEROES:
        print(f"Extrayendo {hero['title']}...")
        try:
            ep_id = extract_hero_to_memory(memory, hero)
            episode_ids.append(ep_id)
        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback
            traceback.print_exc()

    memory.close()

    # Verificar almacenamiento
    print(f"\n{'=' * 60}")
    print("VERIFICACIÓN")
    print("=" * 60)

    import sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    counts = {
        "episodes": conn.execute("SELECT COUNT(*) FROM episodes").fetchone()[0],
        "semantic_notes": conn.execute("SELECT COUNT(*) FROM semantic_notes").fetchone()[0],
        "skills": conn.execute("SELECT COUNT(*) FROM skills").fetchone()[0],
        "anti_patterns": conn.execute("SELECT COUNT(*) FROM anti_patterns").fetchone()[0],
        "code_hashes": conn.execute("SELECT COUNT(*) FROM code_hashes").fetchone()[0],
    }
    conn.close()

    print(f"\nContenido en memoria:")
    for k, v in counts.items():
        print(f"  {k}: {v}")

    # Probar retrieval
    print(f"\n{'=' * 60}")
    print("TEST DE RETRIEVAL")
    print("=" * 60)

    memory2 = MemorySystem(
        db_path=str(DB_PATH),
        lancedb_path=str(LANCEDB_PATH),
        embedder=LLMKeywordEmbedder(),
    )

    test_briefs = [
        "Hero editorial minimalista para estudio de diseño con tipografía serif",
        "Hero cyberpunk gamer con glitch y neón magenta cyan",
        "Hero cinematográfico 3D con profundidad multi-capa y cámara dolly",
    ]

    for brief in test_briefs:
        print(f"\nBrief: '{brief[:60]}...'")
        try:
            memory2.start_session(brief=brief, vertical="agency")
            patterns = memory2.working.retrieved_patterns
            print(f"  Patrones recuperados ({len(patterns)}):")
            for p in patterns[:3]:
                content = p.get("content", "")[:80]
                print(f"    • {content}...")

            anti = memory2.working.retrieved_anti_patterns
            print(f"  Anti-patterns recuperados ({len(anti)}):")
            for a in anti[:2]:
                content = a.get("description", "")[:80]
                print(f"    • {content}...")
        except Exception as e:
            print(f"  Error: {e}")

    memory2.close()

    print(f"\n{'=' * 60}")
    print("✓ EXTRACCIÓN COMPLETA — ciclo de aprendizaje cerrado")
    print("=" * 60)


if __name__ == "__main__":
    main()
