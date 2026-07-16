# Scripts — Hero 3D Awwwards

## Scripts principales (usar estos)

| Script | Qué hace | Líneas |
|---|---|---|
| `auto-loop-v3.py` | **Loop end-to-end estable** con retry/backoff. Brief → Creator → post-procesamiento → build → VLM audit → memoria | 263 |
| `vlm_auditor.py` | **VLM Auditor** — captura screenshots, analiza con GLM-4.6V, devuelve scores + bugs | 280 |
| `mcp-server.py` | **MCP Server** — 6 tools consumibles por Claude/Cursor (retrieve_patterns, generate_hero, audit_hero, etc) | 324 |
| `hero-geneticist.py` | **Algoritmo genético** — cruza patrones de 2 heroes para generar un hijo | 221 |
| `post_process_code.py` | **Post-procesamiento** — arregla 5 anti-patterns automáticamente (imports, h1, preloader, overflow) | 224 |
| `run-consolidation.py` | **Consolidación de memoria** — reflection: extrae patrones recurrentes, promueve skills | 82 |

## Scripts de extracción (usar cuando se construyan heroes nuevos)

| Script | Qué hace |
|---|---|
| `extract-heroes-to-memory.py` | Extrae heroes a memoria (episodios + patrones + anti-patterns) |
| `extract-4-new-heroes.py` | Extracción específica para BRÚJULA, NOMADA, CRONOS, NEXUS |
| `integrate-skills.py` | Lista/integra skills del ecosistema z-ai (image-gen, web-search, VLM, etc) |

## Scripts obsoletos (no usar)

Estos scripts fueron reemplazados por versiones más nuevas:

| Script obsoleto | Reemplazado por |
|---|---|
| `auto-loop.py` | `auto-loop-v3.py` |
| `auto-loop-v2.py` | `auto-loop-v3.py` |
| `hero-loop.py` | `auto-loop-v3.py` |
| `loop-completo-es.py` | `auto-loop-v3.py` |
| `loop-creator-v2-completo.py` | `auto-loop-v3.py` |
| `run-real-loop.py` | `auto-loop-v3.py` |
| `post-process-code.py` | `post_process_code.py` (underscore) |
| `consult-creator.py` | `mcp-server.py --test` |
| `retrieve.py` | `mcp-server.py` (tool retrieve_patterns) |
| `create-hero-with-glm52.py` | `auto-loop-v3.py` |
| `creator-v2-test.py` | `auto-loop-v3.py` |
| `audit-heroes.py` | `vlm_auditor.py` |
| `inject-hero-research.py` | (datos ya inyectados, no necesario) |
| `inject-web-2026-patterns.py` | (datos ya inyectados, no necesario) |
| `save-chrome-surface.py` | (one-time script, no necesario) |
| `save-northern-lights.py` | (one-time script, no necesario) |
| `save-silent-light.py` | (one-time script, no necesario) |

## Módulos internos (no ejecutar directamente)

| Módulo | Descripción |
|---|---|
| `memory/stores.py` | 5 stores (episodic, semantic, procedural, anti-patterns, working) |
| `memory/embeddings.py` | LLMKeywordEmbedder (256 dim, sin dependencias) |
| `memory/retrieval.py` | Tri-score retrieval (recency + importance + relevance) |
| `memory/consolidation.py` | Reflection automático |
| `memory/compression.py` | Compresión TOON de iteraciones |
| `memory/extraction.py` | Extracción LLM de patrones |
| `prompts/` | System prompts (creator-v2, auditor, corrector, user-simulator) |
