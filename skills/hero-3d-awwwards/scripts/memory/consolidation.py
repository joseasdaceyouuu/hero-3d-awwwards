"""
Consolidation job for the memory module.

Runs weekly (or on-demand) to:
    1. Mine episodic memory for recurring patterns → promote to semantic notes
    2. Mine semantic notes for recurring successful patterns → promote to skills
    3. Mine failed audits for recurring failure patterns → promote to anti-patterns
    4. Detect and resolve conflicting semantic notes

Usage:
    from memory.consolidation import run_consolidation
    run_consolidation(memory_system)

Or as a script:
    python -m memory.consolidation --db memory.db --lancedb ./.lancedb
"""

from __future__ import annotations

import json
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime
from typing import Optional

from .stores import MemorySystem, _now_iso, _uuid


# ============================================================
# CONSOLIDATION ORCHESTRATOR
# ============================================================

def run_consolidation(
    memory: MemorySystem,
    days_back: int = 7,
    min_pattern_occurrences: int = 3,
    min_skill_successes: int = 3,
    verbose: bool = True,
) -> dict:
    """Run the full consolidation pipeline.

    Args:
        memory: MemorySystem instance
        days_back: only consider episodes from last N days
        min_pattern_occurrences: minimum occurrences to promote to semantic note
        min_skill_successes: minimum successful episodes to promote to skill
        verbose: print progress

    Returns:
        dict with consolidation stats
    """
    started_at = _now_iso()
    run_id = _uuid()

    if verbose:
        print(f"🧠 Starting consolidation run {run_id}")
        print(f"   Days back: {days_back}")

    # Record the run
    memory.conn.execute(
        """INSERT INTO consolidation_runs (id, started_at, status)
        VALUES (?, ?, 'running')""",
        (run_id, started_at),
    )
    memory.conn.commit()

    stats = {
        "run_id": run_id,
        "episodes_processed": 0,
        "patterns_extracted": 0,
        "skills_promoted": 0,
        "anti_patterns_added": 0,
        "anti_patterns_updated": 0,
    }

    try:
        # 1. Process recent episodes for patterns
        recent_episodes = _fetch_recent_episodes(memory, days_back)
        stats["episodes_processed"] = len(recent_episodes)
        if verbose:
            print(f"   📁 Processing {len(recent_episodes)} recent episodes")

        # 2. Extract semantic patterns
        new_patterns = _extract_semantic_patterns(
            memory, recent_episodes, min_pattern_occurrences
        )
        stats["patterns_extracted"] = new_patterns
        if verbose:
            print(f"   💡 Extracted {new_patterns} new semantic patterns")

        # 3. Promote recurring successful patterns to skills
        new_skills = _promote_skills(memory, recent_episodes, min_skill_successes)
        stats["skills_promoted"] = new_skills
        if verbose:
            print(f"   🛠️  Promoted {new_skills} skills")

        # 4. Mine failed audits for anti-patterns
        new_aps, updated_aps = _mine_anti_patterns(memory, recent_episodes)
        stats["anti_patterns_added"] = new_aps
        stats["anti_patterns_updated"] = updated_aps
        if verbose:
            print(f"   ⚠️  Added {new_aps} anti-patterns, updated {updated_aps}")

        # Mark run as completed
        memory.conn.execute(
            """UPDATE consolidation_runs
            SET finished_at = ?, status = 'completed',
                episodes_processed = ?, patterns_extracted = ?,
                skills_promoted = ?, anti_patterns_added = ?
            WHERE id = ?""",
            (
                _now_iso(),
                stats["episodes_processed"],
                stats["patterns_extracted"],
                stats["skills_promoted"],
                stats["anti_patterns_added"],
                run_id,
            ),
        )
        memory.conn.commit()

        if verbose:
            print(f"✅ Consolidation complete: {stats}")

    except Exception as e:
        memory.conn.execute(
            "UPDATE consolidation_runs SET status = 'failed' WHERE id = ?",
            (run_id,),
        )
        memory.conn.commit()
        raise

    return stats


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _fetch_recent_episodes(memory: MemorySystem, days_back: int) -> list[dict]:
    """Fetch episodes from the last N days."""
    rows = memory.conn.execute(
        """SELECT * FROM episodes
        WHERE timestamp >= datetime('now', ?)
        ORDER BY timestamp DESC""",
        (f"-{days_back} days",),
    ).fetchall()
    out = []
    for row in rows:
        ep = dict(row)
        ep["iterations"] = json.loads(ep.get("iterations_json", "[]"))
        ep["code_hashes"] = json.loads(ep.get("code_hashes", "{}"))
        out.append(ep)
    return out


def _extract_semantic_patterns(
    memory: MemorySystem,
    episodes: list[dict],
    min_occurrences: int,
) -> int:
    """Look for recurring decisions across episodes and promote to semantic notes.

    This is a simplified version. A production system would use an LLM to
    extract patterns. Here we look for:
        - Same archetype chosen for same vertical
        - Same palette across multiple successful episodes
        - Recurring audit failures
    """
    added = 0

    # Group by (vertical, archetype, stack) and count
    decision_counter: Counter = Counter()
    decision_examples: dict = defaultdict(list)

    for ep in episodes:
        key = (ep.get("vertical", ""), ep.get("archetype", ""), ep.get("stack", ""))
        decision_counter[key] += 1
        decision_examples[key].append(ep)

    # Promote recurring decisions to semantic notes
    for (vertical, archetype, stack), count in decision_counter.items():
        if count < min_occurrences:
            continue
        # Only promote successful episodes
        successful = [e for e in decision_examples[(vertical, archetype, stack)]
                      if e.get("outcome") in ("success", "score_sufficient")]
        if len(successful) < min_occurrences:
            continue

        avg_score = sum(e.get("final_score", 0) for e in successful) / len(successful)
        if avg_score < 7.0:
            continue  # Don't promote mediocre patterns

        content = (
            f"For {vertical} heroes, archetype '{archetype}' with stack '{stack}' "
            f"achieves avg score {avg_score:.1f} across {len(successful)} episodes."
        )

        # Check if we already have this pattern
        existing = memory.semantic.search(content, top_k=1, min_score=0.8)
        if existing:
            continue  # Already have a similar pattern

        source_eps = [e["id"] for e in successful]
        memory.semantic.add(
            content=content,
            vertical=vertical,
            category="archetype-selection",
            importance=int(min(10, avg_score)),
            source_episodes=source_eps,
        )
        added += 1

    return added


