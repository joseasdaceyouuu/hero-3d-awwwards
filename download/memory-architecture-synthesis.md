# Synthesis: Memory Architecture for the Hero-3D-Awwwards Agent Loop

> **Documento de decisión.** Sintetiza 3 investigaciones profundas (3,051 líneas
> de research en `/home/z/my-project/research/`) en una arquitectura concreta
> con decisiones tomadas, opciones descartadas, y un plan de implementación
> por fases.
>
> **Fecha:** 2026-07-15
> **Skill objetivo:** `hero-3d-awwwards` (4-agent loop: Creator → Auditor →
> User Simulator → Corrector)
> **Status:** Ready for implementation. Las decisiones aquí son finales salvo
> bloqueo técnico durante la implementación.

---

## 1. Por qué necesitamos memoria

El skill actual (v3) tiene 4 agentes que iteran hasta 5 veces. Por cada
iteración, cada agente recibe:

| Contenido | Tamaño aproximado |
|---|---|
| SKILL.md + references relevantes | ~15-20 KB |
| Código generado en iteración anterior | 10-50 KB |
| Audit JSON anterior | 2-10 KB |
| Subjective JSON anterior | 3-5 KB |
| Prompt del sistema del agente | 2-5 KB |
| **Total por call en iteración 5** | **~50-100 KB** |

Con 4 agentes × 5 iteraciones = 20 LLM calls × 75 KB promedio = ~1.5 MB de
tokens por sesión. Eso son ~400K tokens solo en input. A precios actuales de
GPT-4-class, eso son $4-8 por sesión. Y peor: **no aprende entre sesiones**.

La memoria debe resolver 3 problemas:

1. **Compresión intra-sesión**: no reenviar todo el código anterior en cada
   llamada. Iteración 5 no necesita el código completo de iteración 1 — solo
   los cambios relevantes.
2. **Aprendizaje cross-sesión**: cuando el usuario vuelva a pedir un hero
   similar, el sistema debería recordar qué patrones funcionaron y cuáles no.
3. **Evitar bloat**: a medida que el sistema acumule cientos de sesiones, no
   podemos simplemente seguir añadiento a un vector DB sin políticas de
   consolidación y olvido.

---

## 2. Hallazgos convergentes de las 3 investigaciones

Las 3 fuentes (memory systems, context compression, advanced patterns) apuntan
independientemente a las mismas conclusiones. Eso es señal fuerte.

### 2.1 Convergencia 1: Multi-tier memory, no single product

Los 3 reports coinciden: **ningún producto único resuelve todo**. La arquitectura
correcta combina capas con responsabilidades distintas.

- Report 01 propone **3 tiers**: iteration state (LangGraph checkpointer) +
  pattern memory (mem0) + few-shot episodic (JSON).
- Report 05 propone **5 stores**: working, episodic, semantic, procedural,
  negative-knowledge — basado en CoALA + Voyager + Reflexion.
- Report 02 no habla de stores pero su "estrategia jerárquica de compresión"
  es estructuralmente idéntica: cache + structural + summarization + pruning,
  que se mapean a los 4 stores del Report 05.

**Decisión**: adoptar la arquitectura de 4 stores del Report 05, con la
nomenclatura del Report 01 (más práctica) y las técnicas de compresión del
Report 02 aplicadas en cada store.

### 2.2 Convergencia 2: Tri-score retrieval

Report 05 lo encuentra en Generative Agents (Park et al.). Report 01 lo
encuentra en CrewAI (`composite = semantic*w_s + recency*w_r + importance*w_i`).
Report 02 lo encuentra indirectamente vía "time-aware retrieval" en Mem0.

Los pesos óptimos variarán por store:
- Episodic memory: `semantic=0.4, recency=0.4, importance=0.2` (recientes y
  similares pesan igual)
- Semantic memory: `semantic=0.5, recency=0.2, importance=0.3` (la importancia
  del pattern pesa más que la fecha)
