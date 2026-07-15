"""
Pattern extraction module.

After each hero session completes, this module analyzes the full session
(brief, code, audits, subjective evals, outcome) and extracts atomic,
reusable facts that become the system's semantic memory.

Two-stage extraction:
    1. Episode-level extraction (after each session):
       - 1 LLM call per session
       - Extracts 0-7 patterns + 0-3 anti-patterns
       - Stores in semantic_notes + anti_patterns tables
       - Source: just-completed episode

    2. Cross-episode consolidation (weekly job, already in consolidation.py):
       - 1 LLM call per vertical (or per archetype)
       - Looks at multiple episodes to find recurring patterns
       - Promotes recurring patterns to skills (procedural memory)
       - Promotes recurring failures to anti-patterns

Usage (called automatically by hero-loop.py after finalize_session):

    from memory.extraction import extract_patterns_from_episode
    patterns, anti_patterns = extract_patterns_from_episode(
        memory=memory_system,
        episode_id=episode_id,
        backend=llm_backend,
    )
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Optional, Sequence

# We can't import LLMBackend directly (would create circular import with
# hero-loop.py), so we use duck typing — anything with a .complete() method.


# ============================================================
# PROMPT BUILDER
# ============================================================

SCRIPT_DIR = Path(__file__).parent.resolve()  # scripts/memory/
SCRIPTS_DIR = SCRIPT_DIR.parent                 # scripts/
PROMPTS_DIR = SCRIPTS_DIR / "prompts"           # scripts/prompts/


def load_extraction_prompt() -> str:
    """Load the extraction system prompt template."""
    path = PROMPTS_DIR / "extraction.md"
    return path.read_text(encoding="utf-8")


def build_extraction_user_prompt(
    episode: dict,
    iterations: list[dict],
    final_code: dict[str, str],
    skill_context_excerpt: str = "",
) -> str:
    """Build the user prompt for pattern extraction.

    Args:
        episode: episode dict from EpisodicStore
        iterations: list of iteration snapshots
        final_code: dict of {path: content} for the final hero code
        skill_context_excerpt: optional skill excerpt for category reference
    """
    brief = episode.get("brief", "")
    vertical = episode.get("vertical", "")
    archetype = episode.get("archetype", "")
    stack = episode.get("stack", "")
    outcome = episode.get("outcome", "")
    final_score = episode.get("final_score", 0.0)
    final_subj = episode.get("final_subjective_score", 0.0)
    user_feedback = episode.get("user_feedback", "")

    # Compress iterations for the LLM (don't send full audit JSONs)
    iterations_summary = []
    for it in iterations:
        audit = it.get("audit", {})
        subj = it.get("subjective", {})
        iterations_summary.append({
            "iteration": it.get("iteration"),
            "audit_score": audit.get("score"),
            "audit_pass": audit.get("overall_pass"),
            "blockers": audit.get("blockers", []),
            "failed_criteria": [
                {"id": c.get("id"), "name": c.get("name"), "severity": c.get("severity")}
                for c in audit.get("criteria", []) if not c.get("passed", True)
            ],
            "subjective_score": subj.get("subjective_score"),
            "subjective_blockers": [
                {"id": s.get("id"), "name": s.get("name")}
                for s in subj.get("subjective_blockers", [])
            ],
            "sotd_worthy": subj.get("competitive_comparison", {}).get("sotd_worthy"),
        })

    # Limit code size — LLM doesn't need every line, just structure
    code_summary = {}
    for path, content in final_code.items():
        # Truncate very long files to first 200 lines
        lines = content.split("\n")
        if len(lines) > 200:
            code_summary[path] = "\n".join(lines[:200]) + f"\n... ({len(lines) - 200} more lines)"
        else:
            code_summary[path] = content

    user_prompt = f"""# Episode to Analyze

## Brief
{brief}

## Session Metadata
- Vertical: {vertical or "(unspecified)"}
- Archetype: {archetype or "(unspecified)"}
- Stack: {stack or "(unspecified)"}
- Outcome: {outcome}
- Final score: {final_score:.1f}/10 (objective + subjective combined)
- Final subjective score: {final_subj:.1f}/10
- User feedback: {user_feedback or "(none)"}

## Iterations Summary
{json.dumps(iterations_summary, indent=2)}

