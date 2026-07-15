"""
Embeddings wrapper for the memory module.

Supports two backends:
    - OpenAI text-embedding-3-small (default, 1536 dim, $0.02/1M tokens)
    - BGE small en v1.5 (local, free, 384 dim, via sentence-transformers)

Usage:
    embedder = get_embedder()              # auto-pick based on env
    vec = embedder.embed("some text")      # single
    vecs = embedder.embed_batch([...])     # batch

The embedder caches results in-memory to avoid re-embedding identical text.
For persistence, LanceDB handles storage of embeddings alongside records.
"""

from __future__ import annotations

import hashlib
import os
import time
from typing import Optional, Union, List, Sequence

# In-memory cache: hash(text) -> embedding
_CACHE: dict[str, list[float]] = {}


def _text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


class Embedder:
    """Abstract embedder. Subclasses implement the actual API call."""

    @property
    def dimension(self) -> int:
        raise NotImplementedError

    def embed(self, text: str) -> list[float]:
        """Embed a single text. Returns a list of floats."""
        raise NotImplementedError

    def embed_batch(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed multiple texts. Default impl loops; subclasses can batch."""
        return [self.embed(t) for t in texts]


class OpenAIEmbedder(Embedder):
    """OpenAI text-embedding-3-small (1536 dim, $0.02/1M tokens)."""

    MODEL = "text-embedding-3-small"
    DIMENSION = 1536

    def __init__(self, api_key: Optional[str] = None):
        try:
            from openai import OpenAI
        except ImportError as e:
            raise RuntimeError(
                "openai package not installed. Run: pip install openai"
            ) from e

        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "OPENAI_API_KEY env var not set. "
                "Either set it or use LocalBGEEmbedder."
            )
        self._client = OpenAI(api_key=self.api_key)

    @property
    def dimension(self) -> int:
        return self.DIMENSION

    def embed(self, text: str) -> list[float]:
        cache_key = _text_hash(text)
        if cache_key in _CACHE:
            return _CACHE[cache_key]

        # Truncate to 8K tokens (OpenAI embedding limit is 8191)
        truncated = text[:32000]  # ~8K tokens at 4 chars/token
        response = self._client.embeddings.create(
            input=truncated,
            model=self.MODEL,
        )
        vec = response.data[0].embedding
        _CACHE[cache_key] = vec
        return vec

    def embed_batch(self, texts: Sequence[str]) -> list[list[float]]:
        # OpenAI supports batch up to 2048 inputs
        results: list[list[float]] = []
        to_embed: list[tuple[int, str]] = []
        for i, t in enumerate(texts):
            cache_key = _text_hash(t)
            if cache_key in _CACHE:
                results.append(_CACHE[cache_key])
            else:
                to_embed.append((i, t[:32000]))

        # Pad results list
        while len(results) < len(texts):
            results.append([])

        if not to_embed:
            return results

        # Batch API call
        batch_texts = [t for _, t in to_embed]
        response = self._client.embeddings.create(
            input=batch_texts,
            model=self.MODEL,
        )
        for (original_idx, original_text), data in zip(to_embed, response.data):
            vec = data.embedding
            _CACHE[_text_hash(original_text)] = vec
            results[original_idx] = vec

        return results


class LocalBGEEmbedder(Embedder):
    """BGE small en v1.5 — local, free, 384 dim.

    Requires: pip install sentence-transformers
    Downloads model on first use (~130MB).
    """

    MODEL_NAME = "BAAI/bge-small-en-v1.5"
    DIMENSION = 384

    def __init__(self):
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as e:
            raise RuntimeError(
                "sentence-transformers not installed. Run: pip install sentence-transformers"
            ) from e

        self._model = SentenceTransformer(self.MODEL_NAME)

    @property
    def dimension(self) -> int:
        return self.DIMENSION

    def embed(self, text: str) -> list[float]:
        cache_key = _text_hash(text)
        if cache_key in _CACHE:
            return _CACHE[cache_key]

        vec = self._model.encode(text, normalize_embeddings=True).tolist()
        _CACHE[cache_key] = vec
        return vec

    def embed_batch(self, texts: Sequence[str]) -> list[list[float]]:
        # Check cache first
        results: list[list[float]] = []
        to_embed_idx: list[int] = []
        to_embed_texts: list[str] = []
        for i, t in enumerate(texts):
            cache_key = _text_hash(t)
            if cache_key in _CACHE:
                results.append(_CACHE[cache_key])
            else:
                to_embed_idx.append(i)
                to_embed_texts.append(t)
                results.append([])  # placeholder

        if not to_embed_texts:
            return results

        # Batch encode
        embeddings = self._model.encode(
            to_embed_texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        for idx, text, emb in zip(to_embed_idx, to_embed_texts, embeddings):
            vec = emb.tolist()
            _CACHE[_text_hash(text)] = vec
            results[idx] = vec

        return results


class FakeEmbedder(Embedder):
    """Deterministic fake embedder for tests. Uses hashing to produce a vector.

    Same text -> same vector. Different text -> different vector. But no
    semantic similarity. Use only for unit tests.
    """

    def __init__(self, dimension: int = 64):
        self._dimension = dimension

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed(self, text: str) -> list[float]:
        cache_key = _text_hash(text)
        if cache_key in _CACHE:
            return _CACHE[cache_key]

        # Hash-based pseudo-embedding: deterministic, no semantic meaning
        import struct
        import math
        h = hashlib.sha512(text.encode("utf-8")).digest()
        # Repeat hash to fill dimension
        while len(h) < self._dimension * 4:
            h = h + hashlib.sha512(h).digest()
        vec = list(struct.unpack(f"<{self._dimension}f", h[: self._dimension * 4]))
        # Sanitize: replace NaN/Inf with small valid floats
        vec = [v if math.isfinite(v) else 0.01 for v in vec]
        # Normalize
        norm = sum(v * v for v in vec) ** 0.5
        if norm > 0:
            vec = [v / norm for v in vec]
        else:
            # Fallback if all zeros
            vec = [1.0 / math.sqrt(self._dimension)] * self._dimension
        _CACHE[cache_key] = vec
        return vec

    def embed_batch(self, texts: Sequence[str]) -> list[list[float]]:
        return [self.embed(t) for t in texts]


def get_embedder(
    backend: Optional[str] = None,
    dimension: Optional[int] = None,
) -> Embedder:
    """Factory. Auto-picks based on environment.

    Priority:
        1. Explicit backend arg
        2. MEMORY_EMBEDDER env var
        3. OpenAI if OPENAI_API_KEY is set
        4. BGE local if sentence-transformers installed
        5. Fake embedder (for tests)
    """
    if backend is None:
        backend = os.environ.get("MEMORY_EMBEDDER", "auto")

    if backend == "openai":
        return OpenAIEmbedder()
    elif backend == "bge":
        return LocalBGEEmbedder()
    elif backend == "fake":
        return FakeEmbedder(dimension or 64)
    elif backend == "auto":
        if os.environ.get("OPENAI_API_KEY"):
            try:
                return OpenAIEmbedder()
            except Exception:
                pass
        try:
            return LocalBGEEmbedder()
        except Exception:
            pass
        return FakeEmbedder(dimension or 64)
    else:
        raise ValueError(f"Unknown embedder backend: {backend}")


def clear_cache() -> None:
    """Clear the in-memory embedding cache."""
    _CACHE.clear()


def cache_size() -> int:
    """Return number of cached embeddings."""
    return len(_CACHE)
