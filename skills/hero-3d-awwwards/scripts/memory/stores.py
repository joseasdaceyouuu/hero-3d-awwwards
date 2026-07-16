"""
Memory stores for the hero-3d-awwwards agent loop.

5 stores backed by SQLite + LanceDB:

    WorkingMemory      — in-process dict per iteration (not persisted)
    EpisodicStore      — full past hero sessions
    SemanticStore      — atomic facts extracted from episodes
    ProceduralStore    — reusable skill templates (Voyager-style)
    AntiPatternStore   — known failure patterns to avoid

Plus MemorySystem, which orchestrates all 5 and provides the high-level
API used by hero-loop.py:

    memory = MemorySystem(db_path="memory.db", lancedb_path="./lancedb")
    memory.start_session(brief="...")
    patterns = memory.retrieve_relevant_patterns(brief, top_k=5)
    skills = memory.retrieve_relevant_skills(brief, top_k=3)
    anti_patterns = memory.retrieve_relevant_anti_patterns(brief, top_k=3)
    # ... run agent loop ...
    memory.save_iteration(iteration_data)
    memory.finalize_session(outcome="success", final_score=9.1)
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, Sequence

from .embeddings import Embedder, get_embedder
from .retrieval import tri_score, retrieve_top_k, cosine_sim
from .compression import (
    hash_content,
    hash_files,
    toon_compress_audit,
    compress_iteration_for_replay,
    compress_iteration_history,
)


# ============================================================
# HELPERS
# ============================================================

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _uuid() -> str:
    return str(uuid.uuid4())


def _connect_db(db_path: str | Path) -> sqlite3.Connection:
    """Connect to SQLite with WAL mode and foreign keys enabled."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _init_schema(conn: sqlite3.Connection, schema_path: Path | None = None) -> None:
    """Apply schema.sql if not already applied."""
    if schema_path is None:
        schema_path = Path(__file__).parent / "schema.sql"
    schema_sql = schema_path.read_text(encoding="utf-8")
    conn.executescript(schema_sql)
    conn.commit()


# ============================================================
# LANCEDB WRAPPER (lazy import)
# ============================================================

class VectorIndex:
    """Thin wrapper around LanceDB for storing/querying embeddings.

    Falls back to JSON-file-backed dict if LanceDB is not installed.
    The JSON fallback persists across sessions (file: <db_path>/<table>.json).
    """

    def __init__(self, db_path: str | Path, table_name: str, dimension: int):
        self.db_path = str(db_path)
        self.table_name = table_name
        self.dimension = dimension
        self._table = None
        self._fallback: dict[str, list[float]] = {}
        self._fallback_meta: dict[str, dict] = {}
        self._fallback_file: Path = Path(db_path) / f"{table_name}.json"
        self._init_table()

    def _init_table(self) -> None:
        try:
            import lancedb
            db = lancedb.connect(self.db_path)
            try:
                self._table = db.open_table(self.table_name)
            except Exception:
                # Create new table
                import pyarrow as pa
                schema = pa.schema([
                    pa.field("id", pa.string()),
                    pa.field("vector", pa.list_(pa.float32(), self.dimension)),
                    pa.field("metadata", pa.string()),  # JSON
                ])
                self._table = db.create_table(self.table_name, schema=schema)
        except ImportError:
            # Fallback: JSON-file-backed (persistent across sessions)
            self._table = None
            Path(self.db_path).mkdir(parents=True, exist_ok=True)
            if self._fallback_file.exists():
                try:
                    data = json.loads(self._fallback_file.read_text(encoding="utf-8"))
                    self._fallback = data.get("vectors", {})
                    self._fallback_meta = data.get("metadata", {})
                except Exception:
                    self._fallback = {}
                    self._fallback_meta = {}

    def _save_fallback(self) -> None:
        """Persist fallback to JSON file."""
        if self._table is None:
            try:
                self._fallback_file.write_text(
                    json.dumps({
                        "vectors": self._fallback,
                        "metadata": self._fallback_meta,
                    }),
                    encoding="utf-8",
                )
            except Exception:
                pass

    def add(self, id: str, vector: list[float], metadata: dict | None = None) -> None:
        if self._table is not None:
            import pyarrow as pa
            data = [{
                "id": id,
                "vector": vector,
                "metadata": json.dumps(metadata or {}),
            }]
            self._table.add(data)
        else:
            self._fallback[id] = vector
            self._fallback_meta[id] = metadata or {}
            self._save_fallback()

    def search(
        self,
        query_vector: list[float],
        top_k: int = 10,
    ) -> list[tuple[str, float, dict]]:
        """Search for similar vectors. Returns [(id, similarity, metadata)]."""
        if self._table is not None:
            results = (
                self._table.search(query_vector)
                .limit(top_k)
                .to_list()
            )
            out = []
            for r in results:
                sim = max(0.0, min(1.0, (r.get("_distance", 1.0) - 0) / 2))
                # LanceDB returns L2 distance; convert to similarity approx
                # For normalized vectors, cosine_sim = 1 - L2^2 / 2
                # We just use 1 - distance as approximation
                sim = max(0.0, 1.0 - r.get("_distance", 1.0))
                metadata = json.loads(r.get("metadata", "{}"))
                out.append((r["id"], sim, metadata))
            return out
        else:
            # Fallback: brute-force cosine similarity (persistent via JSON)
            scored = []
            for id, vec in self._fallback.items():
                sim = cosine_sim(query_vector, vec)
                sim = max(0.0, min(1.0, (sim + 1.0) / 2.0))
                meta = self._fallback_meta.get(id, {})
                scored.append((id, sim, meta))
            scored.sort(key=lambda x: -x[1])
            return scored[:top_k]

    def get(self, id: str) -> Optional[list[float]]:
        if self._table is not None:
            results = self._table.search().where(f"id = '{id}'").to_list()
            if results:
                return results[0]["vector"]
            return None
        else:
            return self._fallback.get(id)


