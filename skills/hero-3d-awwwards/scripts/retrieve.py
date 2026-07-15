#!/usr/bin/env python3
"""
retrieve.py — Retrieval simulator para el dashboard.

Recibe un brief + vertical opcional, ejecuta la búsqueda real contra
la memory DB usando el mismo tri-score que usaría una sesión real,
y devuelve los patrones/anti-patterns/skills que se recuperarían.

Uso (vía stdin JSON):
    echo '{"brief":"...", "vertical":"..."}' | python3 retrieve.py

Output: JSON a stdout con los resultados.
"""

import json
import sys
import os
from pathlib import Path

# Path setup
SCRIPTS_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPTS_DIR))

from memory import MemorySystem, FakeEmbedder, clear_cache


def main():
    # Read input from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    brief = input_data.get("brief", "")
    vertical = input_data.get("vertical", "")
    archetype = input_data.get("archetype", "")
    stack = input_data.get("stack", "")

    if not brief:
        print(json.dumps({"error": "brief is required"}))
        sys.exit(1)

    # Path to memory DB
    db_path = Path("/home/z/my-project/memory-data/memory.db")
    lancedb_path = Path("/home/z/my-project/memory-data/lancedb")

    if not db_path.exists():
        print(json.dumps({
            "error": "Memory DB not found",
            "db_path": str(db_path),
            "hint": "Run the agent loop first to populate memory"
        }))
        sys.exit(1)

    clear_cache()
    embedder = FakeEmbedder(dimension=64)

    try:
        memory = MemorySystem(
            db_path=db_path,
            lancedb_path=lancedb_path,
            embedder=embedder,
        )

        # Start session (this auto-retrieves)
        memory.start_session(
            brief=brief,
            brief_summary=brief[:200],
            vertical=vertical,
            archetype=archetype,
            stack=stack,
        )

        # Format output
        patterns = []
        for p in memory.working.retrieved_patterns:
            patterns.append({
                "id": p.get("id", ""),
                "content": p.get("content", ""),
                "category": p.get("category", ""),
                "importance": p.get("importance", 5),
                "vertical": p.get("vertical", ""),
            })

        skills = []
        for s in memory.working.retrieved_skills:
            skills.append({
                "id": s.get("id", ""),
                "description": s.get("description", ""),
                "success_count": s.get("success_count", 0),
                "valid_verticals": json.loads(s.get("valid_verticals", "[]")) if s.get("valid_verticals") else [],
            })

        anti_patterns = []
        for ap in memory.working.retrieved_anti_patterns:
            anti_patterns.append({
                "id": ap.get("id", ""),
                "description": ap.get("description", ""),
                "failure_mode": ap.get("failure_mode", ""),
                "occurrence_count": ap.get("occurrence_count", 1),
            })

        output = {
            "brief": brief,
            "vertical": vertical,
            "patterns": patterns,
            "skills": skills,
            "anti_patterns": anti_patterns,
            "stats": memory.stats(),
        }

        memory.close()
        print(json.dumps(output, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
