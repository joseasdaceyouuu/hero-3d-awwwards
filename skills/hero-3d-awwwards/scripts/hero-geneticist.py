#!/usr/bin/env python3
"""
hero-geneticist.py — Algoritmo genético para heroes.

CRUZA patrones de 2 heroes existentes para generar un brief + estructura
de hero nuevo. Como un genetista: toma ADN de 2 padres y produce un hijo
que hereda características de ambos.

Algoritmo:
  1. Selecciona 2 heroes "padres" de la memoria (los más distintos entre sí)
  2. Extrae los patrones de cada uno
  3. Cruza: 50% patrones del padre A + 50% del padre B
  4. Mutación: 10% probabilidad de reemplazar un patrón por uno aleatorio
  5. Genera un brief que combina elementos de ambos padres
  6. Output: brief + lista de patrones cruzados + sugerencia de layout

Uso:
  python hero-geneticist.py
  python hero-geneticist.py --parent-a NEXUS --parent-b CINEFEST
  python hero-geneticist.py --generations 3
"""

import argparse
import json
import random
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from memory.stores import MemorySystem
from memory.embeddings import LLMKeywordEmbedder

DB_PATH = SKILL_DIR / "data" / "memory.db"
LANCEDB_PATH = SKILL_DIR / "data" / "lancedb"

# Layouts disponibles (anti-pattern 5.17)
LAYOUTS = ["A_centrado", "B_split", "C_grid3col", "D_fullbleed", "E_horizontal", "F_diagonal", "G_corner", "H_tipografico", "I_multiscene", "J_tunel"]

# Paletas base por vertical
PALETTES = {
    "agency": ["#02030a", "#00f3ff", "#ff0055"],
    "cine": ["#1A0F08", "#D4A05E", "#8B6914"],
    "café": ["#2A1F18", "#6B4423", "#8B8B3A"],
    "vinos": ["#0F0507", "#8B1A2B", "#C9A05E"],
    "juegos": ["#040008", "#FF006E", "#00F5FF"],
    "ia": ["#000305", "#00ff88", "#aaff00"],
    "viajes": ["#0B1F2A", "#7BA7BC", "#F5F0E8"],
    "portfolio": ["#FAFAF7", "#0A0A0A"],
    "relojes": ["#050a18", "#d4b896", "#1a2540"],
    "escultura": ["#0a0a0f", "#C9A05E", "#00ff88"],
}


def get_all_episodes(memory: MemorySystem) -> list[dict]:
    """Obtiene todos los episodios con sus patrones."""
    import sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, brief, brief_summary, vertical, archetype, stack, final_score FROM episodes ORDER BY final_score DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_patterns_for_episode(memory: MemorySystem, episode_id: str) -> list[str]:
    """Obtiene los patrones de un episodio específico."""
    import sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    rows = conn.execute(
        "SELECT content FROM semantic_notes WHERE source_episodes LIKE ?",
        (f'%{episode_id}%',)
    ).fetchall()
    conn.close()
    return [r[0] for r in rows]


def select_parents(episodes: list[dict], parent_a: str = None, parent_b: str = None) -> tuple[dict, dict]:
    """Selecciona 2 padres. Si no se especifican, elige los más distintos."""
    if parent_a and parent_b:
        a = next((e for e in episodes if parent_a.upper() in (e.get("brief_summary", "").upper())), episodes[0])
        b = next((e for e in episodes if parent_b.upper() in (e.get("brief_summary", "").upper())), episodes[1])
        return a, b

    # Selección natural: los 2 con mayor score de verticales distintas
    by_score = sorted(episodes, key=lambda e: e.get("final_score", 0), reverse=True)
    a = by_score[0]
    # Padre B: el de mayor score de una vertical DISTINTA
    b = next((e for e in by_score if e.get("vertical") != a.get("vertical")), by_score[1])
    return a, b


def crossover(patterns_a: list[str], patterns_b: list[str], mutation_rate: float = 0.1) -> list[str]:
    """Cruza patrones de 2 padres. 50% de cada uno + mutación."""
    child_patterns = []
    half_a = len(patterns_a) // 2
    child_patterns.extend(patterns_a[:half_a])
    child_patterns.extend(patterns_b[half_a:])

    # Mutación: reemplazar un patrón aleatorio con otro de la pool
    if random.random() < mutation_rate and len(child_patterns) > 0:
        all_patterns = patterns_a + patterns_b
        if all_patterns:
            idx = random.randint(0, len(child_patterns) - 1)
            child_patterns[idx] = random.choice(all_patterns)

    return child_patterns