## Final Code
"""
    for path, content in code_summary.items():
        user_prompt += f"\n### {path}\n```\n{content}\n```\n"

    if skill_context_excerpt:
        user_prompt += f"\n## Skill Reference (for category names)\n{skill_context_excerpt}\n"

    user_prompt += """
# Task
Analyze this episode and extract 0-7 atomic patterns + 0-3 anti-patterns.
Output strict JSON per the schema in your system prompt.
"""
    return user_prompt


# ============================================================
# OUTPUT PARSER
# ============================================================

def parse_extraction_output(output: str) -> Optional[dict]:
    """Parse LLM extraction output. Returns dict with 'patterns' and 'anti_patterns' lists."""
    output = output.strip()
    # Strip markdown fences if present
    if output.startswith("```"):
        lines = output.split("\n")
        lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        output = "\n".join(lines)

    try:
        data = json.loads(output)
    except json.JSONDecodeError as e:
        print(f"⚠️  Extraction output is not valid JSON: {e}")
        print(f"Output preview: {output[:500]}...")
        return None

    # Validate structure
    if not isinstance(data, dict):
        return None
    if "patterns" not in data:
        data["patterns"] = []
    if "anti_patterns" not in data:
        data["anti_patterns"] = []

    # Sanitize patterns
    clean_patterns = []
    for p in data["patterns"]:
        if not isinstance(p, dict):
            continue
        content = p.get("content", "").strip()
        if not content or len(content) < 10:
            continue
        clean_patterns.append({
            "content": content,
            "category": p.get("category", "general"),
            "importance": max(1, min(10, int(p.get("importance", 5)))),
            "evidence": p.get("evidence", ""),
            "applies_to_verticals": p.get("applies_to_verticals", []),
        })

    # Sanitize anti-patterns
    clean_anti = []
    for ap in data["anti_patterns"]:
        if not isinstance(ap, dict):
            continue
        desc = ap.get("description", "").strip()
        if not desc or len(desc) < 10:
            continue
        clean_anti.append({
            "description": desc,
            "failure_mode": ap.get("failure_mode", ""),
            "evidence": ap.get("evidence", ""),
        })

    return {"patterns": clean_patterns, "anti_patterns": clean_anti}


# ============================================================
# MAIN EXTRACTION FUNCTION
# ============================================================

def extract_patterns_from_episode(
    memory,
    episode_id: str,
    backend,
    temperature: float = 0.3,
    verbose: bool = True,
) -> tuple[list[dict], list[dict]]:
    """Extract patterns from a completed episode and store them in memory.

    Args:
        memory: MemorySystem instance
        episode_id: ID of the episode to analyze
        backend: LLM backend (anything with .complete(system, user, temperature) -> str)
        temperature: LLM temperature (default 0.3 for consistency)
        verbose: print progress

    Returns:
        (patterns_added, anti_patterns_added) — lists of stored records
    """
    # 1. Load episode + iterations from memory
    episode = memory.episodic.get_episode(episode_id)
    if not episode:
        if verbose:
            print(f"⚠️  Episode {episode_id} not found")
        return [], []

    iterations = episode.get("iterations", [])

    # 2. Retrieve final code by hashes
    final_code = {}
    for path, hash_val in episode.get("code_hashes", {}).items():
        content = memory.episodic.get_code_by_hash(hash_val)
        if content:
            final_code[path] = content

    if not final_code and not iterations:
        if verbose:
            print(f"⚠️  Episode {episode_id} has no code or iterations — skipping extraction")
        return [], []

    # 3. Build prompts
    system_prompt = load_extraction_prompt()
    user_prompt = build_extraction_user_prompt(
        episode=episode,
        iterations=iterations,
        final_code=final_code,
    )

    # 4. Call LLM
    if verbose:
        print(f"  ▶ Extracting patterns from episode {episode_id[:8]}...")
    try:
        output = backend.complete(system_prompt, user_prompt, temperature=temperature)
    except Exception as e:
        if verbose:
            print(f"  ⚠️  LLM call failed: {e}")
        return [], []

    # 5. Parse output
    parsed = parse_extraction_output(output)
    if not parsed:
        if verbose:
            print(f"  ⚠️  Could not parse extraction output")
        return [], []

    # 6. Store patterns in semantic memory
    patterns_added = []
    vertical = episode.get("vertical", "")
    for p in parsed["patterns"]:
        try:
            note_id = memory.semantic.add(
                content=p["content"],
                vertical=vertical if p["applies_to_verticals"] == [] or vertical in p["applies_to_verticals"] else "",
                category=p["category"],
                importance=p["importance"],
                source_episodes=[episode_id],
            )
            patterns_added.append({
                "id": note_id,
                "content": p["content"],
                "category": p["category"],
                "importance": p["importance"],
            })
        except Exception as e:
            if verbose:
                print(f"  ⚠️  Failed to store pattern: {e}")

    # 7. Store anti-patterns
    anti_patterns_added = []
    for ap in parsed["anti_patterns"]:
        try:
            # Check if similar anti-pattern already exists
            existing = memory.anti_patterns.find_similar(ap["description"])
            if existing:
                # Update occurrence count
                memory.anti_patterns.record_occurrence(
                    existing["id"],
                    episode_id=episode_id,
                    criterion_id=ap.get("failure_mode", ""),
                )
                anti_patterns_added.append({
                    "id": existing["id"],
                    "description": ap["description"],
                    "failure_mode": ap.get("failure_mode", ""),
                    "updated": True,
                })
            else:
                ap_id = memory.anti_patterns.add(
                    description=ap["description"],
                    failure_mode=ap.get("failure_mode", ""),
                    episode_id=episode_id,
                    criterion_id=ap.get("failure_mode", ""),
                )
                anti_patterns_added.append({
                    "id": ap_id,
                    "description": ap["description"],
                    "failure_mode": ap.get("failure_mode", ""),
                    "updated": False,
                })
        except Exception as e:
            if verbose:
                print(f"  ⚠️  Failed to store anti-pattern: {e}")

    if verbose:
        print(f"  ✓ Extracted {len(patterns_added)} patterns + {len(anti_patterns_added)} anti-patterns")
        for p in patterns_added:
            print(f"     + [imp={p['importance']}] {p['content'][:80]}")
        for ap in anti_patterns_added:
            verb = "Updated" if ap.get("updated") else "Added"
            print(f"     ⚠ {verb}: {ap['description'][:80]}")

    return patterns_added, anti_patterns_added


# ============================================================
# CROSS-EPISODE CONSOLIDATION (LLM-powered, optional)
# ============================================================

def consolidate_with_llm(
    memory,
    backend,
    days_back: int = 30,
    min_episodes: int = 3,
    verbose: bool = True,
) -> dict:
    """Run LLM-powered cross-episode consolidation.

    Looks at multiple episodes from the last N days and asks the LLM to find
    recurring patterns that should be promoted to skills, or recurring failures
    that should be promoted to anti-patterns.

    This is more powerful than the rule-based consolidation in consolidation.py
    but uses more tokens. Run weekly, not after every session.

    Args:
        memory: MemorySystem instance
        backend: LLM backend
        days_back: only consider episodes from last N days
        min_episodes: minimum episodes required to run consolidation
        verbose: print progress

    Returns:
        dict with consolidation stats
    """
    # Fetch recent episodes
    rows = memory.conn.execute(
        """SELECT * FROM episodes
        WHERE timestamp >= datetime('now', ?)
        ORDER BY timestamp DESC""",
        (f"-{days_back} days",),
    ).fetchall()

    episodes = []
    for row in rows:
        ep = dict(row)
        ep["iterations"] = json.loads(ep.get("iterations_json", "[]"))
        ep["code_hashes"] = json.loads(ep.get("code_hashes", "{}"))
        episodes.append(ep)

    if len(episodes) < min_episodes:
        if verbose:
            print(f"ℹ️  Only {len(episodes)} episodes in last {days_back} days — need {min_episodes}+ for consolidation")
        return {"episodes_processed": len(episodes), "skills_promoted": 0, "anti_patterns_added": 0}

    if verbose:
        print(f"🧠 Consolidating {len(episodes)} episodes with LLM...")

    # Build consolidation prompt
    episodes_summary = []
    for ep in episodes:
        # Just the high-level metadata, not full code
        episodes_summary.append({
            "id": ep["id"],
            "vertical": ep.get("vertical"),
            "archetype": ep.get("archetype"),
            "stack": ep.get("stack"),
            "outcome": ep.get("outcome"),
            "final_score": ep.get("final_score"),
            "final_subjective_score": ep.get("final_subjective_score"),
            "brief_summary": ep.get("brief_summary", "")[:200],
            "iteration_count": len(ep.get("iterations", [])),
            "failed_criteria_count": sum(
                1 for it in ep.get("iterations", [])
                for c in it.get("audit", {}).get("criteria", [])
                if not c.get("passed", True)
            ),
        })

    system_prompt = """You are a cross-episode pattern consolidation agent.

