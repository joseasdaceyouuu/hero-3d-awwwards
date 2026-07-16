#!/usr/bin/env python3
"""
run-consolidation.py — Ejecuta consolidación de memoria (reflection periódica).

Minea episodios recientes para:
  1. Patrones recurrentes → promueve a semantic notes con mayor importance
  2. Skills exitosas → promueve a procedural memory con success_count
  3. Fallos recurrentes → promueve a anti-patterns
  4. Detecta conflictos en semantic notes

Uso:
  python run-consolidation.py
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from memory.stores import MemorySystem
from memory.embeddings import LLMKeywordEmbedder
from memory.consolidation import run_consolidation

DB_PATH = SKILL_DIR / "data" / "memory.db"
LANCEDB_PATH = SKILL_DIR / "data" / "lancedb"


def main():
    print("=" * 60)
    print("CONSOLIDACIÓN DE MEMORIA — Reflection periódica")
    print("=" * 60)

    memory = MemorySystem(
        db_path=str(DB_PATH),
        lancedb_path=str(LANCEDB_PATH),
        embedder=LLMKeywordEmbedder(),
    )

    print(f"\nEstado antes de consolidación:")
    import sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    print(f"  Episodios: {conn.execute('SELECT COUNT(*) FROM episodes').fetchone()[0]}")
    print(f"  Patrones: {conn.execute('SELECT COUNT(*) FROM semantic_notes').fetchone()[0]}")
    print(f"  Skills: {conn.execute('SELECT COUNT(*) FROM skills').fetchone()[0]}")
    print(f"  Anti-patterns: {conn.execute('SELECT COUNT(*) FROM anti_patterns').fetchone()[0]}")
    print(f"  Consolidation runs: {conn.execute('SELECT COUNT(*) FROM consolidation_runs').fetchone()[0]}")
    conn.close()

    print(f"\nEjecutando consolidación...")
    stats = run_consolidation(
        memory,
        days_back=365,  # todos los episodios
        min_pattern_occurrences=2,  # bajo threshold porque tenemos pocos episodios
        min_skill_successes=2,
        verbose=True,
    )

    print(f"\n{'='*60}")
    print("RESULTADO DE CONSOLIDACIÓN")
    print("=" * 60)
    print(f"  Episodios procesados: {stats.get('episodes_processed', 0)}")
    print(f"  Patrones extraídos: {stats.get('patterns_extracted', 0)}")
    print(f"  Skills promovidas: {stats.get('skills_promoted', 0)}")
    print(f"  Anti-patterns añadidos: {stats.get('anti_patterns_added', 0)}")

    print(f"\nEstado después de consolidación:")
    conn = sqlite3.connect(str(DB_PATH))
    print(f"  Episodios: {conn.execute('SELECT COUNT(*) FROM episodes').fetchone()[0]}")
    print(f"  Patrones: {conn.execute('SELECT COUNT(*) FROM semantic_notes').fetchone()[0]}")
    print(f"  Skills: {conn.execute('SELECT COUNT(*) FROM skills').fetchone()[0]}")
    print(f"  Anti-patterns: {conn.execute('SELECT COUNT(*) FROM anti_patterns').fetchone()[0]}")
    print(f"  Consolidation runs: {conn.execute('SELECT COUNT(*) FROM consolidation_runs').fetchone()[0]}")
    conn.close()

    memory.close()
    print(f"\n✓ Consolidación completada")


if __name__ == "__main__":
    main()