# ============================================================
# WORKING MEMORY (in-process)
# ============================================================

class WorkingMemory:
    """In-process state for the current iteration.

    Not persisted to disk. Use save_iteration() on MemorySystem to persist
    to episodic memory.

    Stores:
        - current brief
        - current code (by reference, content in code_hashes table)
        - current audit JSON
        - current subjective JSON
        - iteration counter
        - retrieved patterns/skills/anti_patterns for this session
    """

    def __init__(self):
        self.brief: str = ""
        self.brief_summary: str = ""
        self.vertical: str = ""
        self.archetype: str = ""
        self.stack: str = ""
        self.iteration: int = 0
        self.code: dict[str, str] = {}  # path -> content
        self.audit: dict = {}
        self.subjective: dict = {}
        self.retrieved_patterns: list[dict] = []
        self.retrieved_skills: list[dict] = []
        self.retrieved_anti_patterns: list[dict] = []
        self.iterations_history: list[dict] = []

    def start_iteration(self, num: int) -> None:
        self.iteration = num

    def set_code(self, code: dict[str, str]) -> None:
        self.code = code

    def set_audit(self, audit: dict) -> None:
        self.audit = audit

    def set_subjective(self, subjective: dict) -> None:
        self.subjective = subjective

    def record_iteration(self) -> dict:
        """Snapshot the current iteration to history."""
        snapshot = {
            "iteration": self.iteration,
            "audit": self.audit,
            "subjective": self.subjective,
            "code_paths": list(self.code.keys()),
        }
        self.iterations_history.append(snapshot)
        return snapshot

    def compressed_history(self) -> str:
        """Return the iteration history with graduated compression."""
        return compress_iteration_history(self.iterations_history, self.iteration)

    def context_for_agent(self, agent_role: str) -> dict:
        """Build context dict for an agent prompt.

        Args:
            agent_role: 'creator' | 'auditor' | 'user_simulator' | 'corrector'

        Returns:
            dict with brief, patterns, skills, anti_patterns, history
        """
        return {
            "brief": self.brief,
            "brief_summary": self.brief_summary,
            "vertical": self.vertical,
            "archetype": self.archetype,
            "stack": self.stack,
            "iteration": self.iteration,
            "patterns": self.retrieved_patterns,
            "skills": self.retrieved_skills,
            "anti_patterns": self.retrieved_anti_patterns,
            "history": self.compressed_history() if self.iterations_history else "",
        }