Given a list of recent hero design sessions, identify:
1. **Recurring successful patterns** that should be promoted to reusable skills
   (procedural memory). A skill is a code template + description that can be
   reused across similar briefs.
2. **Recurring failure patterns** that should be promoted to anti-patterns
   (negative knowledge) so future sessions avoid them.

Output JSON:
{
  "skills_to_promote": [
    {
      "description": "When to use this skill (natural language, specific)",
      "code_template_summary": "What the code does at a high level (not full code)",
      "valid_verticals": ["saas", "portfolio"],
      "source_episodes": ["ep-id-1", "ep-id-2"],
      "estimated_success_rate": 0.85
    }
  ],
  "anti_patterns_to_promote": [
    {
      "description": "Don't do X because Y",
      "failure_mode": "C7 | C11 | S1 | ...",
      "occurred_in_episodes": ["ep-id-1", "ep-id-2"],
      "frequency": "high | medium | low"
    }
  ]
}

Rules:
- Only promote skills backed by 2+ successful episodes with similar approach
- Only promote anti-patterns that occurred in 3+ episodes
- Be specific in descriptions — vague skills are useless
- Output JSON only, no prose
"""

    user_prompt = f"""# Recent Episodes (last {days_back} days)

{json.dumps(episodes_summary, indent=2)}

