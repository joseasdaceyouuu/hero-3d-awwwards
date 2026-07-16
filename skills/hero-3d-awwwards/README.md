# Hero 3D Awwwards — Skill Auto-Mejorable

> Sistema autónomo para generar hero sections nivel Awwwards Site of the Day con animación 2.5D/3D, shaders GLSL, y post-processing cinematográfico.

## Estado actual

| Métrica | Cantidad |
|---|---|
| Heroes construidos | 15 |
| Patrones en memoria | 88 |
| Anti-patterns documentados | 21 |
| Componentes reutilizables | 17 |
| Arquetipos cubiertos | 5/5 + 5 extra |
| VLM auditados | 8 heroes |
| Episodios en memoria | 14 |

## Arquitectura

```
hero-3d-awwwards/
├── SKILL.md                    # Skill definition (5 arquetipos, 3 stacks)
├── library/                    # Componentes y shaders reutilizables
│   ├── components/             # 17 componentes React (LetterReveal, TextToParticles, etc)
│   ├── shaders/                # 10 shaders GLSL (noise, fresnel, aurora, etc)
│   └── registry.json           # Catálogo de skills con props y metadata
├── references/                 # Documentación técnica
│   ├── awwwards-patterns.md    # 30+ patrones + 21 anti-patterns
│   ├── awwwards-sotd-2026.md   # 25 ejemplos SOTD catalogados
│   ├── web-2026-standards.md   # Estándares 2026
│   └── ...                     # 7 referencias más
├── scripts/
│   ├── auto-loop-v2.py         # Loop end-to-end con VLM + circuit-breaker
│   ├── vlm_auditor.py          # Auditor visual con Vision Language Model
│   ├── mcp-server.py           # MCP server (6 tools consumibles por Claude/Cursor)
│   ├── post_process_code.py    # Post-procesamiento automático de imports
│   ├── run-consolidation.py    # Consolidación de memoria (reflection)
│   ├── extract-heroes-to-memory.py  # Extracción de heroes a memoria
│   ├── prompts/                # System prompts (creator-v2, auditor, corrector, etc)
│   └── memory/                 # Sistema de memoria (SQLite + embeddings)
│       ├── stores.py           # 5 stores (episodic, semantic, procedural, anti-patterns, working)
│       ├── embeddings.py       # LLMKeywordEmbedder (256 dim, sin dependencias externas)
│       ├── retrieval.py        # Tri-score retrieval (recency + importance + relevance)
│       └── consolidation.py    # Reflection automático (patrones → skills → anti-patterns)
├── evals/
│   └── visual/
│       ├── cases.json          # 25 casos de test visual
│       ├── run-visual-evals.py # Runner con Playwright + numpy
│       └── vlm_auditor.py      # VLM auditor (GLM-4.6V via z-ai CLI)
├── assets/heroes/              # 4 referencias HTML (ARAGAL, Street Workout, AETHER, Void Tunnel)
└── data/                       # Memoria persistente (SQLite + JSON embeddings)
```

## Heroes construidos

| # | Nombre | Ruta | Arquetipo | Layout | Stack |
|---|--------|------|-----------|--------|-------|
| 1 | PROFUNDIDAD | / | Cinematográfico multi-capa Z | Sticky pinned 400vh | R3F + GLSL |
| 2 | VERVAIN | /vervain | Editorial minimalista | Centrado | Canvas 2D + CSS |
| 3 | PIXELVOID | /pixelvoid | Cyberpunk glitch | Centrado | WebGL crudo |
| 4 | MÉRIDA | /merida | Vino premium | Centrado + scroll | Canvas 2D + CSS |
| 5 | CAFÉ ALTURAS | /cafe | Café artesanal | Centrado + scroll | Canvas 2D + CSS |
| 6 | BRÚJULA | /brujula | Viajes aventura | Split izq/der | Canvas 2D + CSS |
| 7 | NÓMADA | /nomada | Portfolio arquitecto | Tipográfico full | CSS puro |
| 8 | CRONOS | /cronos | Relojes lujo | Grid 3-col + orbital | Canvas 2D + SVG |
| 9 | NEXUS | /nexus | IA/biotech | Centrado + 3D | Three.js + GLSL |
| 10 | VOID TUNNEL | /void-tunnel | Túnel infinito | Full-bleed scroll | CSS 3D + JS |
| 11 | CINEFEST | /cinefest | Cine 16mm | Full-bleed + overlay | Canvas 2D + CSS |
| 12 | PRISMA | /prisma | Multi-scena | 3 escenas cambiables | Canvas 2D + CSS |
| 13 | AURORA | /aurora | Shader + bloom | Centrado + 3D | R3F + GLSL |
| 14 | ARQUÍMEDES | /arquimedes | GLB centerpiece | Split izq/der | R3F + drei |
| 15 | HORIZONTE | /horizonte | Scroll horizontal | 4 paneles horizontales | CSS + JS |