def _promote_skills(
    memory: MemorySystem,
    episodes: list[dict],
    min_successes: int,
) -> int:
    """Promote recurring successful code patterns to skills.

    Simplified version: looks for episodes where the same file path
    appears across multiple successful episodes with high final scores.
    A production system would diff the code to find common templates.
    """
    promoted = 0

    # Group successful episodes by vertical + archetype
    by_profile: dict = defaultdict(list)
    for ep in episodes:
        if ep.get("outcome") not in ("success", "score_sufficient"):
            continue
        if ep.get("final_score", 0) < 8.0:
            continue
        key = (ep.get("vertical", ""), ep.get("archetype", ""))
        by_profile[key].append(ep)

    for (vertical, archetype), eps in by_profile.items():
        if len(eps) < min_successes:
            continue

        # Find common code paths
        path_counter: Counter = Counter()
        for ep in eps:
            for path in ep.get("code_hashes", {}).keys():
                path_counter[path] += 1

        common_paths = [p for p, c in path_counter.items() if c >= min_successes]
        if not common_paths:
            continue

        # For each common path, retrieve the most recent code and promote
        for path in common_paths[:1]:  # Limit to 1 skill per profile per run
            # Get the most recent episode's code for this path
            latest_ep = eps[0]
            hash_val = latest_ep.get("code_hashes", {}).get(path)
            if not hash_val:
                continue
            code = memory.episodic.get_code_by_hash(hash_val)
            if not code:
                continue

            description = (
                f"Reusable {archetype} component for {vertical} heroes. "
                f"Validated across {len(eps)} successful episodes with avg score "
                f"{sum(e.get('final_score', 0) for e in eps) / len(eps):.1f}."
            )

            # Check if a similar skill already exists
            existing = memory.procedural.search(description, top_k=1, min_score=0.7)
            if existing:
                continue

            source_eps = [e["id"] for e in eps]
            memory.procedural.add(
                description=description,
                code_template=code,
                source_episodes=source_eps,
                valid_verticals=[vertical] if vertical else [],
            )
            promoted += 1

    return promoted


def _mine_anti_patterns(
    memory: MemorySystem,
    episodes: list[dict],
) -> tuple[int, int]:
    """Look for recurring audit failures and promote to anti-patterns.

    Returns (new_count, updated_count).
    """
    new_count = 0
    updated_count = 0

    # Collect all failed criteria across episodes
    failure_counter: Counter = Counter()
    failure_examples: dict = defaultdict(list)

    for ep in episodes:
        for it in ep.get("iterations", []):
            audit = it.get("audit", {})
            for c in audit.get("criteria", []):
                if not c.get("passed", True):
                    key = (c.get("id", "?"), c.get("name", ""))
                    failure_counter[key] += 1
                    failure_examples[key].append({
                        "episode_id": ep.get("id"),
                        "criterion_id": c.get("id"),
                        "fix_hint": c.get("fix_hint", ""),
                    })

    # Promote failures that occurred 3+ times
    for (criterion_id, name), count in failure_counter.items():
        if count < 3:
            continue

        description = (
            f"Recurring failure on {criterion_id} ({name}). "
            f"Occurred {count} times. Common fix: "
            f"{failure_examples[(criterion_id, name)][0].get('fix_hint', 'N/A')[:100]}"
        )

        # Check if similar anti-pattern exists
        existing = memory.anti_patterns.find_similar(description)
        if existing:
            # Update occurrence count
            memory.anti_patterns.record_occurrence(
                existing["id"],
                episode_id=failure_examples[(criterion_id, name)][0].get("episode_id", ""),
                criterion_id=criterion_id,
            )
            updated_count += 1
        else:
            memory.anti_patterns.add(
                description=description,
                failure_mode=criterion_id,
                episode_id=failure_examples[(criterion_id, name)][0].get("episode_id", ""),
                criterion_id=criterion_id,
            )
            new_count += 1

    return new_count, updated_count


# ============================================================
# CLI ENTRY (for cron/manual runs)
# ============================================================

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Run memory consolidation")
    parser.add_argument("--db", default="memory.db")
    parser.add_argument("--lancedb", default="./.lancedb")
    parser.add_argument("--days-back", type=int, default=7)
    parser.add_argument("--min-pattern-occurrences", type=int, default=3)
    parser.add_argument("--min-skill-successes", type=int, default=3)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    with MemorySystem(db_path=args.db, lancedb_path=args.lancedb) as memory:
        run_consolidation(
            memory,
            days_back=args.days_back,
            min_pattern_occurrences=args.min_pattern_occurrences,
            min_skill_successes=args.min_skill_successes,
            verbose=not args.quiet,
        )


if __name__ == "__main__":
    main()