- Procedural skills: `semantic=0.6, recency=0.1, importance=0.3` (casi puro
  match semántico — una skill vieja pero relevante sigue siendo buena)

**Decisión**: implementar tri-score como función reutilizable con pesos
configurables por store.

### 2.3 Convergencia 3: No aplicar LLMLingua a código ni JSON

Report 02 es explícito: LLMLingua colapsa en código (rompe sintaxis) y JSON
(pierde campos). Para código usar **SWE-Pruner** (code-specific, 23-54%
reducción), para JSON usar **TOON** (transformación estructural, 30-61% sin
perder información).

**Decisión**: zero uso de LLMLingua en el pipeline. Para código usar hash +
diff references; para JSON usar TOON + field pruning.

### 2.4 Convergencia 4: Prompt caching es free win

Report 02 lo dice claro: Anthropic caching da 90% off en cache reads, cero
quality loss. El SKILL.md (15-20 KB) se reenvía en cada uno de los 20 LLM
calls de una sesión. Si lo cacheamos con un breakpoint explícito, ahorramos
~90% en ese bloque.

**Decisión**: si usamos Anthropic, habilitar prompt caching con breakpoint
después del SKILL.md. Si usamos GLM/OpenAI, depender del cacheo automático.

### 2.5 Convergencia 5: El "filesystem beats specialized memory" finding

Report 01 destaca el benchmark de Letta: un agente que simplemente guarda
conversaciones en archivos planos y las busca con `grep` scores **74.0% en
LoCoMo**, batiendo a Mem0 (68.5%). La moraleja: **no sobre-ingeniar el storage
backend**. La calidad del agent memory depende más del contexto management
que del engine de retrieval.

**Decisión**: empezar con SQLite + JSON files. Solo migrar a vector DB si
medimos que la búsqueda es el cuello de botella.

---

## 3. Hallazgos conflictivos y cómo los resolvemos

### 3.1 Conflicto: ¿mem0 o CrewAI Memory?

- Report 01 recomienda mem0 por su API minimalista y focuses en extracción
  atómica.
- Report 01 también nota que CrewAI tiene mejor composite scoring (semantic +
  recency + importance con pesos tunables).

**Resolución**: usar **mem0 OSS** para empezar (API más simple, menos
infra). Si la calidad de retrieval es mala en producción, migrar a CrewAI
Memory. El costo de migración es bajo porque ambos usan vector DB + Postgres.

### 3.2 Conflicto: ¿Postgres o SQLite para el checkpointer?

- Report 01 recomienda Postgres (production-ready, escalable).
- El "filesystem beats specialized memory" finding sugiere que SQLite es
  suficiente para empezar.

**Resolución**: **SQLite con WAL mode** para desarrollo y producción inicial.
Postgres solo si concurrent users > 10 o si necesitamos replicas. SQLite con
WAL soporta lecturas concurrentes y es zero-infra.

### 3.3 Conflicto: ¿Vector DB embedded o server?

- Report 01 sugiere Qdrant embedded (vía mem0 default).
- Report 05 menciona LanceDB como default de CrewAI (embedded, sin servidor).

**Resolución**: **LanceDB embedded**. Es el más liviano (Rust-based, file-backed),
no requiere Docker, y CrewAI lo usa por defecto lo cual sugiere que está
probado en producción. sqlite-vec es alternativa si queremos incluso más
simplicidad.

### 3.4 Conflicto: ¿Necesitamos Graph DB (Zep/Graphiti)?

- Report 01 menciona Graphiti (Neo4j) pero nota que requiere infra pesada.
- Report 05 no menciona graph DBs; el patrón A-MEM (Zettelkasten) logra
  "linked notes" sin Neo4j.

**Resolución**: **no usar graph DB**. Implementar A-MEM-style linked notes
con SQLite + JSON. Cada memory tiene un `links: []` array con IDs de otras
memories. Búsqueda por links en SQL es trivial. Graph DB es overkill para
nuestro volumen (cientos de memories, no millones).

---

