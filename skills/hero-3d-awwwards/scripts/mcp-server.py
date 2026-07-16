#!/usr/bin/env python3
"""
mcp-server.py — MCP (Model Context Protocol) server para hero-3d-awwwards.

Expone la skill como tools consumibles por Claude, Cursor, v0, u otros
agents compatibles con MCP.

Tools expuestas:
  - retrieve_patterns: recupera patrones relevantes de memoria dado un brief
  - retrieve_anti_patterns: recupera anti-patterns relevantes
  - generate_hero: Creator genera código de hero dado un brief
  - audit_hero: VLM Auditor analiza visualmente un hero en una URL
  - list_heroes: lista todos los heroes construidos con scores
  - get_memory_stats: devuelve estadísticas de la memoria

Uso:
  python mcp-server.py  # inicia server stdio

Configuración en Claude Desktop / Cursor:
  {
    "mcpServers": {
      "hero-3d-awwwards": {
        "command": "python3",
        "args": ["path/to/mcp-server.py"]
      }
    }
  }
"""

import json
import sys
import subprocess
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from memory.stores import MemorySystem
from memory.embeddings import LLMKeywordEmbedder

DB_PATH = SKILL_DIR / "data" / "memory.db"
LANCEDB_PATH = SKILL_DIR / "data" / "lancedb"


def get_memory():
    return MemorySystem(
        db_path=str(DB_PATH),
        lancedb_path=str(LANCEDB_PATH),
        embedder=LLMKeywordEmbedder(),
    )


# ============================================================
# TOOLS
# ============================================================

def tool_retrieve_patterns(brief: str, top_k: int = 5) -> list[dict]:
    """Recupera patrones relevantes de memoria dado un brief."""
    memory = get_memory()
    try:
        results = memory.semantic.search(brief, top_k=top_k, vertical_filter=None)
        return [
            {"content": note.get("content", ""), "score": round(score, 3), "vertical": note.get("vertical", "")}
            for note, score in results
        ]
    finally:
        memory.close()


def tool_retrieve_anti_patterns(brief: str, top_k: int = 3) -> list[dict]:
    """Recupera anti-patterns relevantes."""
    memory = get_memory()
    try:
        results = memory.anti_patterns.search(brief, top_k=top_k)
        return [
            {"description": ap.get("description", ""), "occurrence_count": ap.get("occurrence_count", 1)}
            for ap in results
        ]
    finally:
        memory.close()


def tool_generate_hero(brief: str) -> dict:
    """Creator genera código de hero dado un brief."""
    from pathlib import Path as P
    creator_prompt = (P(SCRIPT_DIR / "prompts" / "creator-v2.md")).read_text(encoding="utf-8")[:3000]

    combined = f"[SYSTEM]\n{creator_prompt}\n\n[USER]\nBRIEF:\n{brief}\n\nGenera código en ```tsx```."
    result = subprocess.run(
        ["z-ai", "chat", "-p", combined, "-m", "glm-4.6", "-o", "/tmp/mcp-generate.json"],
        capture_output=True, text=True, timeout=180
    )
    if result.returncode != 0:
        return {"error": result.stderr[:200]}

    data = json.loads(Path("/tmp/mcp-generate.json").read_text(encoding="utf-8"))
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    code = ""
    if "```tsx" in content:
        start = content.find("```tsx") + 6
        end = content.find("```", start)
        if end > start:
            code = content[start:end].strip()

    return {"code": code, "length": len(code)}


def tool_audit_hero(url: str) -> dict:
    """VLM Auditor analiza visualmente un hero en una URL."""
    sys.path.insert(0, str(SKILL_DIR / "evals" / "visual"))
    from vlm_auditor import audit_hero

    result = audit_hero(url, "mcp-audit", steps=[0.0, 0.5, 1.0])
    if "error" in result:
        return {"error": result["error"]}

    return {
        "score": result["avg_score"],
        "bugs": [b["bug"] for b in result.get("bugs", [])][:3],
        "recomendaciones": [r["rec"] for r in result.get("recomendaciones", [])][:3],
    }


def tool_list_heroes() -> list[dict]:
    """Lista todos los heroes construidos."""
    memory = get_memory()
    try:
        import sqlite3
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT brief_summary, vertical, archetype, stack, final_score, outcome FROM episodes ORDER BY timestamp DESC"
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    finally:
        memory.close()


