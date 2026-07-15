"""
Retrieval functions for the memory module.

Implements the tri-score retrieval pattern from Generative Agents (Park et al.,
UIST 2023), adapted for our 4 long-term stores.

Tri-score formula:
    score = w_semantic * semantic + w_recency * recency + w_importance * importance

where:
    semantic   = cosine_similarity(query_embedding, memory_embedding) ∈ [0, 1]
    recency    = 0.5 ^ (days_since_last_access / half_life_days)     ∈ [0, 1]
    importance = memory.importance / 10.0                              ∈ [0, 1]

Default weights per store (tuned for our use case):

    Episodic:    (0.4, 0.4, 0.2)  — recent + similar matter equally
    Semantic:    (0.5, 0.2, 0.3)  — importance matters more than recency
    Procedural:  (0.6, 0.1, 0.3)  — semantic match dominates (a 1-year-old
                                     skill that's relevant is still good)
    Negative:    (0.7, 0.1, 0.2)  — almost pure semantic match
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Sequence, Optional, Iterable, Any


def cosine_sim(a: Sequence[float], b: Sequence[float]) -> float:
    """Cosine similarity between two vectors. Returns float in [-1, 1].

    For normalized embeddings (BGE, OpenAI), this is in [0, 1].
    """
    if len(a) != len(b):
        raise ValueError(
            f"Vector dimension mismatch: {len(a)} vs {len(b)}"
        )
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _parse_iso(ts: str | datetime | None) -> datetime:
    """Parse an ISO timestamp or datetime into a UTC datetime."""
    if ts is None:
        return datetime.utcnow()
    if isinstance(ts, datetime):
        return ts
    # Handle both with and without timezone
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    except (ValueError, AttributeError):
        return datetime.utcnow()


def recency_score(
    last_accessed: str | datetime | None,
    half_life_days: float = 30.0,
    now: Optional[datetime] = None,
) -> float:
    """Exponential decay recency score. Returns float in (0, 1].

    0.5 ^ (days_since / half_life_days)

    - 0 days since access: 1.0
    - half_life_days since access: 0.5
    - 2 * half_life_days: 0.25
    - 5 * half_life_days: ~0.03
    """
    if now is None:
        now = datetime.utcnow()
    last = _parse_iso(last_accessed)
    days_since = max(0.0, (now - last).total_seconds() / 86400.0)
    return math.pow(0.5, days_since / half_life_days)


def importance_score(importance: int | float | None, max_importance: int = 10) -> float:
    """Normalize importance (1-10) to [0, 1]."""
    if importance is None:
        return 0.5  # default mid-importance
    return max(0.0, min(1.0, float(importance) / float(max_importance)))


# Default weights per store
DEFAULT_WEIGHTS = {
    "episodic":   (0.4, 0.4, 0.2),
    "semantic":   (0.5, 0.2, 0.3),
    "procedural": (0.6, 0.1, 0.3),
    "negative":   (0.7, 0.1, 0.2),
}

DEFAULT_HALF_LIFE_DAYS = {
    "episodic":   30.0,
    "semantic":   90.0,
    "procedural": 180.0,
    "negative":   365.0,  # negative knowledge decays slowly
}


def tri_score(
    memory: dict,
    query_embedding: Sequence[float],
    memory_embedding: Sequence[float],
    weights: tuple[float, float, float] | None = None,
    half_life_days: float | None = None,
    store_type: str = "semantic",
    now: Optional[datetime] = None,
) -> float:
    """Compute tri-score for a memory record.

    Args:
        memory: dict with at least 'last_accessed' and optionally 'importance'.
                For procedural skills, 'last_used' is used if 'last_accessed' missing.
        query_embedding: query vector
        memory_embedding: memory vector
        weights: (semantic, recency, importance). If None, use store default.
        half_life_days: recency decay half-life. If None, use store default.
        store_type: one of 'episodic' | 'semantic' | 'procedural' | 'negative'
        now: override current time (for testing)

    Returns:
        Composite score in [0, 1].
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS.get(store_type, (0.5, 0.2, 0.3))
    if half_life_days is None:
        half_life_days = DEFAULT_HALF_LIFE_DAYS.get(store_type, 30.0)

    # Semantic
    sem = cosine_sim(query_embedding, memory_embedding)
    # Clip to [0, 1] (some embeddings can produce slightly negative cosine)
    sem = max(0.0, min(1.0, (sem + 1.0) / 2.0))

    # Recency
    last = memory.get("last_accessed") or memory.get("last_used") or memory.get("last_seen")
    rec = recency_score(last, half_life_days, now)

    # Importance
    imp = importance_score(memory.get("importance"))

    # Weighted sum (each component in [0, 1])
    w_sem, w_rec, w_imp = weights
    return w_sem * sem + w_rec * rec + w_imp * imp


def retrieve_top_k(
    memories: Iterable[dict],
    query_embedding: Sequence[float],
    memory_embeddings: dict[str, Sequence[float]],
    k: int = 5,
    store_type: str = "semantic",
    weights: tuple[float, float, float] | None = None,
    half_life_days: float | None = None,
    min_score: float = 0.0,
    now: Optional[datetime] = None,
) -> list[tuple[dict, float]]:
    """Retrieve top-k memories by tri-score.

    Args:
        memories: iterable of memory dicts. Each must have an 'id' field.
        query_embedding: query vector
        memory_embeddings: dict mapping memory_id -> embedding
        k: number of top results to return
        store_type: see tri_score()
        weights: see tri_score()
        half_life_days: see tri_score()
        min_score: filter out results below this score
        now: override current time (for testing)

    Returns:
        List of (memory, score) tuples sorted by score descending.
    """
    scored: list[tuple[dict, float]] = []
    for mem in memories:
        mem_id = mem.get("id")
        if mem_id is None or mem_id not in memory_embeddings:
            continue
        score = tri_score(
            mem,
            query_embedding,
            memory_embeddings[mem_id],
            weights=weights,
            half_life_days=half_life_days,
            store_type=store_type,
            now=now,
        )
        if score >= min_score:
            scored.append((mem, score))

    scored.sort(key=lambda x: -x[1])
    return scored[:k]


def decay_old_weights(
    score: float,
    days_since: float,
    half_life: float = 30.0,
) -> float:
    """Apply additional decay to a score (for aging out old results).

    Useful when you want to combine tri-score with an additional penalty
    for very old memories.
    """
    return score * math.pow(0.5, days_since / half_life)