## 4. Arquitectura final decidida

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   AGENT LOOP (Creator → Auditor → User Simulator → Corrector)           │
│                                                                         │
│   En cada call, el agente recibe:                                       │
│   1. Working Memory (current iteration state)                           │
│   2. Retrieved patterns from Semantic Memory (top-5 tri-score)          │
│   3. Retrieved skills from Procedural Memory (top-3 tri-score)          │
│   4. Few-shot examples from Episodic Memory (top-2 by score)            │
│   5. SKILL.md (cached via Anthropic prompt cache)                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  WORKING MEMORY (in-process, per iteration)                             │
│  ─────────────────────────────────────────────────────────────          │
│  - Current brief (user request parsed)                                  │
│  - Current code snapshot (hash-referenced, not inlined if unchanged)    │
│  - Current audit JSON (TOON-compressed, blockers only after iter 2)     │
│  - Current subjective JSON                                              │
│  - Iteration counter                                                    │
│                                                                         │
│  Compression: hash references + TOON + graduated reduction by age       │
│  Backend: in-memory Python dict + SQLite checkpoint per iteration       │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ after each iteration completes:
                                  │ extract → episodic, semantic, procedural
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  EPISODIC MEMORY (raw past iterations, append-only)                     │
│  ─────────────────────────────────────────────────────────────          │
│  Stores: full hero sessions as JSON files                               │
│  Schema: HeroEpisode {                                                  │
│    id, timestamp, brief, archetype, stack,                              │
│    iterations: [{code_hash, audit, subjective, changes}],               │
│    final_score, outcome, user_feedback                                  │
│  }                                                                      │
│                                                                         │
│  Retrieval: top-2 by brief similarity (semantic embedding)              │
│  Backend: JSON files in /episodes/{vertical}/ + LanceDB index           │
│  Retention: forever (raw material for consolidation)                    │
│  Compression: code stored by hash + diff, not inlined                   │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ weekly consolidation job:
                                  │ extract patterns + skills from episodes
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SEMANTIC MEMORY (extracted patterns, cross-session)                    │
│  ─────────────────────────────────────────────────────────────          │
│  Stores: atomic facts about hero design                                 │
│  Schema: SemanticNote {                                                 │
│    id, content, vertical, category, importance (1-10),                  │
│    source_episodes: [id], created_at, last_accessed,                    │
│    links: [other_note_ids], valid_until (nullable)                      │
│  }                                                                      │
│                                                                         │
│  Examples:                                                              │
│  - "Parallax 2.5D with 3-5 layers works for photographer portfolios"   │
│  - "Arquetipo 5 (Text 3D) too aggressive for SaaS landing pages"        │
│  - "Magenta + black + white palette achieves premium feel for creative" │
│                                                                         │
│  Retrieval: top-5 by tri-score (semantic=0.5, recency=0.2, imp=0.3)     │
│  Backend: SQLite (facts) + LanceDB (embeddings)                         │
│  Retention: active forgetting (valid_until expires stale facts)         │
│  Compression: atomic facts ~1 sentence each, ~20 tokens                 │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ consolidation extracts:
                                  │ recurring successful patterns → skills
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PROCEDURAL MEMORY (skill library, Voyager-style)                       │
│  ─────────────────────────────────────────────────────────────          │
│  Stores: reusable component generators validated across episodes        │
│  Schema: Skill {                                                        │
│    id, description, code_template, parameters,                          │
│    success_count, fail_count, last_used,                                │
│    source_episodes: [id], valid_verticals: [str]                        │
│  }                                                                      │
│                                                                         │
│  Examples:                                                              │
│  - "photographer-parallax-default": generates Parallax2DCSS with        │
│    4 layers + accent color + cinematic stagger                          │
│  - "saas-minimal-text3d": generates Cinematic3DText with depth entry    │
│    + reduced motion fallback + SaaS-safe palette                        │
│                                                                         │
│  Retrieval: top-3 by tri-score (semantic=0.6, recency=0.1, imp=0.3)     │
│  Backend: SQLite + LanceDB on description embeddings                    │
│  Retention: skills with fail_count > success_count get quarantined      │
│  Compression: code templates are full (they're reusable)                │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ consolidation also extracts:
                                  │ recurring failure patterns → anti-patterns
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NEGATIVE KNOWLEDGE (anti-patterns, what NOT to do)                     │
│  ─────────────────────────────────────────────────────────────          │
│  Stores: patterns that consistently fail the Auditor or User Simulator  │
│  Schema: AntiPattern {                                                  │
│    id, description, failure_mode,                                       │
│    occurrences: [episode_id + criterion_id],                            │
│    created_at, last_seen, status (active | resolved)                    │
│  }                                                                      │
│                                                                         │
│  Examples:                                                              │
│  - "Linear easing on primary animations always fails C11"              │
│  - "5+ color palettes fail C10 AND get flagged as 'busy' by simulator" │
│  - "Audio autoplay without opt-in causes abort"                         │
│                                                                         │
│  Retrieval: top-3 by semantic match to current brief                    │
│  Backend: SQLite (no embeddings needed — small set)                     │
│  Retention: never auto-delete (negative knowledge is precious)          │
│  Compression: atomic, ~1 sentence                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Decisiones técnicas concretas

### 5.1 Stack tecnológico decidido

| Componente | Tecnología | Razón |
|---|---|---|
| Working memory | Python dict + SQLite WAL | Zero infra, suficiente para sesión |
| Episodic store | JSON files + LanceDB index | Simple, portable, file-backed |
| Semantic store | SQLite + LanceDB | Atomic facts + embeddings |
| Procedural store | SQLite + LanceDB | Skills indexados por description embedding |
| Negative store | SQLite (no embeddings) | Set pequeño, búsqueda SQL basta |
| Vector DB | **LanceDB embedded** | Rust, file-backed, sin servidor, usado por CrewAI |
| Embeddings | `text-embedding-3-small` (OpenAI) o `bge-small-en-v1.5` (local) | Code+creative, 1536 dim, barato |
| LLM backend | GLM (default) / OpenAI / Anthropic | Ya soportado en hero-loop.py |
| Prompt caching | Anthropic cache (si backend=anthropic) | -90% en SKILL.md re-reads |
| Compression | Hash references + TOON + graduated reduction | Cero LLMLingua (rompe code/JSON) |

### 5.2 Embedding model decision

**Para empezar**: `text-embedding-3-small` de OpenAI ($0.02/1M tokens).
- Pros: alta calidad en code + creative, 1536 dim, rápido.
- Cons: requiere API key.

**Alternativa local**: `bge-small-en-v1.5` (BAAI) vía sentence-transformers.
- Pros: gratis, offline, 384 dim.
- Cons: menor calidad en creative content.

**Decisión**: empezar con OpenAI embeddings (calidad > costo en nuestro
volumen). Si el costo de embeddings se vuelve problemático (>1000 episodios),
migrar a BGE local.

### 5.3 Tri-score implementation

```python
import math
from datetime import datetime, timedelta

def tri_score(
    memory: dict,
    query_embedding: list,
    memory_embedding: list,
    weights: tuple = (0.5, 0.2, 0.3),  # (semantic, recency, importance)
    recency_half_life_days: float = 30.0,
) -> float:
    """Tri-score retrieval (Generative Agents pattern).

    Args:
        memory: dict with 'importance' (1-10), 'last_accessed' (ISO date)
        query_embedding: list of floats
        memory_embedding: list of floats
        weights: (semantic, recency, importance) — tune per store
        recency_half_life_days: recency decays to 0.5 after this many days

    Returns:
        Composite score in [0, 1].
    """
    # Semantic: cosine similarity
    semantic = cosine_sim(query_embedding, memory_embedding)

    # Recency: exponential decay
    days_since = (datetime.utcnow() - datetime.fromisoformat(memory['last_accessed'])).days
    recency = math.pow(0.5, days_since / recency_half_life_days)

    # Importance: normalize 1-10 to 0-1
    importance = memory.get('importance', 5) / 10.0

    # Weighted sum (each component already in [0, 1])
    w_sem, w_rec, w_imp = weights
    return w_sem * semantic + w_rec * recency + w_imp * importance


def cosine_sim(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    return dot / (norm_a * norm_b + 1e-8)
```

### 5.4 TOON for JSON compression

```python
def toon_compress_audit(audit_json: dict) -> str:
    """TOON-style compression for audit JSON.

    Drops verbose evidence, keeps structured fields, uses indentation
    to convey hierarchy without repeating keys.
    """
    lines = []
    lines.append(f"score:{audit_json.get('score', 0):.1f}")
    lines.append(f"pass:{audit_json.get('overall_pass', False)}")
    lines.append(f"blockers:{','.join(audit_json.get('blockers', []))}")

    for c in audit_json.get('criteria', []):
        if not c.get('passed'):
            lines.append(f"  {c['id']} [{c.get('severity', '?')[:3]}] {c['name']}")
            if c.get('fix_hint'):
                lines.append(f"    fix: {c['fix_hint'][:120]}")

    return "\n".join(lines)
```

### 5.5 Graduated reduction by iteration age

```python
def compress_iteration_for_replay(iteration_data: dict, age: int) -> str:
    """Compress iteration data based on how old it is.

    Age 0 (current):  full data, no compression
    Age 1:            TOON compression, full blockers
    Age 2-3:          Blockers only, no evidence
    Age 4+:           One-line summary
    """
    if age == 0:
        return json.dumps(iteration_data, indent=2)

    elif age == 1:
        return toon_compress_audit(iteration_data.get('audit', {}))

    elif age <= 3:
        blockers = iteration_data.get('audit', {}).get('blockers', [])
        return f"iter{iteration_data.get('iteration', '?')}: {len(blockers)} blockers: {','.join(blockers)}"

    else:
        score = iteration_data.get('audit', {}).get('score', 0)
        return f"iter{iteration_data.get('iteration', '?')}: score={score:.1f}"
```

---

## 6. Plan de implementación por fases

### Fase 0 (1 día) — Setup

- [ ] Crear `memory/` module dentro del skill
- [ ] Setup SQLite con schema para las 4 stores
- [ ] Setup LanceDB embedded para embeddings
- [ ] Setup función `tri_score()` reutilizable
- [ ] Tests unitarios para retrieval

### Fase 1 (2 días) — Working Memory + Episodic

**Objetivo**: que cada iteración no reenvíe todo el código anterior.

- [ ] Implementar `WorkingMemory` class con hash references para código
- [ ] Implementar `EpisodicStore` que guarda cada sesión completa como JSON
- [ ] Modificar `hero-loop.py` para usar working memory en vez de replay
- [ ] Implementar graduated reduction por age
- [ ] Medir tokens por call antes/después (target: -50% en iteración 5)

**Entrega**: hero-loop.py v4 con working memory funcional.

### Fase 2 (3 días) — Semantic Memory + Pattern Extraction

**Objetivo**: que el sistema extraiga patrones de cada sesión completada.

- [ ] Implementar `SemanticStore` con add/search/get_all
- [ ] Implementar pattern extraction function (usa LLM para extraer atomic facts)
- [ ] Hook: después de cada sesión completada, extraer patrones y guardar
- [ ] Hook: antes de cada Creator call, buscar top-5 patrones relevantes
- [ ] Inyectar patrones en el prompt del Creator como contexto adicional

**Entrega**: cross-session learning funcional. El sistema "recuerda" qué
patrones funcionaron en sesiones anteriores.

### Fase 3 (2 días) — Procedural Memory + Skill Library

**Objetivo**: extraer skills reutilizables de patrones exitosos recurrentes.

- [ ] Implementar `ProceduralStore` (Skill schema)
- [ ] Implementar `consolidation_job` que corre weekly:
  - Lee episodic store de la última semana
  - Identifica patrones recurrentes (3+ episodios con misma decisión)
  - Si el patrón tuvo éxito (>8 score), lo promueve a Skill
  - Si el patrón tuvo fallos consistentes, lo promueve a AntiPattern
- [ ] Hook: antes de cada Creator call, buscar top-3 skills relevantes
- [ ] Hook: inyectar skills como "previously validated approaches"

**Entrega**: skill library que evoluciona sola con el uso.

### Fase 4 (2 días) — Negative Knowledge + Anti-patterns

**Objetivo**: que el sistema evite errores conocidos.

- [ ] Implementar `AntiPatternStore`
- [ ] Hook: Auditor detecta fallos recurrentes → los promueve a AntiPattern
- [ ] Hook: antes de cada Creator call, buscar top-3 anti-patterns relevantes
- [ ] Inyectar como "Known pitfalls to avoid" en el Creator prompt

**Entrega**: el sistema evite errores sin tener que re-aprenderlos.

### Fase 5 (1 día) — Prompt Caching + Final Polish

- [ ] Si backend=anthropic: agregar `cache_control` breakpoint después de SKILL.md
- [ ] Medir tokens ahorrados (target: -90% en SKILL.md re-reads)
- [ ] Añadir metrics dashboard: tokens per iteration, score trajectory,
      memory size growth, retrieval latency
- [ ] Documentar memoria en SKILL.md como nueva sección
- [ ] Empaquetar skill v4

**Entrega**: skill v4 completo con memory system.

### Fase 6 (opcional, futuro) — Sleep / Consolidation avanzado

- [ ] Implementar A-MEM style memory evolution (las nuevas notas reescriben
      atributos de notas viejas relacionadas)
- [ ] Implementar Reflexion-style self-critique: el sistema reflexiona sobre
      sus propios fallos y los añade al negative knowledge
- [ ] Implementar prospective memory: "next time user asks for X, try Y"

---

## 7. Métricas de éxito

| Métrica | Baseline (v3) | Target (v4) | Cómo medir |
|---|---|---|---|
| Tokens por call en iteración 5 | ~75 KB | <30 KB | Log prompts en backend |
| Costo por sesión (GLM) | ~$4-8 | <$1 | Track API costs |
| Cross-session learning | 0 (cada sesión es 0) | Sí (top-5 patterns inyectados) | Verificar en Creator prompt |
| Skill library size | 0 | 10+ skills después de 50 sesiones | Count rows in procedural store |
| Anti-patterns detectados | 0 | 5+ después de 20 sesiones | Count rows in negative store |
| Audit score mejora iter 1→2 | +1.5 avg | +2.0 avg (con pattern injection) | Compare score deltas |
| Retrieval latency | N/A | <100ms p95 | Time search() calls |

---

## 8. Riesgos y mitigaciones

### Riesgo 1: Calidad de retrieval mala → ruido en Creator prompt
- **Síntoma**: patterns inyectados no son relevantes, Creator se confunde
- **Mitigación**: threshold de score (solo inyectar si tri_score > 0.6);
 最多 5 patterns; opción de desactivar con flag

### Riesgo 2: Skill library se llena de skills mediocres
- **Síntoma**: skills con success_count=1 pero fail_count=0 se promueven
  demasiado rápido
- **Mitigación**: requerir 3+ episodios exitosos antes de promover a skill;
  quarantine si fail_count > success_count después de 5 usos

### Riesgo 3: Episodic store crece infinitamente
- **Síntoma**: 1000 episodios = 100GB de JSON
- **Mitigación**: solo guardar código por hash (dedup across episodes);
  después de 90 días, mover episodios a cold storage (zip); solo guardar
  summary en hot storage

### Riesgo 4: Embedding API se vuelve cara
- **Síntoma**: a 1000 episodios con 100 patterns cada uno = 100K embeddings
- **Mitigación**: cache embeddings en LanceDB (no re-embed same content);
  usar BGE local si costo > $50/mes

### Riesgo 5: Consolidation job consume demasiado tiempo
- **Síntoma**: weekly job tarda horas y bloquea
- **Mitigación**: job async vía cron, no bloquea hero-loop; si tarda >30min,
  paralelizar por vertical

---

## 9. Lo que NO vamos a hacer (scope discipline)

Para evitar sobre-ingeniería, estas cosas están explícitamente fuera de scope:

- **NO usar LangGraph**: nuestro loop es simple (4 agentes, hasta 5 iteraciones),
  no necesitamos graph orchestration. El hero-loop.py actual es suficiente.
- **NO usar LangChain**: agregará 100+ MB de deps para features que no usamos.
- **NO usar Postgres**: SQLite con WAL es suficiente hasta 1000+ sesiones.
- **NO usar Neo4j/Graphiti**: A-MEM-style linked notes en SQLite bastan.
- **NO usar MemGPT/Letta**: require Postgres + pgvector + server. Demasiado
  para nuestro caso. Implementaremos el patrón (main context + archival)
  manualmente.
- **NO implementar audio reactive heroes**: fuera de scope del memory system.
- **NO usar LLMLingua**: rompe código y JSON. Hash references + TOON bastan.

---

## 10. Cómo se integra con el skill existente

El skill `hero-3d-awwwards` v3 actual tiene esta estructura:

```
skills/hero-3d-awwwards/
├── SKILL.md
├── references/
├── assets/
└── scripts/
    ├── hero-loop.py        ← orquestador
    └── prompts/
        ├── creator.md
        ├── auditor.md
        ├── corrector.md
        └── user-simulator.md
```

Después de implementar la memoria, será:

```
skills/hero-3d-awwwards/
├── SKILL.md                 ← + sección "Memory System"
├── references/
│   └── memory-architecture.md   ← nuevo (este documento, versión final)
├── assets/
└── scripts/
    ├── hero-loop.py         ← actualizado para usar memory
    ├── prompts/
    │   ├── creator.md       ← actualizado para aceptar patterns/skills context
    │   └── ...
    └── memory/              ← nuevo módulo
        ├── __init__.py
        ├── stores.py        ← WorkingMemory, EpisodicStore, SemanticStore,
        │                      ProceduralStore, AntiPatternStore
        ├── retrieval.py     ← tri_score(), search functions
        ├── compression.py   ← toon_compress_audit, graduated_reduction
        ├── consolidation.py ← weekly job que extrae patterns y skills
        ├── embeddings.py    ← wrapper de OpenAI/BGE
        └── schema.sql       ← SQLite schema
```

El archivo `hero-loop.py` se modifica para:
1. Al iniciar: cargar memory stores, buscar patterns/skills relevantes al brief
2. Antes de cada Creator call: inyectar patterns + skills + anti-patterns
   en el prompt
3. Después de cada iteración: guardar estado en working memory
4. Al finalizar la sesión: extraer episodic, semantic, procedural memories

---

## 11. Próximos pasos inmediatos

1. **Ahora**: este documento queda como referencia. Confirmar que las
   decisiones son aceptadas.
2. **Siguiente mensaje del usuario**: dar luz verde para empezar Fase 0
   (setup del memory module).
3. **Después de Fase 0**: ejecutar test del loop con memoria básica para
   validar que la integración funciona.
4. **Iterar**: implementar Fases 1-5 en orden, testear después de cada una.

**Tiempo total estimado**: 10-11 días de trabajo concentrado. Se puede
comprimir a 5-6 días si no testamos exhaustivamente entre fases.

---

## Apéndice A: Fuentes de investigación

### Reportes completos (en `/home/z/my-project/research/`)
- `01-agent-memory-systems.md` (1,318 líneas) — mem0, Letta, Zep, LangGraph,
  CrewAI, AutoGen. Benchmarks LoCoMo. Decisión: 3-tier memory.
- `02-context-compression.md` (812 líneas) — LLMLingua, LongLLMLingua,
  LLMLingua-2, Selective Context, recursive summarization, Anthropic/OpenAI
  caching, MemGPT, SWE-Pruner, TOON. Decisión: hash + TOON + cache.
- `05-advanced-memory-patterns.md` (921 líneas) — CoALA, Generative Agents,
  Voyager, Reflexion, A-MEM. Decisión: 5-tier cognitive architecture.

### Papers clave citados
- **CoALA** (Sumers et al., TMLR 2024) — framework cognitivo para LLM agents
- **Generative Agents** (Park et al., UIST 2023) — tri-score retrieval
- **Voyager** (Wang et al., 2023) — skill library con description embeddings
- **Reflexion** (Shinn et al., NeurIPS 2023) — self-reflection para memory
- **A-MEM** (Xu et al., 2024) — Zettelkasten evolving memory
- **Mem0** (arXiv 2504.19413) — extract-then-retrieve pattern
- **MemGPT** (arXiv 2310.08560) — OS-style virtual context
- **LLMLingua-2** (Pan et al., ACL Findings 2024) — data-distilled compression

### Benchmarks citados
- LoCoMo (Letta blog, Aug 2025): filesystem 74.0% > Mem0 68.5%
- Mem0 paper token reduction: 26,031 → 1,764 tokens (~93% reduction)
- LLMLingua-2: 3-6× faster than LLMLingua, 1.6-2.9× e2e speedup
- SWE-Pruner: 23-54% reduction on code, 64% vs 54% success over LLMLingua-2
- TOON: 30-61% token savings on JSON
- Anthropic caching: 90% off on cache reads, 91-95% hit rates in production

---

## Apéndice B: Schema SQL propuesto

```sql
-- Working memory (in-process, no persistence needed beyond checkpoint)

-- Episodic memory
CREATE TABLE episodes (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    brief TEXT NOT NULL,
    vertical TEXT,
    archetype TEXT,
    stack TEXT,
    final_score REAL,
    outcome TEXT,
    user_feedback TEXT,
    code_hashes TEXT,  -- JSON array of code content hashes
    iterations_json TEXT,  -- full iteration data (graduated compressed)
    embedding_id TEXT  -- reference to LanceDB
);

-- Semantic memory (atomic facts)
CREATE TABLE semantic_notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    vertical TEXT,
    category TEXT,  -- layout|typography|color|cta|copy|timing|accessibility
    importance INTEGER DEFAULT 5,  -- 1-10
    source_episodes TEXT,  -- JSON array of episode IDs
    created_at TEXT NOT NULL,
    last_accessed TEXT NOT NULL,
    valid_until TEXT,  -- NULL = always valid
    links TEXT  -- JSON array of other note IDs (A-MEM style)
);

-- Procedural memory (skills)
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    code_template TEXT NOT NULL,
    parameters TEXT,  -- JSON schema for params
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    last_used TEXT,
    source_episodes TEXT,  -- JSON array
    valid_verticals TEXT,  -- JSON array
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'active'  -- active | quarantined | deprecated
);

-- Negative knowledge (anti-patterns)
CREATE TABLE anti_patterns (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    failure_mode TEXT,  -- which criterion it fails (C7, C11, S1, etc.)
    occurrences TEXT,  -- JSON array of {episode_id, criterion_id, timestamp}
    created_at TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    status TEXT DEFAULT 'active'  -- active | resolved
);

-- Indexes
CREATE INDEX idx_episodes_vertical ON episodes(vertical);
CREATE INDEX idx_episodes_timestamp ON episodes(timestamp);
CREATE INDEX idx_semantic_vertical ON semantic_notes(vertical);
CREATE INDEX idx_semantic_importance ON semantic_notes(importance);
CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_anti_patterns_status ON anti_patterns(status);
```

LanceDB tables (separadas, file-backed):
- `episode_embeddings` (id, embedding, vertical)
- `semantic_embeddings` (id, embedding, vertical, category)
- `skill_embeddings` (id, embedding, valid_verticals)

---

**Fin del documento.** Listo para implementación.