def tool_get_memory_stats() -> dict:
    """Devuelve estadísticas de la memoria."""
    import sqlite3
    conn = sqlite3.connect(str(DB_PATH))
    stats = {
        "episodes": conn.execute("SELECT COUNT(*) FROM episodes").fetchone()[0],
        "patterns": conn.execute("SELECT COUNT(*) FROM semantic_notes").fetchone()[0],
        "skills": conn.execute("SELECT COUNT(*) FROM skills").fetchone()[0],
        "anti_patterns": conn.execute("SELECT COUNT(*) FROM anti_patterns").fetchone()[0],
        "consolidation_runs": conn.execute("SELECT COUNT(*) FROM consolidation_runs").fetchone()[0],
    }
    avg = conn.execute("SELECT AVG(final_score) FROM episodes").fetchone()[0]
    stats["avg_score"] = round(avg, 2) if avg else 0
    conn.close()
    return stats


# ============================================================
# MCP SERVER (simplified stdio protocol)
# ============================================================

TOOLS = {
    "retrieve_patterns": {
        "description": "Recupera patrones relevantes de memoria dado un brief de hero",
        "inputSchema": {
            "type": "object",
            "properties": {
                "brief": {"type": "string", "description": "Brief del hero a generar"},
                "top_k": {"type": "integer", "default": 5},
            },
            "required": ["brief"],
        },
        "handler": lambda args: tool_retrieve_patterns(args["brief"], args.get("top_k", 5)),
    },
    "retrieve_anti_patterns": {
        "description": "Recupera anti-patterns relevantes para evitar errores conocidos",
        "inputSchema": {
            "type": "object",
            "properties": {
                "brief": {"type": "string"},
                "top_k": {"type": "integer", "default": 3},
            },
            "required": ["brief"],
        },
        "handler": lambda args: tool_retrieve_anti_patterns(args["brief"], args.get("top_k", 3)),
    },
    "generate_hero": {
        "description": "Creator genera código de hero dado un brief",
        "inputSchema": {
            "type": "object",
            "properties": {
                "brief": {"type": "string", "description": "Brief del hero"},
            },
            "required": ["brief"],
        },
        "handler": lambda args: tool_generate_hero(args["brief"]),
    },
    "audit_hero": {
        "description": "VLM Auditor analiza visualmente un hero en una URL",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL del hero a auditar"},
            },
            "required": ["url"],
        },
        "handler": lambda args: tool_audit_hero(args["url"]),
    },
    "list_heroes": {
        "description": "Lista todos los heroes construidos con scores",
        "inputSchema": {"type": "object", "properties": {}},
        "handler": lambda args: tool_list_heroes(),
    },
    "get_memory_stats": {
        "description": "Devuelve estadísticas de la memoria (episodios, patrones, skills, anti-patterns)",
        "inputSchema": {"type": "object", "properties": {}},
        "handler": lambda args: tool_get_memory_stats(),
    },
}


def handle_request(request: dict) -> dict:
    """Maneja una petición MCP."""
    method = request.get("method", "")
    req_id = request.get("id", 0)

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "hero-3d-awwwards", "version": "1.0.0"},
            },
        }

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": name,
                        "description": t["description"],
                        "inputSchema": t["inputSchema"],
                    }
                    for name, t in TOOLS.items()
                ]
            },
        }

    elif method == "tools/call":
        tool_name = request.get("params", {}).get("name", "")
        tool_args = request.get("params", {}).get("arguments", {})

        if tool_name not in TOOLS:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
            }

        try:
            result = TOOLS[tool_name]["handler"](tool_args)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {"type": "text", "text": json.dumps(result, indent=2, ensure_ascii=False)}
                    ]
                },
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32603, "message": str(e)},
            }

    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown method: {method}"}}


def main():
    """Server loop stdio."""
    # Si se pasa --test, ejecutar test rápido
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("Testing MCP tools...")
        print("\n1. get_memory_stats:")
        print(json.dumps(tool_get_memory_stats(), indent=2))
        print("\n2. list_heroes:")
        heroes = tool_list_heroes()
        for h in heroes[:3]:
            print(f"  {h['brief_summary'][:60]}... score={h['final_score']}")
        print(f"  ... ({len(heroes)} total)")
        print("\n3. retrieve_patterns('hero cyberpunk neon'):")
        patterns = tool_retrieve_patterns("hero cyberpunk neon")
        for p in patterns[:3]:
            print(f"  [{p['score']}] {p['content'][:80]}")
        print("\n✓ MCP server tools funcionan correctamente")
        return

    # Modo server stdio
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except json.JSONDecodeError:
            sys.stderr.write(f"Invalid JSON: {line}\n")
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")


if __name__ == "__main__":
    main()