# ============================================================
# EPISODIC STORE
# ============================================================

class EpisodicStore:
    """Raw past hero sessions.

    Each completed hero becomes an episode. Stored as a row in SQLite +
    an embedding in LanceDB for similarity search.
    """

    def __init__(self, conn: sqlite3.Connection, vector_index: VectorIndex, embedder: Embedder):
        self.conn = conn
        self.vector_index = vector_index
        self.embedder = embedder

    def save_episode(
        self,
        brief: str,
        brief_summary: str,
        vertical: str,
        archetype: str,
        stack: str,
        final_score: float,
        final_subjective_score: float,
        outcome: str,
        iterations: list[dict],
        code: dict[str, str],
        user_feedback: str = "",
    ) -> str:
        """Save a completed hero session as an episode."""
        episode_id = _uuid()
        timestamp = _now_iso()

        # Hash code files and store content in code_hashes table
        code_hashes = {}
        for path, content in code.items():
            h = hash_content(content)
            code_hashes[path] = h
            self.conn.execute(
                "INSERT OR IGNORE INTO code_hashes (hash, content) VALUES (?, ?)",
                (h, content),
            )
            self.conn.execute(
                "UPDATE code_hashes SET reference_count = reference_count + 1 WHERE hash = ?",
                (h,),
            )

        # Embed the brief summary for retrieval
        embedding = self.embedder.embed(brief_summary)
        self.vector_index.add(episode_id, embedding, {"vertical": vertical})

        # Store episode
        self.conn.execute(
            """INSERT INTO episodes
            (id, timestamp, brief, brief_summary, vertical, archetype, stack,
             final_score, final_subjective_score, outcome, user_feedback,
             code_hashes, iterations_json, embedding_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                episode_id,
                timestamp,
                brief,
                brief_summary,
                vertical,
                archetype,
                stack,
                final_score,
                final_subjective_score,
                outcome,
                user_feedback,
                json.dumps(code_hashes),
                json.dumps(iterations, default=str),
                episode_id,
            ),
        )
        self.conn.commit()
        return episode_id

    def search_similar(
        self,
        query_summary: str,
        top_k: int = 3,
        vertical_filter: Optional[str] = None,
    ) -> list[tuple[dict, float]]:
        """Find similar past episodes by brief similarity."""
        query_vec = self.embedder.embed(query_summary)
        results = self.vector_index.search(query_vec, top_k=top_k * 2)  # over-fetch for filtering

        out = []
        for ep_id, sim, metadata in results:
            row = self.conn.execute(
                "SELECT * FROM episodes WHERE id = ?", (ep_id,)
            ).fetchone()
            if row is None:
                continue
            if vertical_filter and row["vertical"] != vertical_filter:
                continue
            episode = dict(row)
            episode["iterations"] = json.loads(episode.get("iterations_json", "[]"))
            episode["code_hashes"] = json.loads(episode.get("code_hashes", "{}"))
            out.append((episode, sim))
            if len(out) >= top_k:
                break
        return out

    def get_code_by_hash(self, hash: str) -> Optional[str]:
        """Retrieve code content by hash."""
        row = self.conn.execute(
            "SELECT content FROM code_hashes WHERE hash = ?", (hash,)
        ).fetchone()
        return row["content"] if row else None

    def get_episode(self, episode_id: str) -> Optional[dict]:
        row = self.conn.execute(
            "SELECT * FROM episodes WHERE id = ?", (episode_id,)
        ).fetchone()
        if row is None:
            return None
        episode = dict(row)
        episode["iterations"] = json.loads(episode.get("iterations_json", "[]"))
        episode["code_hashes"] = json.loads(episode.get("code_hashes", "{}"))
        return episode

    def count(self) -> int:
        row = self.conn.execute("SELECT COUNT(*) as n FROM episodes").fetchone()
        return row["n"]


# ============================================================
# SEMANTIC STORE
# ============================================================

class SemanticStore:
    """Atomic facts extracted from episodes.

    Examples:
        - "Parallax 2.5D with 3-5 layers works for photographer portfolios"
        - "Magenta + black + white palette achieves premium feel for creative"
    """

    def __init__(self, conn: sqlite3.Connection, vector_index: VectorIndex, embedder: Embedder):
        self.conn = conn
        self.vector_index = vector_index
        self.embedder = embedder

    def add(
        self,
        content: str,
        vertical: str = "",
        category: str = "",
        importance: int = 5,
        source_episodes: Optional[list[str]] = None,
        links: Optional[list[str]] = None,
        valid_until: Optional[str] = None,
    ) -> str:
        note_id = _uuid()
        now = _now_iso()
        embedding = self.embedder.embed(content)
        self.vector_index.add(note_id, embedding, {"vertical": vertical, "category": category})

        self.conn.execute(
            """INSERT INTO semantic_notes
            (id, content, vertical, category, importance, source_episodes,
             created_at, last_accessed, access_count, valid_until, links)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (
                note_id, content, vertical, category, importance,
                json.dumps(source_episodes or []),
                now, now, valid_until,
                json.dumps(links or []),
            ),
        )
        self.conn.commit()
        return note_id

    def search(
        self,
        query: str,
        top_k: int = 5,
        vertical_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        min_score: float = 0.0,
    ) -> list[tuple[dict, float]]:
        """Search semantic notes by tri-score."""
        query_vec = self.embedder.embed(query)

        # Get candidate notes from vector index
        results = self.vector_index.search(query_vec, top_k=top_k * 3)

        # Fetch full records and apply tri-score
        memories = []
        embeddings = {}
        for note_id, _, _ in results:
            row = self.conn.execute(
                "SELECT * FROM semantic_notes WHERE id = ?", (note_id,)
            ).fetchone()
            if row is None:
                continue
            note = dict(row)
            if vertical_filter and note["vertical"] != vertical_filter:
                continue
            if category_filter and note["category"] != category_filter:
                continue
            # Skip expired notes
            if note["valid_until"]:
                try:
                    expiry = datetime.fromisoformat(note["valid_until"].replace("Z", "+00:00"))
                    if datetime.utcnow() > expiry.replace(tzinfo=None):
                        continue
                except Exception:
                    pass
            note["source_episodes"] = json.loads(note.get("source_episodes", "[]"))
            note["links"] = json.loads(note.get("links", "[]"))
            memories.append(note)
            emb = self.vector_index.get(note_id)
            if emb:
                embeddings[note_id] = emb

        # Apply tri-score
        scored = retrieve_top_k(
            memories,
            query_vec,
            embeddings,
            k=top_k,
            store_type="semantic",
            min_score=min_score,
        )

        # Update last_accessed for retrieved notes
        now = _now_iso()
        for note, _ in scored:
            self.conn.execute(
                "UPDATE semantic_notes SET last_accessed = ?, access_count = access_count + 1 WHERE id = ?",
                (now, note["id"]),
            )
        self.conn.commit()

        return scored

    def count(self) -> int:
        row = self.conn.execute("SELECT COUNT(*) as n FROM semantic_notes").fetchone()
        return row["n"]