# Task
Identify patterns that recur across these episodes. Output JSON.
"""

    try:
        output = backend.complete(system_prompt, user_prompt, temperature=0.3)
    except Exception as e:
        if verbose:
            print(f"⚠️  LLM call failed: {e}")
        return {"episodes_processed": len(episodes), "skills_promoted": 0, "anti_patterns_added": 0, "error": str(e)}

    # Parse
    output = output.strip()
    if output.startswith("```"):
        lines = output.split("\n")[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        output = "\n".join(lines)

    try:
        data = json.loads(output)
    except json.JSONDecodeError as e:
        if verbose:
            print(f"⚠️  Consolidation output not valid JSON: {e}")
        return {"episodes_processed": len(episodes), "skills_promoted": 0, "anti_patterns_added": 0, "error": "parse_error"}

    # Store promoted skills
    skills_promoted = 0
    for skill_data in data.get("skills_to_promote", []):
        try:
            # For cross-episode skills, we don't have a single code template
            # Instead, store a description that future Creators can use
            memory.procedural.add(
                description=skill_data["description"],
                code_template=skill_data.get("code_template_summary", ""),
                source_episodes=skill_data.get("source_episodes", []),
                valid_verticals=skill_data.get("valid_verticals", []),
            )
            skills_promoted += 1
        except Exception as e:
            if verbose:
                print(f"  ⚠️  Failed to store skill: {e}")

    # Store promoted anti-patterns
    anti_added = 0
    for ap_data in data.get("anti_patterns_to_promote", []):
        try:
            existing = memory.anti_patterns.find_similar(ap_data["description"])
            if existing:
                # Already exists, just record occurrence
                for ep_id in ap_data.get("occurred_in_episodes", [])[:1]:
                    memory.anti_patterns.record_occurrence(
                        existing["id"],
                        episode_id=ep_id,
                        criterion_id=ap_data.get("failure_mode", ""),
                    )
            else:
                memory.anti_patterns.add(
                    description=ap_data["description"],
                    failure_mode=ap_data.get("failure_mode", ""),
                )
                anti_added += 1
        except Exception as e:
            if verbose:
                print(f"  ⚠️  Failed to store anti-pattern: {e}")

    if verbose:
        print(f"✅ Consolidation complete: {skills_promoted} skills + {anti_added} anti-patterns")

    return {
        "episodes_processed": len(episodes),
        "skills_promoted": skills_promoted,
        "anti_patterns_added": anti_added,
    }
