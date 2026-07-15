"""
Memory module for hero-3d-awwwards agent loop.

Implements the 5-tier cognitive memory architecture described in
references/memory-architecture.md:

    Working Memory  — current iteration state (in-process)
    Episodic Memory — raw past sessions (JSON + LanceDB)
    Semantic Memory — extracted atomic facts (SQLite + LanceDB)
    Procedural Memory — reusable skills (SQLite + LanceDB)
    Negative Knowledge — anti-patterns (SQLite only)

Public API:
    from memory import (
        MemorySystem,
        WorkingMemory,
        EpisodicStore,
        SemanticStore,
        ProceduralStore,
        AntiPatternStore,
        tri_score,
        cosine_sim,
        toon_compress_audit,
        compress_iteration_for_replay,
    )
"""

from .retrieval import tri_score, cosine_sim, retrieve_top_k
from .compression import toon_compress_audit, compress_iteration_for_replay, hash_content
from .stores import (
    WorkingMemory,
    EpisodicStore,
    SemanticStore,
    ProceduralStore,
    AntiPatternStore,
    MemorySystem,
)
from .embeddings import Embedder, get_embedder, OpenAIEmbedder, LocalBGEEmbedder, FakeEmbedder, clear_cache
from .extraction import extract_patterns_from_episode, consolidate_with_llm

__version__ = "0.2.0"

__all__ = [
    # Retrieval
    "tri_score",
    "cosine_sim",
    "retrieve_top_k",
    # Compression
    "toon_compress_audit",
    "compress_iteration_for_replay",
    "hash_content",
    # Stores
    "WorkingMemory",
    "EpisodicStore",
    "SemanticStore",
    "ProceduralStore",
    "AntiPatternStore",
    "MemorySystem",
    # Embeddings
    "Embedder",
    "get_embedder",
    "OpenAIEmbedder",
    "LocalBGEEmbedder",
    "FakeEmbedder",
    "clear_cache",
    # Extraction (Fase 2)
    "extract_patterns_from_episode",
    "consolidate_with_llm",
]