# ============================================================
# PROCEDURAL STORE (skills)
# ============================================================

class ProceduralStore:
    """Reusable skill templates (Voyager-style).

    Skills are code templates with parameter placeholders, indexed by
    the embedding of their description. Skills get promoted from
    recurring successful patterns during consolidation.
    """

    def __init__(self, conn: sqlite3.Connection, vector_index: VectorIndex, embedder: Embedder):
        self.conn = conn
        self.vector_index = vector_index
        self.embedder = embedder

    def add(
        self,
        description: str,
        code_template: str,
        parameters: Optional[dict] = None,
        source_episodes: Optional[list[str]] = None,
        valid_verticals: Optional[list[str]] = None,
    ) -> str:
        skill_id = _uuid()
        embedding = self.embedder.embed(description)
        self.vector_index.add(skill_id, embedding, {"verticals": valid_verticals or []})

        self.conn.execute(
            """INSERT INTO skills
            (id, description, code_template, parameters, success_count, fail_count,
             last_used, source_episodes, valid_verticals, created_at, status)
            VALUES (?, ?, ?, ?, 0, 0, NULL, ?, ?, ?, 'active')""",
            (
                skill_id, description, code_template,
                json.dumps(parameters or {}),
                json.dumps(source_episodes or []),
                json.dumps(valid_verticals or []),
                _now_iso(),
            ),
        )
        self.conn.commit()
        return skill_id

    def search(
        self,
        query: str,
        top_k: int = 3,
        vertical_filter: Optional[str] = None,
        active_only: bool = True,
        min_score: float = 0.0,
    ) -> list[tuple[dict, float]]:
        query_vec = self.embedder.embed(query)
        results = self.vector_index.search(query_vec, top_k=top_k * 3)

        memories = []
        embeddings = {}
        for skill_id, _, _ in results:
            row = self.conn.execute(
                "SELECT * FROM skills WHERE id = ?", (skill_id,)
            ).fetchone()
            if row is None:
                continue
            skill = dict(row)
            if active_only and skill["status"] != "active":
                continue
            if vertical_filter:
                verts = json.loads(skill.get("valid_verticals", "[]"))
                if verts and vertical_filter not in verts:
                    continue
            skill["parameters"] = json.loads(skill.get("parameters", "{}"))
            skill["source_episodes"] = json.loads(skill.get("source_episodes", "[]"))
            skill["valid_verticals"] = json.loads(skill.get("valid_verticals", "[]"))
            memories.append(skill)
            emb = self.vector_index.get(skill_id)
            if emb:
                embeddings[skill_id] = emb

        scored = retrieve_top_k(
            memories,
            query_vec,
            embeddings,
            k=top_k,
            store_type="procedural",
            min_score=min_score,
        )

        # Update last_used
        now = _now_iso()
        for skill, _ in scored:
            self.conn.execute(
                "UPDATE skills SET last_used = ? WHERE id = ?",
                (now, skill["id"]),
            )
        self.conn.commit()

        return scored

    def record_outcome(self, skill_id: str, success: bool) -> None:
        """Record that a skill was used and succeeded/failed."""
        if success:
            self.conn.execute(
                "UPDATE skills SET success_count = success_count + 1 WHERE id = ?",
                (skill_id,),
            )
        else:
            self.conn.execute(
                "UPDATE skills SET fail_count = fail_count + 1 WHERE id = ?",
                (skill_id,),
            )
            # Auto-quarantine if fail_count > success_count after 5 uses
            row = self.conn.execute(
                "SELECT success_count, fail_count FROM skills WHERE id = ?",
                (skill_id,),
            ).fetchone()
            if row and row["fail_count"] > row["success_count"] and (row["success_count"] + row["fail_count"]) >= 5:
                self.conn.execute(
                    "UPDATE skills SET status = 'quarantined' WHERE id = ?",
                    (skill_id,),
                )
        self.conn.commit()

    def count(self, active_only: bool = True) -> int:
        if active_only:
            row = self.conn.execute(
                "SELECT COUNT(*) as n FROM skills WHERE status = 'active'"
            ).fetchone()
        else:
            row = self.conn.execute("SELECT COUNT(*) as n FROM skills").fetchone()
        return row["n"]


