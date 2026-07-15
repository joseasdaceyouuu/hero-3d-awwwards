"""
Compression utilities for the memory module.

Two main strategies:
    1. TOON-style compression for audit JSON (30-61% token reduction, no info loss)
    2. Graduated reduction by iteration age (older iterations compressed more)

We do NOT use LLMLingua or any token-level pruning — research (report 02)
showed these break code syntax and JSON structure. For code, we use
content-addressable storage (hash references) instead.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Optional


# ============================================================
# CONTENT HASHING (for code dedup)
# ============================================================

def hash_content(content: str) -> str:
    """SHA256 hash of content. Used for content-addressable storage.

    Two identical code files across episodes share the same hash, so we
    store the content once and reference it by hash everywhere.
    """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def hash_files(files: dict[str, str]) -> dict[str, str]:
    """Hash each file in a {path: content} dict. Returns {path: hash}."""
    return {path: hash_content(content) for path, content in files.items()}


# ============================================================
# TOON — Token-Oriented Object Notation
# ============================================================
# Inspired by the TOON spec (cited in report 02). Transforms JSON into
# indented text that conveys structure without repeating keys.
#
# Original JSON:
#   {"score": 7.8, "passed": false, "criteria": [{"id": "C7", "passed": false}]}
#
# TOON:
#   score:7.8
#   passed:false
#   criteria:
#     C7:false
#
# Token savings: ~30-60% on typical audit JSON.

def toon_compress_audit(audit_json: dict) -> str:
    """TOON-style compression for audit JSON.

    Drops verbose evidence, keeps structured fields, uses indentation
    to convey hierarchy. Focuses on what the Corrector needs: failed
    criteria and fix hints.
    """
    if not audit_json:
        return ""

    lines: list[str] = []

    # Top-level fields (compact)
    lines.append(f"score:{audit_json.get('score', 0):.1f}")
    lines.append(f"pass:{audit_json.get('overall_pass', False)}")
    lines.append(f"iter:{audit_json.get('iteration', '?')}")

    blockers = audit_json.get("blockers", [])
    if blockers:
        lines.append(f"blockers:{','.join(blockers)}")

    subjective_blockers = audit_json.get("subjective_blockers", [])
    if subjective_blockers:
        sb_ids = [sb.get("id", "?") if isinstance(sb, dict) else str(sb) for sb in subjective_blockers]
        lines.append(f"subj_blockers:{','.join(sb_ids)}")

    # Failed criteria (most useful for Corrector)
    criteria = audit_json.get("criteria", [])
    failed = [c for c in criteria if not c.get("passed", True)]
    if failed:
        lines.append("failed:")
        for c in failed:
            sev = c.get("severity", "?")[:3]
            lines.append(f"  {c['id']} [{sev}] {c['name']}")
            if c.get("fix_hint"):
                # Truncate fix_hint to 120 chars (long hints waste tokens)
                hint = c["fix_hint"][:120]
                if len(c["fix_hint"]) > 120:
                    hint += "..."
                lines.append(f"    fix:{hint}")

    # Recommendation
    rec = audit_json.get("recommendation")
    if rec:
        lines.append(f"rec:{rec}")

    # Summary (truncate to 200 chars)
    summary = audit_json.get("summary", "")
    if summary:
        if len(summary) > 200:
            summary = summary[:200] + "..."
        lines.append(f"summary:{summary}")

    return "\n".join(lines)


def toon_compress_subjective(subjective_json: dict) -> str:
    """TOON-style compression for User Simulator JSON."""
    if not subjective_json:
        return ""

    lines: list[str] = []

    lines.append(f"sub_score:{subjective_json.get('subjective_score', 0):.1f}")

    fi = subjective_json.get("first_impression", {})
    if fi:
        lines.append("first_impression:")
        lines.append(f"  hook:{fi.get('hook_clarity', '?')}")
        lines.append(f"  wow:{fi.get('wow_factor', '?')}")
        lines.append(f"  mem:{fi.get('memorability', '?')}")
        lines.append(f"  premium:{fi.get('premium_feel', '?')}")

    soul = subjective_json.get("soul_analysis", {})
    if soul:
        lines.append(f"soul:{soul.get('soul_description', '?')[:100]}")
        lines.append(f"soul_clarity:{soul.get('soul_clarity', '?')}")

    cc = subjective_json.get("competitive_comparison", {})
    if cc:
        lines.append(f"sotd:{cc.get('sotd_worthy', False)}")
        if cc.get("sotd_gap"):
            gap = cc["sotd_gap"][:120]
            if len(cc["sotd_gap"]) > 120:
                gap += "..."
            lines.append(f"sotd_gap:{gap}")

    blockers = subjective_json.get("subjective_blockers", [])
    if blockers:
        lines.append("subj_failed:")
        for sb in blockers:
            sev = sb.get("severity", "?")[:3]
            lines.append(f"  {sb.get('id', '?')} [{sev}] {sb.get('name', '?')}")
            if sb.get("fix_hint"):
                hint = sb["fix_hint"][:120]
                if len(sb["fix_hint"]) > 120:
                    hint += "..."
                lines.append(f"    fix:{hint}")

    summary = subjective_json.get("summary", "")
    if summary:
        if len(summary) > 200:
            summary = summary[:200] + "..."
        lines.append(f"summary:{summary}")

    return "\n".join(lines)


# ============================================================
# GRADUATED REDUCTION BY ITERATION AGE
# ============================================================
# Older iterations are compressed more aggressively. The Corrector
# working on iteration 5 doesn't need full audit JSON from iteration 1;
# a one-line summary suffices.

def compress_iteration_for_replay(
    iteration_data: dict,
    age: int,
    include_code_hashes: bool = True,
) -> str:
    """Compress iteration data based on how old it is (age = iterations since).

    Age 0 (current):      full data, no compression
    Age 1 (previous):     TOON compression, full blockers + fix hints
    Age 2-3:              Blockers + IDs only, no fix hints
    Age 4+:               One-line summary

    Args:
        iteration_data: dict with 'audit', 'subjective', 'code', 'iteration'
        age: how many iterations since this one (0 = current)
        include_code_hashes: if True, include code hashes instead of full code
    """
    if age < 0:
        age = 0

    iter_num = iteration_data.get("iteration", "?")

    if age == 0:
        # Full data, but replace code with hashes if requested
        out = dict(iteration_data)
        if include_code_hashes and "code" in out:
            out["code_hashes"] = hash_files(out["code"])
            out.pop("code")
        return json.dumps(out, indent=2, default=str)

    elif age == 1:
        # TOON compression
        lines = [f"=== Iteration {iter_num} (age={age}) ==="]
        audit = iteration_data.get("audit", {})
        if audit:
            lines.append("AUDIT:")
            lines.append(toon_compress_audit(audit))
        subj = iteration_data.get("subjective", {})
        if subj:
            lines.append("SUBJECTIVE:")
            lines.append(toon_compress_subjective(subj))
        if include_code_hashes and "code" in iteration_data:
            hashes = hash_files(iteration_data["code"])
            lines.append(f"code_files:{','.join(hashes.keys())}")
        return "\n".join(lines)

    elif age <= 3:
        # Blockers only, no fix hints
        audit = iteration_data.get("audit", {})
        subj = iteration_data.get("subjective", {})
        score = audit.get("score", 0)
        sub_score = subj.get("subjective_score", 0)
        blockers = audit.get("blockers", [])
        sb_blockers = subj.get("subjective_blockers", [])
        sb_ids = [sb.get("id", "?") if isinstance(sb, dict) else str(sb) for sb in sb_blockers]

        return (
            f"iter{iter_num}: score={score:.1f}/{sub_score:.1f} "
            f"blockers={','.join(blockers) or 'none'} "
            f"subj_blockers={','.join(sb_ids) or 'none'}"
        )

    else:
        # One-line summary
        audit = iteration_data.get("audit", {})
        score = audit.get("score", 0)
        outcome = audit.get("recommendation", "?")
        return f"iter{iter_num}: score={score:.1f} rec={outcome}"


def compress_iteration_history(
    iterations: list[dict],
    current_iteration_num: int,
) -> str:
    """Compress the full iteration history for prompt injection.

    Takes a list of iteration data dicts and produces a single string
    with graduated compression: most recent iterations get full data,
    older ones get progressively more compressed.
    """
    if not iterations:
        return ""

    lines: list[str] = []
    for it in iterations:
        iter_num = it.get("iteration", 0)
        age = current_iteration_num - iter_num
        lines.append(compress_iteration_for_replay(it, age))

    return "\n\n".join(lines)


# ============================================================
# ESTIMATED TOKEN SAVINGS
# ============================================================

def estimate_tokens(text: str) -> int:
    """Rough token estimate: 1 token ≈ 4 chars (English/code average)."""
    return max(1, len(text) // 4)


def compression_stats(original_json: str, compressed: str) -> dict:
    """Report compression stats."""
    orig_tokens = estimate_tokens(original_json)
    comp_tokens = estimate_tokens(compressed)
    return {
        "original_chars": len(original_json),
        "compressed_chars": len(compressed),
        "original_tokens": orig_tokens,
        "compressed_tokens": comp_tokens,
        "ratio": round(orig_tokens / max(1, comp_tokens), 2),
        "savings_pct": round((1 - comp_tokens / max(1, orig_tokens)) * 100, 1),
    }
