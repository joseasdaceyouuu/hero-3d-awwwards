# Quickstart — Hero 3D Awwwards en 5 minutos

## ¿Qué es esto?

Una skill auto-mejorable que genera hero sections nivel Awwwards con animación 2.5D/3D, shaders GLSL, physics, audio-reactive, y glassmorphism. Tiene 19 heroes de referencia, 119 patrones en memoria, y un VLM auditor que "ve" el resultado.

## Empezar en 5 minutos

### 1. Ver la galería de heroes
```
http://localhost:3000/heroes
```
19 heroes con filtros por vertical. Click en cualquier card para ver detalles.

### 2. Ver un hero específico
```
http://localhost:3000/vervain      # Editorial oro/negro
http://localhost:3000/nexus        # Núcleo 3D shader
http://localhost:3000/gravitas     # Physics Matter.js
http://localhost:3000/sonar        # Audio-reactive
http://localhost:3000/synthesia    # Glassmorphism
```

### 3. Ver el panel de memoria
```
http://localhost:3000/  → botón "Memoria"
```
Muestra 18 episodios, 119 patrones, 21 anti-patterns.

### 4. Auditar un hero con VLM
```bash
cd skills/hero-3d-awwwards/evals/visual
python vlm_auditor.py --url http://localhost:3000/vervain --name VERVAIN --steps 0.0 0.5 1.0
```
Toma screenshots y los analiza con GLM-4.6V. Devuelve scores y bugs.

### 5. Recuperar patrones de memoria
```bash
cd skills/hero-3d-awwwards/scripts
python -c "
from memory.stores import MemorySystem
from memory.embeddings import LLMKeywordEmbedder
m = MemorySystem(db_path='../data/memory.db', lancedb_path='../data/lancedb', embedder=LLMKeywordEmbedder())
results = m.semantic.search('hero cyberpunk neon', top_k=5)
for note, score in results:
    print(f'[{score:.3f}] {note[\"content\"][:80]}')
m.close()
"
```

## Scripts principales (solo 6)

| Script | Qué hace |
|---|---|
| `auto-loop-v3.py` | Loop end-to-end: brief → Creator → build → VLM audit → memoria |
| `vlm_auditor.py` | Audita visualmente un hero con VLM (screenshots + análisis) |
| `mcp-server.py` | MCP server con 6 tools (retrieve_patterns, generate_hero, etc) |
| `hero-geneticist.py` | Algoritmo genético que cruza patrones de 2 heroes |
| `post_process_code.py` | Post-procesa código generado (arregla 5 anti-patterns automáticamente) |
| `run-consolidation.py` | Consolida memoria (reflection: extrae patrones recurrentes) |

## Componentes library (17)

Importar desde `@/lib/library/components/`:

| Componente | Para qué |
|---|---|
| LetterReveal | Título letra por letra (3 variantes) |
| ConnectedParticles | Partículas Canvas 2D con conexiones |
| GoldenDust | Partículas al click (micro-reward) |
| MouseGlow | Glow que sigue cursor (screen blend) |
| Preloader | Pantalla de carga (3 variantes) |
| TextToParticles | Texto formado por partículas que se dispersan |
| MagneticElement | Elementos atraídos magnéticamente al cursor |
| SplitScreen | Pantalla dividida que sigue al cursor |
| **HeroPolish** | Glow radial + scroll indicator (arregla bugs VLM) |

## Anti-patterns críticos (21 documentados)

Los más importantes:
- **5.9**: `overflow-x: hidden` rompe sticky → usar `clip`
- **5.13**: `<h1>` anidado en `<h1>` → `as="span"` en LetterReveal
- **5.15**: WebGL crudo necesita `precision highp float;` + attributes declarados
- **5.18**: Preloader sin timer → `useEffect` con `setTimeout`
- **5.20**: EffectComposer causa parpadeo → HDR + tonemap en shader + CSS overlays

## Stack

- Next.js 16 + React 19 + TypeScript + Tailwind 4
- R3F + Three.js + drei + GLSL
- GSAP + ScrollTrigger + Lenis
- Matter.js (physics)
- Web Audio API (audio-reactive)
- Python 3 + SQLite (memoria)
- z-ai-web-dev-sdk (GLM-4.6 + GLM-4.6V)