# ============================================================
# ANTI-PATTERN STORE
# ============================================================

class AntiPatternStore:
    """Known failure patterns to avoid.

    Smaller set than semantic notes. No embeddings — simple SQL search
    by description substring match + recency ranking.
    """

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def add(
        self,
        description: str,
        failure_mode: str = "",
        episode_id: str = "",
        criterion_id: str = "",
    ) -> str:
        ap_id = _uuid()
        now = _now_iso()
        occurrences = [{"episode_id": episode_id, "criterion_id": criterion_id, "timestamp": now}]

        self.conn.execute(
            """INSERT INTO anti_patterns
            (id, description, failure_mode, occurrences, occurrence_count,
             created_at, last_seen, status)
            VALUES (?, ?, ?, ?, 1, ?, ?, 'active')""",
            (ap_id, description, failure_mode, json.dumps(occurrences), now, now),
        )
        self.conn.commit()
        return ap_id

    def find_similar(self, description: str) -> Optional[dict]:
        """Find an existing anti-pattern with similar description (simple substring match)."""
        # Simple: check if any existing description is a substring or vice versa
        rows = self.conn.execute(
            "SELECT * FROM anti_patterns WHERE status = 'active'"
        ).fetchall()
        for row in rows:
            existing = row["description"].lower()
            new = description.lower()
            if existing in new or new in existing:
                ap = dict(row)
                ap["occurrences"] = json.loads(ap.get("occurrences", "[]"))
                return ap
        return None

    def record_occurrence(
        self,
        ap_id: str,
        episode_id: str = "",
        criterion_id: str = "",
    ) -> None:
        """Record another occurrence of an existing anti-pattern."""
        row = self.conn.execute(
            "SELECT occurrences FROM anti_patterns WHERE id = ?", (ap_id,)
        ).fetchone()
        if row is None:
            return
        occurrences = json.loads(row["occurrences"])
        occurrences.append({
            "episode_id": episode_id,
            "criterion_id": criterion_id,
            "timestamp": _now_iso(),
        })
        self.conn.execute(
            """UPDATE anti_patterns
            SET occurrences = ?, occurrence_count = ?, last_seen = ?
            WHERE id = ?""",
            (json.dumps(occurrences), len(occurrences), _now_iso(), ap_id),
        )
        self.conn.commit()

    def search(
        self,
        query: str,
        top_k: int = 3,
        active_only: bool = True,
    ) -> list[dict]:
        """Search anti-patterns by description match.

        No embeddings — uses simple ILIKE matching. Recency boost.
        """
        # Split query into terms and require at least one match
        terms = [t.lower() for t in query.split() if len(t) > 2]
        if not terms:
            return []

        rows = self.conn.execute(
            "SELECT * FROM anti_patterns WHERE status = ?",
            ("active" if active_only else "active",) if active_only else ("active",) if active_only else ("%",),
        ).fetchall()

        # If active_only was False we need to fetch all
        if not active_only:
            rows = self.conn.execute("SELECT * FROM anti_patterns").fetchall()

        scored = []
        for row in rows:
            ap = dict(row)
            desc = ap["description"].lower()
            # Count term matches
            matches = sum(1 for t in terms if t in desc)
            if matches == 0:
                continue
            # Score: term match ratio + recency boost
            match_score = matches / len(terms)
            # Recency: more recent = higher
            try:
                last_seen = datetime.fromisoformat(ap["last_seen"].replace("Z", "+00:00")).replace(tzinfo=None)
                days_since = max(0, (datetime.utcnow() - last_seen).days)
                recency = 0.5 ** (days_since / 365.0)  # half-life 1 year
            except Exception:
                recency = 0.5

            # Occurrence count boost (more occurrences = more important)
            occurrence_boost = min(1.0, ap["occurrence_count"] / 5.0)

            score = 0.5 * match_score + 0.2 * recency + 0.3 * occurrence_boost
            ap["occurrences"] = json.loads(ap.get("occurrences", "[]"))
            scored.append((ap, score))

        scored.sort(key=lambda x: -x[1])
        return [ap for ap, _ in scored[:top_k]]

    def count(self, active_only: bool = True) -> int:
        if active_only:
            row = self.conn.execute(
                "SELECT COUNT(*) as n FROM anti_patterns WHERE status = 'active'"
            ).fetchone()
        else:
            row = self.conn.execute("SELECT COUNT(*) as n FROM anti_patterns").fetchone()
        return row["n"]


