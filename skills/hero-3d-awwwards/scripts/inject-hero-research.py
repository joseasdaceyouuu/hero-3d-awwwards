#!/usr/bin/env python3
"""Inject hero design insights from user's research document into memory."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.resolve()))
from memory import MemorySystem, FakeEmbedder, clear_cache

def main():
    clear_cache()
    mem = MemorySystem(
        db_path='/home/z/my-project/memory-data/memory.db',
        lancedb_path='/home/z/my-project/memory-data/lancedb',
        embedder=FakeEmbedder(dimension=64),
    )

    patterns = [
        # === Proceso creativo ===
        {
            "content": "Proceso creativo hero: Brief → Wireframe → Mockup visual → Prototipo interactivo → Test usuario → Desarrollo → Optimización → Lanzamiento. Nunca saltar al código sin wireframe primero.",
            "category": "process",
            "importance": 9,
        },
        {
            "content": "Hero debe comunicar en 3 segundos: quién eres, qué ofreces, por qué quedarse. Si el usuario no entiende la propuesta de valor en 3s, la tasa de rebote aumenta.",
            "category": "philosophy",
            "importance": 10,
        },
        # === Casos premiados — técnicas ===
        {
            "content": "Fit Design (SOTD 2022): minimalismo con contraste fuerte (blanco-negro-amarillo), tipografía audaz, scroll parallax en textos e imágenes. Menos es más.",
            "category": "benchmark",
            "importance": 7,
        },
        {
            "content": "Thread & Mesh (SOTD 2026): modelos 3D interactivos de prendas con WebGL/Three.js. Experiencia inmersiva y accesible. E-commerce con configurador 3D.",
            "category": "benchmark",
            "importance": 8,
        },
        {
            "content": "21 Hours on the Moon (SOTD 2025): hero 3D interactivo con mapa lunar de alta resolución. Permite rotar y profundizar en tiempo real. WebGL + SvelteKit.",
            "category": "benchmark",
            "importance": 7,
        },
        {
            "content": "House of Honey (SOTD 2026): hero editorial con gran superposición tipográfica en blanco sobre fotos de producto. Estilo minimalista y sofisticado. Tipografía en capas.",
            "category": "benchmark",
            "importance": 7,
        },
        {
            "content": "Bastian Gasser (SOTD 2023): tipografía manuscrita animada con efecto de dibujo a mano que se va trazando. SVG/canvas path animation para texto creativo.",
            "category": "benchmark",
            "importance": 8,
        },
        {
            "content": "D&G Beauty Gift Finder (SOTD 2023): arte generativo con particles + three.js + filtros interactivos. Experiencia lúdica con IA de recomendaciones.",
            "category": "benchmark",
            "importance": 7,
        },
        # === Patrones técnicos ===
        {
            "content": "Scroll horizontal como hero innovador (PRA Healthcare): narración visual parallax de datos. Scroll horizontal + parallax + animación de infografía.",
            "category": "layout",
            "importance": 7,
        },
        {
            "content": "Experiencia 'pageless' con IA conversacional en hero (Brunello Cucinelli 2026): scroll continuo infinito + búsqueda intuitiva + chatbot embebido. Navegación sin páginas.",
            "category": "layout",
            "importance": 7,
        },
        {
            "content": "Skeuomorphic UI en hero (Mosby's Files 2026): interfaz esquemática tipo escritorio con animación de plegado de carpetas. GSAP + Vue.js.",
            "category": "layout",
            "importance": 6,
        },
        # === Performance y Core Web Vitals ===
        {
            "content": "LCP del hero debe ser <1s idealmente, <2.5s mínimo. Preload de la imagen hero con <link rel='preload'>. Servir formatos WebP/AVIF.",
            "category": "performance",
            "importance": 10,
        },
        {
            "content": "CLS <0.1: reservar espacio (width/height) para imágenes/videos del hero. No inyectar contenido encima del hero después de load. Font-display: swap para evitar FOIT.",
            "category": "performance",
            "importance": 9,
        },
        {
            "content": "TTFB ≤0.8s para 75% de usuarios. Usar CDN, caching, y SSR (Next.js/Nuxt.js). El HTML base incluyendo el hero debe llegar rápido.",
            "category": "performance",
            "importance": 9,
        },
        # === Accesibilidad ===
        {
            "content": "Hero accesible: un solo <h1> para SEO, <header> semántico, alt descriptivo en imágenes, aria-label en botones, área táctil mínima 44x44px en mobile.",
            "category": "accessibility",
            "importance": 9,
        },
        {
            "content": "Si hay vídeo en hero: ofrecer controles o que sea muted por defecto para usuarios con fotosensibilidad. Evitar contenido parpadeante.",
            "category": "accessibility",
            "importance": 8,
        },
        # === Composición ===
        {
            "content": "Composición hero estándar: contenedor con fondo (imagen/color/video) + <h1> titular + <p> subtítulo + CTA. background-size: cover, background-position: center. Mobile-first responsive.",
            "category": "layout",
            "importance": 8,
        },
        {
            "content": "CTA debe ser único, visible arriba del pliegue, y destacado. Múltiples CTAs diluyen la intención. Color de contraste con el fondo.",
            "category": "layout",
            "importance": 8,
        },
        # === Herramientas recomendadas ===
        {
            "content": "Stack recomendado 2026: Figma (diseño) + GSAP (animación) + Lenis (scroll suave) + LottieFiles (vectorial) + Three.js/R3F (3D) + Next.js (SSR/SEO) + Cloudinary/Imgix (imágenes dinámicas).",
            "category": "stack",
            "importance": 8,
        },
        {
            "content": "Para texto creativo animado: SVG path animation (trazado a mano), TypeIt (typewriter), SplitText (GSAP 3.13 gratis), CSS clip-path (reveal). Evitar Canvas para texto.",
            "category": "typography",
            "importance": 8,
        },
    ]

    print(f"Inyectando {len(patterns)} patrones del documento de research del usuario...")
    added = 0
    for p in patterns:
        mem.semantic.add(
            content=p["content"],
            category=p["category"],
            importance=p["importance"],
            source_episodes=["user-research-doc"],
        )
        added += 1
        print(f"  + [imp={p['importance']}/10] {p['category']:15s} | {p['content'][:80]}...")

    stats = mem.stats()
    print(f"\n=== MEMORIA ACTUALIZADA ===")
    print(f"Episodios: {stats['episodes']}")
    print(f"Patrones: {stats['semantic_notes']} (+{added} nuevos)")
    print(f"Anti-patrones: {stats['anti_patterns']}")
    mem.close()

if __name__ == "__main__":
    main()