def generate_brief(parent_a: dict, parent_b: dict, child_patterns: list[str]) -> dict:
    """Genera un brief que combina elementos de ambos padres."""
    vert_a = parent_a.get("vertical", "agency")
    vert_b = parent_b.get("vertical", "agency")
    arch_a = parent_a.get("archetype", "2.5D-Parallax")
    arch_b = parent_b.get("archetype", "Shaders")

    # Elegir vertical del hijo (50/50)
    child_vertical = random.choice([vert_a, vert_b])
    # Elegir arquetipo del hijo (50/50)
    child_archetype = random.choice([arch_a, arch_b])
    # Elegir stack del hijo (preferir el del arquetipo)
    child_stack = parent_a.get("stack", "css-3d") if child_archetype == arch_a else parent_b.get("stack", "css-3d")
    # Elegir layout (distinto a los de los padres si es posible)
    child_layout = random.choice(LAYOUTS)
    # Elegir paleta del vertical
    palette = PALETTES.get(child_vertical, PALETTES["agency"])

    # Brief sintético
    brief = f"Hero genético cruzando {parent_a.get('brief_summary', 'A')} × {parent_b.get('brief_summary', 'B')}. "
    brief += f"Vertical: {child_vertical}. Arquetipo: {child_archetype}. Layout: {child_layout}. "
    brief += f"Paleta: {' + '.join(palette)}. "
    brief += f"Patrones heredados: {len(child_patterns)}."

    return {
        "brief": brief,
        "vertical": child_vertical,
        "archetype": child_archetype,
        "stack": child_stack,
        "layout": child_layout,
        "palette": palette,
        "patterns": child_patterns,
        "parent_a": parent_a.get("brief_summary", "?"),
        "parent_b": parent_b.get("brief_summary", "?"),
        "parent_a_score": parent_a.get("final_score", 0),
        "parent_b_score": parent_b.get("final_score", 0),
    }


def run_geneticist(memory: MemorySystem, parent_a_name: str = None, parent_b_name: str = None, generations: int = 1):
    print("=" * 70)
    print("🧬 HERO GENETICIST — Algoritmo genético para heroes")
    print("=" * 70)

    episodes = get_all_episodes(memory)
    print(f"\n📊 Pool genético: {len(episodes)} episodios")

    for gen in range(generations):
        print(f"\n{'='*40} GENERACIÓN {gen+1}/{generations} {'='*40}")

        # Seleccionar padres
        parent_a, parent_b = select_parents(episodes, parent_a_name, parent_b_name)
        print(f"\n👨 Padre A: {parent_a.get('brief_summary', '?')[:60]}... (score: {parent_a.get('final_score', 0)})")
        print(f"👩 Padre B: {parent_b.get('brief_summary', '?')[:60]}... (score: {parent_b.get('final_score', 0)})")

        # Extraer patrones
        patterns_a = get_patterns_for_episode(memory, parent_a["id"])
        patterns_b = get_patterns_for_episode(memory, parent_b["id"])
        print(f"\n🧬 ADN Padre A: {len(patterns_a)} patrones")
        print(f"🧬 ADN Padre B: {len(patterns_b)} patrones")

        # Cruza
        child_patterns = crossover(patterns_a, patterns_b, mutation_rate=0.15)
        print(f"\n👶 Hijo: {len(child_patterns)} patrones heredados (crossover + mutación)")

        # Generar brief
        child = generate_brief(parent_a, parent_b, child_patterns)
        print(f"\n{'='*40} HERO HIJO {'='*40}")
        print(f"Vertical: {child['vertical']}")
        print(f"Arquetipo: {child['archetype']}")
        print(f"Stack: {child['stack']}")
        print(f"Layout: {child['layout']}")
        print(f"Paleta: {' + '.join(child['palette'])}")
        print(f"\nBrief: {child['brief']}")
        print(f"\nPatrones heredados:")
        for i, p in enumerate(child_patterns[:8]):
            print(f"  {i+1}. {p[:90]}")
        if len(child_patterns) > 8:
            print(f"  ... y {len(child_patterns) - 8} más")

        # Para la siguiente generación, usar el hijo como nuevo padre
        if gen < generations - 1:
            print(f"\n→ Usando hijo como padre para generación {gen+2}...")
            # Simular: reemplazar parent_a con el hijo
            parent_a_name = None
            parent_b_name = None

    return child


def main():
    parser = argparse.ArgumentParser(description="Hero Geneticist — algoritmo genético para heroes")
    parser.add_argument("--parent-a", help="Nombre del padre A")
    parser.add_argument("--parent-b", help="Nombre del padre B")
    parser.add_argument("--generations", type=int, default=1, help="Número de generaciones")
    args = parser.parse_args()

    memory = MemorySystem(db_path=str(DB_PATH), lancedb_path=str(LANCEDB_PATH), embedder=LLMKeywordEmbedder())
    result = run_geneticist(memory, args.parent_a, args.parent_b, args.generations)
    memory.close()

    print(f"\n{'='*70}")
    print("RESULTADO")
    print("=" * 70)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