## Componentes library (17)

| Componente | Descripción |
|---|---|
| LetterReveal | Título letra por letra (3 variantes: reveal, blur, scale) |
| ConnectedParticles | Partículas Canvas 2D con conexiones tipo constelación |
| GoldenDust | Partículas doradas radiales al click (micro-reward) |
| MouseGlow | Glow suave que sigue al cursor (mix-blend-mode: screen) |
| Preloader | Pantalla de carga con 3 variantes (progress, percentage, morph) |
| ShaderBackground | Background WebGL con shader custom + mouse interaction |
| SplitText | Texto con stagger por palabra (4 variantes) |
| MagneticButton | Botón magnético atraído al cursor |
| BlendCursor | Cursor custom con mix-blend-mode: difference |
| ScrollCamera | Cámara 3D scroll-driven (3 modos: dolly, orbit, rise) |
| Text3DCinematic | Tipografía 3D con troika SDF |
| **TextToParticles** | Texto formado por partículas que se dispersan con cursor |
| **MagneticElement** | Elemento UI atraído magnéticamente al cursor |
| **SplitScreen** | Pantalla dividida que sigue al cursor con clipPath |
| TextToParticles | Partículas que forman texto y se dispersan |
| MagneticElement | Atracción magnética real (transform translate) |
| SplitScreen | Pantalla dividida con clipPath polygon |

## Sistema de memoria

5 stores con retrieval tri-score (recency + importance + relevance):

| Store | Contenido | Cantidad |
|---|---|---|
| Episodic | Sesiones completas de heroes | 14 |
| Semantic | Patrones atómicos extraídos | 88 |
| Procedural | Skills reutilizables con success/fail counts | 12 |
| Anti-patterns | Errores conocidos a evitar | 21 |
| Working | Estado en-proceso (no persistido) | — |

## MCP Server

6 tools expuestas via stdio JSON-RPC, consumibles por Claude Desktop, Cursor, v0:

```json
{
  "mcpServers": {
    "hero-3d-awwwards": {
      "command": "python3",
      "args": ["skills/hero-3d-awwwards/scripts/mcp-server.py"]
    }
  }
}
```

Tools: `retrieve_patterns`, `retrieve_anti_patterns`, `generate_hero`, `audit_hero`, `list_heroes`, `get_memory_stats`

## Auto-Loop v2

Loop end-to-end con VLM integrado:

```
brief → recuperar memoria → Creator (con post-procesamiento) → build → VLM audit → corrector → extraer a memoria
```

Features: circuit-breaker (cambia layout si score estanca), loop anti-patterns cerrado (VLM bugs → memoria), post-procesamiento automático de imports.

## CI/CD

GitHub Actions corre en cada push:
- Evals visuales contra los 4 heroes principales (25 casos)
- VLM audit (3 steps por hero)
- Screenshots + reportes como artifacts

## Tecnologías

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **3D:** React Three Fiber, Three.js, drei, GLSL
- **Animación:** GSAP + ScrollTrigger, Lenis smooth scroll
- **Backend:** Python 3, SQLite, z-ai-web-dev-sdk (GLM-4.6 + GLM-4.6V)
- **Testing:** Playwright, Pillow, numpy
- **CI:** GitHub Actions
