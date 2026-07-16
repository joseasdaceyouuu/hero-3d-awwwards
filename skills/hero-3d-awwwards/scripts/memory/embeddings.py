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


class LLMKeywordEmbedder(Embedder):
    """Embedder basado en keywords temáticas extraídas con LLM.

    En vez de embeddings densos (OpenAI/BGE), este embedder:
      1. Usa el LLM (GLM-5.2 vía z-ai-web-dev-sdk) para extraer 10 keywords temáticas del texto
      2. Las hashea a un vector sparse de 256 dim
      3. Funciona para retrieval por similitud de temas (no semántica fina)

    Ventajas:
      - No requiere API key de OpenAI
      - No requiere sentence-transformers (pesado)
      - Funciona offline si el LLM está cacheado
      - Suficiente para retrieval de patrones (que es por tema, no por similitud fina)

    El vector es un bag-of-keywords hasheado a 256 dim. Dos textos con mismas
    keywords → mismo vector. Dos textos con keywords similares → vectores
    con overlap parcial.
    """

    DIMENSION = 256

    # Vocabulario temático fijo para heroes Awwwards (256 dimensiones)
    # Cada keyword se mapea a una posición en el vector.
    TOPIC_VOCAB = [
        # Estilos (32)
        "editorial", "minimalista", "cinematográfico", "cyberpunk", "luxe",
        "gamer", "techno", "orgánico", "atmospheric", "aggressive",
        "premium", "boutique", "corporate", "artistic", "experimental",
        "periodístico", "inmersivo", "narrativo", "abstracto", "futurista",
        "vintage", "handcrafted", "natural", "urbano", "rústico",
        "oscuro", "luminoso", "monocromo", "vibrante", "sutil",
        "elegante", "audaz",
        # Técnicas (32)
        "shader", "glitch", "particles", "parallax", "scroll",
        "typography", "webgl", "canvas", "css-3d", "r3f",
        "threejs", "gsap", "lenis", "letter-reveal", "mouse-glow",
        "golden-dust", "connected-particles", "bloom", "caustics", "aurora",
        "liquid-metal", "raymarch", "fog", "vignette", "grain",
        "scanlines", "rgb-split", "chromatic-aberration", "crt", "distortion",
        "postprocessing", "noise",
        # Verticales (32)
        "saas", "portfolio", "agency", "ecommerce", "fotografía",
        "moda", "vinos", "tecnología", "salud", "educación",
        "inmobiliaria", "automotriz", "gastronomía", "música", "juegos",
        "películas", "arquitectura", "interiores", "bebidas", "deportes",
        "sustentabilidad", "viajes", "belleza", "joyería", "relojes",
        "banca", "seguros", "legal", "inmobiliario", "energía",
        "agricultura", "minería",
        # Paletas (32)
        "oro-negro", "blanco-negro", "neón", "pastel", "tierra",
        "violeta", "amber", "cyan-magenta", "verde-lima", "rosa",
        "azul-profundo", "crema", "granate", "esmeralda", "sapphire",
        "obsidiana", "champagne", "bronce", "cobre", "plata",
        "wengue", "hueso", "musk", "sage", "terracotta",
        "midnight", "noir", "ivory", "olive", "burgundy",
        "monocromo-accent", "duotone",
        # Patrones de movimiento (32)
        "fadeup", "fadein", "blur-materialize", "scale-in", "rotate",
        "slide", "stagger", "choreography", "letter-by-letter", "word-reveal",
        "scroll-trigger", "dolly", "orbit", "rise", "pin",
        "sticky", "scrub", "snap", "elastic", "bounce",
        "morph", "explode", "shatter", "ripple", "wave",
        "burst", "trail", "comet", "stream", "cascade",
        "reveal", "unfold",
        # Componentes/UI (32)
        "loader", "preloader", "cursor-custom", "magnetic-button", "split-text",
        "scroll-camera", "text-3d", "shader-background", "blend-cursor", "hud",
        "letterbox", "vignette-overlay", "scan-beam", "deco-line", "monogram",
        "social-bar", "scroll-indicator", "cta-primary", "cta-secondary", "quote",
        "roles", "subtitle", "headline", "tag", "badge",
        "navigation", "menu", "footer", "section-divider", "stats",
        "icons", "logo",
        # Performance/Accesibilidad (32)
        "intersection-observer", "lazy-load", "dpr-clamp", "reduced-motion", "wcag-aa",
        "keyboard-nav", "aria-label", "focus-visible", "contrast-45", "pause-offscreen",
        "draco", "ktx2", "basis", "webp", "avif",
        "lottie", "svg", "webm", "mp4", "intersection",
        "perf-budget", "60fps", "30fps-min", "bundle-size", "lighthouse",
        "seo", "ssr", "ssg", "hydration", "suspense",
        "frameloop-demand", "pixel-ratio",
        # Anti-patterns (32)
        "overflow-hidden-sticky", "h1-nested", "smoothstep-args", "webgl-precision",
        "canvas-pointer-events", "shader-compile", "black-edges-parallax",
        "lenis-scrolltrigger-unsync", "layout-inverted", "loader-generic",
        "scroll-jank", "audio-autoplay", "webgl-safari-crash", "no-reduced-motion",
        "contrast-fail", "hero-no-hook", "too-many-effects", "more-than-8-layers",
        "delta-z-500", "8-cap-layers", "accent-5-elements", "grid-all-broken",
        "no-grid", "60-percent-empty", "no-typography-hierarchy", "multiple-cta",
        "no-aria", "no-keyboard", "no-fallback", "no-poster", "heavy-glb",
        "shader-too-dark",
    ]

    def __init__(self):
        self._dimension = self.DIMENSION
        # Mapeo keyword → índice en el vector
        self._keyword_to_idx = {kw: i for i, kw in enumerate(self.TOPIC_VOCAB)}
        # Cache de keywords extraídas por texto
        self._keyword_cache: dict[str, list[str]] = {}

    @property
    def dimension(self) -> int:
        return self._dimension

    def _extract_keywords(self, text: str) -> list[str]:
        """Extrae keywords temáticas del texto usando matching directo contra el vocabulario.

        En vez de llamar al LLM (lento + cuesta), hacemos matching directo de
        palabras/frases del texto contra el vocabulario fijo de 256 temas.
        Esto es determinístico, rápido y suficiente para retrieval por tema.
        """
        cache_key = _text_hash(text)
        if cache_key in self._keyword_cache:
            return self._keyword_cache[cache_key]

        text_lower = text.lower()
        # Normalizar: quitar acentos para matching más flexible
        import unicodedata
        text_normalized = unicodedata.normalize("NFD", text_lower)
        text_normalized = "".join(c for c in text_normalized if unicodedata.category(c) != "Mn")

        matched = []
        for keyword in self.TOPIC_VOCAB:
            kw_normalized = unicodedata.normalize("NFD", keyword)
            kw_normalized = "".join(c for c in kw_normalized if unicodedata.category(c) != "Mn")
            # Match exacto de palabra o frase
            if kw_normalized in text_normalized:
                matched.append(keyword)

        self._keyword_cache[cache_key] = matched
        return matched

    def embed(self, text: str) -> list[float]:
        """Convierte texto a vector bag-of-keywords normalizado."""
        cache_key = _text_hash(text)
        if cache_key in _CACHE:
            return _CACHE[cache_key]

        keywords = self._extract_keywords(text)
        vec = [0.0] * self._dimension
        for kw in keywords:
            idx = self._keyword_to_idx.get(kw)
            if idx is not None:
                vec[idx] = 1.0

        # Normalizar L2
        norm = sum(v * v for v in vec) ** 0.5
        if norm > 0:
            vec = [v / norm for v in vec]

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
    elif backend == "llm-keyword":
        return LLMKeywordEmbedder()
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
        # Try LLM keyword embedder (uses z-ai-web-dev-sdk CLI if available)
        try:
            return LLMKeywordEmbedder()
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