# ============================================================
# MEMORY SYSTEM — orchestrator
# ============================================================

class MemorySystem:
    """Top-level orchestrator. Use this in hero-loop.py.

    Usage:
        memory = MemorySystem(db_path="memory.db", lancedb_path="./.lancedb")
        memory.start_session(
            brief="Design a hero for a photographer portfolio",
            vertical="portfolio",
        )
        # ... run agent loop ...
        memory.save_iteration(iteration_data)
        # ... more iterations ...
        memory.finalize_session(
            outcome="success",
            final_score=9.1,
            final_subjective_score=8.0,
            user_feedback="Looks great!",
        )
    """

    def __init__(
        self,
        db_path: str | Path = "memory.db",
        lancedb_path: str | Path = "./.lancedb",
        embedder: Optional[Embedder] = None,
    ):
        self.db_path = Path(db_path)
        self.lancedb_path = Path(lancedb_path)
        self.lancedb_path.mkdir(parents=True, exist_ok=True)

        self.conn = _connect_db(self.db_path)
        _init_schema(self.conn)

        self.embedder = embedder or get_embedder()
        dim = self.embedder.dimension

        # One vector index per store
        self.episode_vec = VectorIndex(self.lancedb_path, "episode_embeddings", dim)
        self.semantic_vec = VectorIndex(self.lancedb_path, "semantic_embeddings", dim)
        self.skill_vec = VectorIndex(self.lancedb_path, "skill_embeddings", dim)

        # Stores
        self.working = WorkingMemory()
        self.episodic = EpisodicStore(self.conn, self.episode_vec, self.embedder)
        self.semantic = SemanticStore(self.conn, self.semantic_vec, self.embedder)
        self.procedural = ProceduralStore(self.conn, self.skill_vec, self.embedder)
        self.anti_patterns = AntiPatternStore(self.conn)

        self._session_started = False

    def start_session(
        self,
        brief: str,
        brief_summary: str = "",
        vertical: str = "",
        archetype: str = "",
        stack: str = "",
    ) -> None:
        """Start a new hero design session."""
        self.working = WorkingMemory()
        self.working.brief = brief
        self.working.brief_summary = brief_summary or brief[:200]
        self.working.vertical = vertical
        self.working.archetype = archetype
        self.working.stack = stack
        self.working.iteration = 0

        # Retrieve relevant patterns, skills, anti-patterns for this brief
        self.working.retrieved_patterns = [
            p for p, _ in self.semantic.search(
                brief_summary or brief,
                top_k=5,
                vertical_filter=vertical or None,
            )
        ]
        self.working.retrieved_skills = [
            s for s, _ in self.procedural.search(
                brief_summary or brief,
                top_k=3,
                vertical_filter=vertical or None,
            )
        ]
        self.working.retrieved_anti_patterns = self.anti_patterns.search(
            brief_summary or brief,
            top_k=3,
        )

        self._session_started = True

    def save_iteration(
        self,
        iteration: int,
        code: dict[str, str],
        audit: dict,
        subjective: Optional[dict] = None,
    ) -> None:
        """Save the result of an iteration to working memory."""
        if not self._session_started:
            raise RuntimeError("Call start_session() first")

        self.working.iteration = iteration
        self.working.code = code
        self.working.audit = audit
        self.working.subjective = subjective or {}
        self.working.record_iteration()

    def retrieve_relevant_episodes(self, top_k: int = 2) -> list[tuple[dict, float]]:
        """Retrieve similar past episodes for few-shot injection."""
        return self.episodic.search_similar(
            self.working.brief_summary,
            top_k=top_k,
            vertical_filter=self.working.vertical or None,
        )

    def finalize_session(
        self,
        outcome: str,
        final_score: float,
        final_subjective_score: float = 0.0,
        user_feedback: str = "",
    ) -> str:
        """Finalize the session and save to episodic memory.

        Returns the episode_id.
        """
        if not self._session_started:
            raise RuntimeError("Call start_session() first")

        episode_id = self.episodic.save_episode(
            brief=self.working.brief,
            brief_summary=self.working.brief_summary,
            vertical=self.working.vertical,
            archetype=self.working.archetype,
            stack=self.working.stack,
            final_score=final_score,
            final_subjective_score=final_subjective_score,
            outcome=outcome,
            iterations=self.working.iterations_history,
            code=self.working.code,
            user_feedback=user_feedback,
        )

        self._session_started = False
        return episode_id

    def close(self) -> None:
        """Close DB connection."""
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # ============================================================
    # STATS / DEBUG
    # ============================================================

    def stats(self) -> dict:
        """Return counts of each store."""
        return {
            "episodes": self.episodic.count(),
            "semantic_notes": self.semantic.count(),
            "skills": self.procedural.count(),
            "anti_patterns": self.anti_patterns.count(),
        }
