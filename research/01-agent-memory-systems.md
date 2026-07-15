# Agent Memory Systems: A Deep Research Report

> Research goal: pick a memory system for an autonomous agent loop
> (Creator → Auditor → User Simulator → Corrector) that iterates on hero
> section designs. We need to compress previous iterations, remember
> patterns that worked/didn't across sessions, surface relevant past
> learnings when similar heroes are requested, and avoid token bloat as
> iterations grow.
>
> Research method: every project's README, primary docs page, and (where
> available) creator blog posts and arXiv papers were fetched with a live
> web reader. Benchmark numbers are quoted from the Mem0 paper
> (arXiv:2504.19413, April 2025), the Letta benchmarking blog (Aug 2025),
> the Zep rebuttal (Dec 2025), and the project READMEs themselves. All
> GitHub stars/fork counts are as captured during this research session.

---

## TL;DR

There are three distinct *kinds* of "memory for agents" products, and they
solve different problems:

1. **Stateful-agent platforms** (Letta/MemGPT, Zep+Graphiti, Mem0). The
   memory *is* the agent. You push messages in; they manage the entire
   context window and return a prompt-injected reply.
2. **Agent-orchestration frameworks with memory primitives** (LangGraph,
   LangChain+LangMem, CrewAI). Memory is one of several primitives
   (alongside tools, agents, checkpoints) that you wire into *your* agent
   loop.
3. **Maintenance-mode / legacy frameworks** (AutoGen). Memory is just
   "message history + tool state" — no first-class abstraction. Microsoft
   has explicitly moved on to the new Microsoft Agent Framework.

For our use case (a Creator/Auditor/Corrector loop iterating on hero
sections), **the right answer is not to adopt a stateful-agent platform
wholesale**. Those platforms assume they own the conversation loop and the
context window; in our pipeline each role is its own LLM call with its own
prompt. The right answer is to borrow **Mem0's two-phase extract-then-
retrieve pattern** *and* **CrewAI's hierarchical scopes + composite
scoring** *and* **LangGraph-style checkpointing for iteration state** —
all stitched into our existing loop. Detailed recommendation in §6.

The single most useful benchmark finding is that **a Letta agent that just
stores conversation history in a plain file and searches it with
filesystem tools scores 74.0% on LoCoMo, beating Mem0's reported 68.5%
on the same benchmark** ([Letta blog, Aug 2025][letta-bench]). Memory is
more about *agent context management* than about the exact retrieval
engine. Plan accordingly: don't over-engineer the storage backend.

---

## 1. mem0 — `mem0ai/mem0`

- **Repo**: <https://github.com/mem0ai/mem0>
- **Stars**: 60.8k · **Forks**: 7.1k · **Contributors**: 385
- **Last commit**: Jul 14, 2026 · **Latest release**: 360 tags, SDK
  `mem0ai==2.0.12` (Python) / `mem0ai` (npm)
- **License**: Apache-2.0
- **Paper**: [Mem0: Building Production-Ready AI Agents with Scalable
  Long-Term Memory, arXiv:2504.19413][mem0-paper]

### Architecture

Mem0 sits **between your application and your model**. You send
conversation turns to `add()`, and call `search()` before each model
request. Your app decides which returned memories to include in the
prompt. Internally there are two phases:

```
                ┌─────────────── EXTRACTION (write) ──────────────┐
  new msg pair  │  (1) Context lookup: fetch conversation summary  │
  (m_{t-1},m_t)─┼─▶ (2) LLM extracts salient facts Ω={ω1..ωn}      │
                │  (3) For each ωi: retrieve top-s=10 similar      │
                │     existing memories from the vector store      │
                │  (4) LLM "tool call" decides: ADD | UPDATE |     │
                │     DELETE | NOOP  (since Apr 2026: ADD-only)    │
                │  (5) Dedup + embed + entity-link                 │
                └──────────────────────────────────────────────────┘
                                ▼
   ┌──── Stores ────────────────────────────────────────────────────┐
   │ SQL DB     │ facts + metadata (source of truth)                │
   │ Vector DB  │ embeddings (semantic search)                      │
   │ Graph DB   │ entities + relationships (only if graph enabled)  │
   └────────────────────────────────────────────────────────────────┘
                                ▲
                ┌─────────────── RETRIEVAL (read) ─────────────────┐
   query ───────┤  Multi-signal fusion:                            │
                │   • Semantic (vector similarity)                 │
                │   • Keyword  (BM25)                              │
                │   • Entity   (graph-traversal boost)             │
                │   • Temporal (time-aware ranking)                │
                │  Scoped by user_id / agent_id / run_id filters   │
                └──────────────────────────────────────────────────┘
```

(Source: [How Mem0 Works][mem0-how] + [arXiv:2504.19413 §2.1-2.2][mem0-paper].)

The **April 2026 algorithm rewrite** ("New Memory Algorithm") replaced
the LLM-driven ADD/UPDATE/DELETE/NOOP decision with a **single-pass
ADD-only extraction** — one LLM call per message pair, no UPDATE/DELETE.
Memories accumulate; nothing is overwritten. Entity linking, multi-signal
retrieval (semantic + BM25 + entity), and temporal reasoning were added.
Existing memories still get consolidated through deduplication at
retrieval time.

### Storage backend

| Component | Default | OSS swappable |
|---|---|---|
| SQL store | SQLite (lib) / Postgres (server) | any SQLAlchemy backend |
| Vector store | Qdrant (recommended) | Chroma, PGVector, Weaviate, Milvus, Pinecone, VertexAI, Azure AI Search |
| Graph store | optional Neo4j (Mem0g variant) | — |
| LLM | `gpt-5-mini` (default, post-2026 rewrite; `gpt-4o-mini` in the paper) | any LiteLLM provider |
| Embeddings | `text-embedding-3-small` | Qwen-600M recommended for hybrid BM25 |

### Compression strategy

Mem0 *is* the compression. Each conversation turn is converted into a
small set of atomic facts (~1 sentence each). The Mem0 paper reports
that the average memory store for one LOCOMO conversation is **1,764
tokens** vs **26,031 tokens** for the raw transcript — a ~93% reduction.
The Mem0g (graph) variant doubles that to ~3,616 tokens because node +
edge metadata is stored alongside each fact. (Mem0 claims Zep's graph
store, by contrast, takes ~600k tokens for the same conversation, due
to abstractive summaries cached at every node — see §3.)

### Retrieval mechanism

Multi-signal fusion, ranked in parallel:

- **Semantic** — vector cosine similarity over fact embeddings.
- **Keyword** — BM25 term matching for names, IDs, exact phrases.
- **Entity** — boosts memories linked to entities named in the query.
- **Temporal** — re-ranks by `created_at`/`valid_until` metadata when
  the query implies a time dimension ("when did…", "currently", etc.).

The fused retrieval is **single-pass**: one call, no agentic loops, top-200
retrieval budget.

### API surface (Python OSS, post-v2.0.12)

```python
from mem0 import Memory
m = Memory()                         # uses .mem0/ defaults

m.add(messages, user_id="alice", agent_id="hero-designer",
      run_id="hero-iter-3", metadata={"project": "saas-landing"})

hits = m.search(
    "what hero patterns worked for SaaS landing pages",
    filters={"user_id": "alice", "agent_id": "hero-designer"},
    top_k=5,
)

m.update(memory_id="<id>", text="revised fact")    # explicit correction
m.delete(memory_id="<id>")                         # explicit removal
m.get_all(user_id="alice", limit=100)              # bulk list
m.history(memory_id="<id>")                        # audit trail
```

### Self-hosting complexity

- **Library mode** (testing): `pip install mem0ai` — uses SQLite + Qdrant
  embedded. Zero infra.
- **Self-hosted server**: `cd server && make bootstrap` — Docker Compose
  stack (Qdrant + Postgres + Mem0 server + dashboard on :3000). Self-hosted
  auth is now on by default; you either run the admin wizard or set
  `AUTH_DISABLED=true` for dev.
- **Cloud platform**: `app.mem0.ai` — fully managed, includes proprietary
  optimizations not in OSS.

### Production readiness & license

Apache-2.0 — fully commercial-friendly. 60.8k stars, 385 contributors,
daily commits, used in production by CrewAI, LangGraph, Vercel AI SDK
users (mem0 has explicit integration packages for each). The Mem0
engineering team is the same one behind DSPy (Taranjeet Singh, Deshraj
Yadav) — strong research engineering pedigree.

### Limitations

- **The April 2026 rewrite removed UPDATE/DELETE in the OSS extraction
  pipeline**. Memories now accumulate forever unless the developer
  explicitly calls `update()`/`delete()`. For long-running agents this
  means the vector store grows monotonically.
- The "SOTA" claims in the README (92.5 LoCoMo, 94.4 LongMemEval) are
  **Platform numbers** — the README explicitly states "open-source users
  should expect directionally similar gains but not identical numbers."
- The Mem0 paper's claim of beating Zep on LoCoMo was [contested by
  Zep][zep-rebuttal], who showed a corrected Zep implementation scores
  **75.14% J** vs Mem0's 68.44% (Mem0g). LoCoMo itself is a weak
  benchmark (conversations fit in modern context windows; full-context
  baseline beats Mem0).
- Default LLM is now `gpt-5-mini` (post-rewrite) — your extraction
  quality is bound to whatever model you point it at.

---

## 2. Letta (formerly MemGPT) — `letta-ai/letta`

- **Repo**: <https://github.com/letta-ai/letta>
- **Stars**: 23.8k · **Forks**: 2.5k · **Contributors**: 157
- **Last commit**: Jul 3, 2026 · **Latest release**: v0.16.8 (May 14, 2026)
- **License**: Apache-2.0
- **Paper**: [MemGPT: Towards LLMs as Operating Systems,
  arXiv:2310.08560][memgpt-paper] (Packer et al., Oct 2023, rev. Feb 2024)

> Note: the `letta-ai/letta` repo is now the **legacy Letta server**.
> Active development has moved to the "Letta Agent" repo (CLI +
> TypeScript SDK + App Server). The V1 Python SDK is still available as
> `letta-client`. For new projects use `@letta-ai/letta-agent-sdk` and
> the `letta-code` CLI (`npm install -g @letta-ai/letta-code`, requires
> Node 22.19+).

### Architecture — the MemGPT memory hierarchy

MemGPT's central insight: treat the LLM context window like RAM and use
OS-style virtual memory paging to swap content in/out of "disk".

```
┌────────────────────────── MAIN CONTEXT (in-context, = LLM context window) ──────────────────────────┐
│                                                                                                       │
│  ┌── System instructions ─────────────────────────────────────────────────────────────────────────┐  │
│  │   persona sub-block (editable)        ──┐                                                      │  │
│  │   human   sub-block (editable)         ├─ "core memory" / working context (fixed size)         │  │
│  │   task    sub-block (editable)        ──┘                                                      │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌── Recursive summary of evicted messages (kept at front of queue) ──────────────────────────────┐  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌── Conversation history (FIFO queue of recent user/assistant/tool messages) ────────────────────┐  │
│  │  [user]  ...                                                                                    │  │
│  │  [asst]  ...                                                                                    │  │
│  │  [tool]  ...  ← evicted oldest first when main context fills                                   │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                  ▲  ▲
                  paging in (search) ─────────────┘  └───────────── paging out (insert/evict)
                                                  ▼  ▼
┌──────────────────────────────── EXTERNAL CONTEXT (out-of-context, DB-backed) ────────────────────────┐
│  Recall storage    Full conversation history (every message + tool call + return).                   │
│                    Searchable by timestamp, text (case-insensitive), embedding.                      │
│  Archival storage  Infinite-size vector DB. Agent writes reflections/insights via tools.             │
│                    Retrieved with `archival_memory_search(query, page, start)` (semantic).           │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

(Sources: [MemGPT paper §3][memgpt-paper], [Letta Memory Blocks blog][letta-blocks],
[Letta Agent Memory blog][letta-agent-memory], [Leonie Monigatti deep
dive][leonie].)

The agent autonomously manages its own memory through five tools the
runtime exposes to the LLM:

| Tool | Purpose |
|---|---|
| `core_memory_append(label, content)` | Add to the persona / human / task block |
| `core_memory_replace(label, old, new)` | Edit a specific string inside a block |
| `archival_memory_insert(content)` | Page something OUT to archival (vector DB) |
| `archival_memory_search(query, page, start)` | Page something IN from archival |
| `conversation_search(query, page)` | Search full recall storage by text |
| `send_message(message)` | The ONLY tool that actually notifies the user |

A **heartbeat** mechanism lets the LLM chain tool calls before yielding
control back to the user (`request_heartbeat: true` on every tool call).
This is what makes "self-editing memory" possible without a separate
orchestrator.

In the post-MemGPT **Letta Agent SDK**, memory blocks are first-class
objects: each has a `label`, `value` (string), `limit` (chars or tokens),
`description`. Blocks are individually persisted in Postgres with a
`block_id`, can be **shared across multiple agents** (multi-agent shared
memory), and can be edited directly via the API or by another agent
(sleep-time compute pattern).

### Storage backend

Postgres + **pgvector** (official `pgvector/pgvector` Docker image since
Feb 2026). Self-hosted global context window default raised to 32k tokens
in Mar 2026. The legacy Docker server still ships with `compose.yaml`.

### Compression strategy

- **FIFO eviction** of conversation history from main context, with
  **recursive summarization** — evicted messages are summarized along
  with the existing summary; older messages contribute progressively
  less to the running summary.
- **Core memory blocks have a hard character/token limit** per block.
  When the agent edits a block, it must self-trim. This enforces a
  bounded working set.
- **Archival memory** is the unlimited-size escape valve: anything that
  doesn't fit in core memory gets `archival_memory_insert`-ed and is
  later retrieved on demand.

### Retrieval mechanism

- **Recall memory**: text search (`conversation_search`, case-insensitive
  substring match) and timestamp search. No vector search on recall by
  default in OSS.
- **Archival memory**: pure vector similarity search
  (`archival_memory_search`).
- **Core memory**: no search needed — always in context.

### API surface (V1 SDK, still supported)

```python
from letta_client import Letta

client = Letta(base_url="http://localhost:8283")

agent = client.agents.create(
    name="hero-creator",
    memory_blocks=[
        {"label": "human",   "value": "User is a designer at ACME", "limit": 5000},
        {"label": "persona", "value": "You are a senior UX hero designer", "limit": 5000},
        {"label": "task",    "value": "", "limit": 2000},  # scratchpad
    ],
    model="anthropic/claude-sonnet-4",
)

# Agent self-edits memory via tools during conversation
client.agents.messages.create(
    agent_id=agent.id,
    messages=[{"role": "user", "content": "Build me a SaaS hero"}],
)
```

New Letta Agent SDK (TypeScript):

```typescript
import { LettaAgentClient } from "@letta-ai/letta-agent-sdk";

const client = new LettaAgentClient({ backend: "local" }); // or "cloud"
const agentId = await client.createAgent({
    model: "anthropic/claude-opus-4-8",
    human: "Name: …",
    persona: "I am a self-improving designer…",
});
await using session = client.resumeSession(agentId);
await session.send("Build me a SaaS hero");
for await (const m of session.stream()) {
    if (m.type === "assistant") console.log(m.content);
}
```

### Self-hosting complexity

Moderate. Requires Postgres with pgvector. The Docker Compose stack
spins up the server + DB + sandbox. The new App Server architecture
replaces the legacy Docker server. ADB (Agent Development Environment)
gives you a web UI to inspect memory blocks per agent.

### Production readiness & license

Apache-2.0. Founded by Charles Packer and Sarah Wooders (UC Berkeley
RISELab / Sky Computing). Well-funded, fast-moving. 23.8k stars, 157
contributors. Has a hosted cloud (Constellation). Used by 11x (deep
research agent), and many others. Letta's OSS terminal-use agent is
reportedly #1 OSS on Terminal-Bench.

### Limitations

- The Letta server is now in **legacy / maintenance** for self-hosting;
  new dev is on the closed-source Letta Agent repo and the App Server.
- The MemGPT design assumes the agent *owns* the conversation loop — it's
  hard to use Letta as a "memory service" behind your own agent loop.
- Benchmarks on LoCoMo are awkward: Letta has no native way to ingest
  LoCoMo's pre-baked conversations, so the Mem0 paper's reported MemGPT
  numbers were contested. Letta's own benchmark showed a simple
  **filesystem-based** agent scores 74.0% — better than Mem0's 68.5% —
  suggesting OS-style memory management may matter more than the
  retrieval engine.
- No first-class episodic vs semantic distinction — all archival memory
  is one flat vector store.

---

## 3. Zep — `getzep/zep` + `getzep/graphiti`

- **Repos**:
  - <https://github.com/getzep/zep> — examples/integrations only.
    Stars: 4.8k · Forks: 640 · Contributors: 23
  - <https://github.com/getzep/graphiti> — the actual open-source engine
- **Last commit**: Jul 10, 2026 · **License**: Apache-2.0
- **Paper**: [Zep: A Temporal Knowledge Graph Architecture for Agent
  Memory][zep-paper]

> ⚠️ **The `getzep/zep` repo is no longer the product.** Zep Community
> Edition is **deprecated and unsupported**; code moved to `legacy/`.
> The open-source engine that powers Zep is now **Graphiti**. The
> production product is **Zep Cloud** (managed). SDKs: `pip install
> zep-cloud` (Python), `npm install @getzep/zep-cloud` (TS), `go get
> github.com/getzep/zep-go/v3` (Go).

### Architecture — Temporal Context Graphs

Graphiti stores memory as a **bi-temporal knowledge graph**. Unlike
static knowledge graphs (or GraphRAG), every fact has a *validity
window* — when it became true and when (if ever) it was superseded.

```
   Episode 1 (raw msg)        Episode 2 (raw msg)        Episode 3 (raw msg)
   "Alice likes Adidas"       "Alice now likes Nike"     "Alice bought Nikes"
        │                            │                            │
        ▼                            ▼                            ▼
   ┌──────── Entity node: Alice ────────────────────────────────────────┐
   │  summary (evolves): "Loves Nike (since Mar 2026); used to like     │
   │                       Adidas (until Feb 2026)"                     │
   │  embedding: <vec>   created_at: t1   type: Person                 │
   └────────────────────────────────────────────────────────────────────┘
        │                                                              │
        │  edge: likes ──[valid: t1..t2]──▶ Adidas  (superseded)        │
        │  edge: likes ──[valid: t2..now]─▶ Nike    (current)           │
        │  edge: bought ─[valid: t3..now]─▶ Nike    (current)           │
```

Each fact (edge) is **invalidated, not deleted**, when superseded. You
can query "what was true at time T" or "what's true now" with equal
precision.

Components of a context graph (from the Graphiti README):

| Component | What it stores |
|---|---|
| Entities (nodes) | People, products, policies, concepts — with summaries that evolve over time |
| Facts / Relationships (edges) | Triplets (Entity → Relationship → Entity) with temporal validity windows |
| Episodes (provenance) | Raw data as ingested — every derived fact traces back here |
| Custom Types (ontology) | Developer-defined entity and edge types via Pydantic models (prescribed) or auto-extracted (learned) |

### Storage backend

| Component | Default |
|---|---|
| Graph DB | Neo4j 5.26 (recommended) / FalkorDB 1.1.2 (Docker: `falkordb/falkordb:latest`) / Amazon Neptune / Kuzu (deprecated) |
| Full-text search | Neo4j's built-in / FalkorDB's RediSearch / Amazon OpenSearch Serverless |
| LLM | OpenAI (default — *requires Structured Output support*, so OpenAI/Anthropic/Gemini only) |
| Embeddings | OpenAI text-embedding-3-small (default) |

**Important**: Graphiti's docs warn that "other LLM providers — both
hosted OpenAI-compatible APIs (DeepSeek, Together, OpenRouter, …) and
local servers (Ollama, vLLM, llama.cpp, LM Studio) — may be used via
their OpenAI-compatible endpoints" but small models will produce
malformed JSON and break ingestion.

### Compression strategy

There is **no summarization-based compression** like Mem0's. Instead,
each fact is stored verbatim with provenance, and *invalidated* (not
deleted) when superseded. The Mem0 paper measured Zep's graph at ~600k
tokens per LoCoMo conversation — far larger than Mem0's ~7k or even the
26k raw transcript. Zep caches an abstractive summary at every node and
on every edge. The trade-off is **temporal precision** (you can answer
"was X true on date Y") at the cost of storage.

### Retrieval mechanism

Hybrid retrieval, fused in parallel:

- **Semantic**: vector similarity over entity/edge embeddings.
- **Keyword**: BM25 over edge/fact text.
- **Graph traversal**: BFS from anchor entities found in the query.

Sub-second latency in production; the Zep rebuttal claims p95 search
latency of **0.632s** for correctly-concurrent searches.

### API surface (Graphiti OSS)

```python
from graphiti_core import Graphiti
from graphiti_core.nodes import EntityNode

graphiti = Graphiti(neo4j_uri, neo4j_user, neo4j_pw)

# Ingest an "episode" (raw text or structured JSON)
await graphiti.add_episode(
    name="hero-iter-3-audit",
    episode_body='{"hero": "saas-v1", "issues": ["CTA below fold", "weak headline"]}',
    source_description="Auditor output for iteration 3",
    reference_time=datetime.utcnow(),
)

# Hybrid search across the graph
results = await graphiti.search("what hero patterns had weak CTAs?")
```

The MCP server (`mcp/zep-mcp-server`) exposes the same to Claude,
Cursor, and other MCP clients.

### Self-hosting complexity

Heaviest of the bunch. Requires Neo4j (or FalkorDB), an LLM API key,
and Python 3.10+. Concurrency is throttled by `SEMAPHORE_LIMIT=10` to
avoid LLM provider 429s — you'll likely want to bump this in production.
The ingestion pipeline is multi-stage and **asynchronous**: per the
Mem0 paper, "immediate memory retrieval attempts often failed to answer
queries correctly. Re-running identical searches after a delay of
several hours yielded considerably better results." Graphiti's
benchmarks show graph construction completes in well under a minute in
worst case, but the *quality* of retrieval improves over time as the
background entity-resolution passes finish.

### Production readiness & license

Apache-2.0 on both repos. Zep raised a $24M round (Oct 2025). The
Graphiti team is hiring actively. Companies using Zep/Graphiti in
production are listed in Zep's case studies (LiveKit integration, etc.).
The 4.8k-star getzep/zep repo is misleadingly small because the actual
product moved out of it; the Graphiti repo is where the active OSS lives.

### Limitations

- **Token-heavy**: 600k-token graphs are real. Mem0's critique on this
  point is fair.
- **Async ingestion latency**: not great for write-then-read-immediately
  patterns. The Mem0 paper explicitly calls this out as a real-time
  blocker.
- **Structured-output LLM requirement**: small / open-source models
  break ingestion.
- **Neo4j is the operational tax**: a stateful graph DB is a much bigger
  operational commitment than a vector store.
- The 4.8k-star getzep/zep repo is **deprecated examples only** — anyone
  reading star counts will underestimate the project.

---

## 4. LangChain Memory modules + LangMem

- **LangChain repo**: <https://github.com/langchain-ai/langchain>
- **LangMem repo**: <https://github.com/langchain-ai/langmem>
  - 1.6k stars · 176 forks · 17 contributors · MIT
- **Conceptual guide**: <https://www.langchain.com/blog/memory-for-agents>

### What changed (and what got deprecated)

The classic `ConversationBufferMemory`, `ConversationSummaryMemory`,
`ConversationSummaryBufferMemory`, `VectorStoreRetrieverMemory`,
`ConversationKGMemory`, `EntityMemory` classes — the ones you'll find in
older tutorials — are **deprecated in current LangChain**. They assumed a
`ConversationChain`-style synchronous call pattern that doesn't match
modern agent loops. The replacement is:

1. **Short-term memory** = LangGraph checkpointer + `@before_model`
   middleware that **trims** or **summarizes** the message history.
2. **Long-term memory** = LangGraph **Store** (namespace + key + JSON
   value + optional vector index) + LangMem's `create_manage_memory_tool`
   / `create_search_memory_tool` for hot-path or background updates.

LangChain's own blog ([Memory for agents][lc-memory-blog]) maps these to
the **CoALA framework**'s three long-term memory types:

| Type | Human analogue | Agent implementation |
|---|---|---|
| **Procedural** | "How to ride a bike" | LLM weights + agent code (rarely updated; closest practical example is letting the agent rewrite its own system prompt) |
| **Semantic** | "Facts learned in school" | LLM-extracted facts stored in a vector store, injected into the system prompt at recall time. **Most common pattern.** |
| **Episodic** | "Recalling a specific event" | Sequences of past agent actions; implemented as few-shot examples (dynamic few-shot prompting via LangSmith) |

LangChain does **not** ship a "working memory" type — that's just the
LLM's context window itself.

### Architecture (modern LangChain agent)

```python
from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.memory import InMemoryStore
from langmem import create_manage_memory_tool, create_search_memory_tool

checkpointer = PostgresSaver.from_conn_string(DB_URI); checkpointer.setup()
store = InMemoryStore(index={"dims": 1536, "embed": "openai:text-embedding-3-small"})

agent = create_agent(
    model="anthropic:claude-sonnet-4",
    tools=[
        create_manage_memory_tool(namespace=("hero-patterns",)),
        create_search_memory_tool(namespace=("hero-patterns",)),
    ],
    middleware=[SummarizationMiddleware(max_tokens=8000)],
    checkpointer=checkpointer,
    store=store,
)
```

- `checkpointer` saves a snapshot of the graph state after each step →
  short-term memory, scoped to `thread_id`.
- `store` holds cross-thread JSON docs organized by namespace + key →
  long-term memory.
- `SummarizationMiddleware` (built-in) summarizes older messages when
  the buffer exceeds `max_tokens`.
- `create_manage_memory_tool` and `create_search_memory_tool` give the
  agent explicit tools to write/read the store "in the hot path"
  (LangMem also supports a "background" memory manager that runs after
  the conversation).

### Storage backend

- Checkpointer: `InMemorySaver` (dev), `SqliteSaver` (local file),
  `PostgresSaver`/`AsyncPostgresSaver` (production).
- Store: `InMemoryStore`, `PostgresStore`, `AsyncPostgresStore`. Stores
  support an optional vector index for semantic search via
  `IndexConfig(embed=…, dims=…)`.

### Compression strategy

- **Trim**: `@before_model` middleware that calls LangChain's
  `trim_messages` utility to keep the last N tokens of history. Lossy
  but cheap.
- **Summarize**: `SummarizationMiddleware` runs the message history
  through a chat model, replaces older messages with a summary.
- **Manual**: you can write your own `@before_model` or `@after_model`
  middleware that does whatever you want (delete old tool calls, fold
  repeats, etc.).

### Retrieval mechanism

- **Short-term**: read directly from the checkpointed state on the next
  `agent.invoke({…}, {"configurable": {"thread_id": …}})`.
- **Long-term**: `store.search(namespace, filter=…, query=…)` — vector
  similarity search within a namespace, with content-equality filters.

### API surface

```python
store.put(namespace=("user", "alice", "hero-patterns"),
          key="saas-cta-above-fold",
          value={"pattern": "CTA above the fold",
                 "category": "layout",
                 "importance": 0.8})

item = store.get(("user", "alice", "hero-patterns"), "saas-cta-above-fold")

hits = store.search(("user", "alice", "hero-patterns"),
                    filter={"category": "layout"},
                    query="where should the CTA go")
```

### Production readiness & license

MIT on both LangChain and LangMem. Massive ecosystem — LangGraph alone
is used by 41.6k+ projects. LangMem is newer and smaller (1.6k stars).
But: **the Mem0 paper measured LangMem at 17.99s p50 / 59.82s p95
search latency on LoCoMo**, calling it "impractical for interactive
applications." Whatever the default LangMem configuration was at paper
time, validate it before trusting it in a hot loop.

### Limitations

- The legacy `Conversation*Memory` classes are everywhere in tutorials
  but **deprecated** — confusing for new users.
- LangMem's default configuration appears to be very slow on standard
  benchmarks. You'll likely have to tune it.
- No built-in consolidation/dedup — you write that yourself on top of
  the store.

---

## 5. LangGraph checkpointers — `langchain-ai/langgraph`

- **Repo**: <https://github.com/langchain-ai/langgraph>
- **Stars**: 37.3k · **Forks**: 6.3k · **Contributors**: 296
- **Last commit**: Jul 14, 2026 · **Latest release**: `langgraph==1.2.9`
  (Jul 10, 2026) — 553 releases total
- **License**: MIT
- **Used by**: 41.6k+ projects

### Architecture

LangGraph provides **two complementary persistence systems**, both
pluggable when you compile a graph:

| System | Persists | Scope | Memory type |
|---|---|---|---|
| **Checkpointer** | Graph state snapshots after each step | Single `thread_id` | Short-term, thread-scoped |
| **Store** | Application-defined key-value JSON docs | Across threads | Long-term, cross-thread |

```
   builder.compile(checkpointer=checkpointer, store=store)
                          │
            ┌─────────────┴─────────────┐
            ▼                            ▼
   ┌── Checkpointer ─────────┐  ┌── Store ─────────────────────────┐
   │ Persists graph state    │  │ Persists app-defined data        │
   │ Snapshot per step       │  │ Namespace + key → JSON value     │
   │ Pass thread_id in config│  │ Read/write from nodes or app code│
   │ Use for: continuity,    │  │ Use for: user prefs, facts,      │
   │   HITL, time travel,    │  │   shared knowledge across threads│
   │   fault tolerance       │  │ Optional vector index for search │
   └─────────────────────────┘  └──────────────────────────────────┘
```

### Storage backends

- Checkpointer: `InMemorySaver` (RAM, lost on restart), `SqliteSaver`
  (local file, dev), `PostgresSaver`/`AsyncPostgresSaver` (production
  with async).
- Store: `InMemoryStore`, `PostgresStore`, `AsyncPostgresStore`.

### Compression strategy

LangGraph itself **does not compress** — checkpoints accumulate
unboundedly. The docs explicitly warn: *"Over long conversations,
checkpoints accumulate. This can increase latency and storage costs. Fix:
Prune old checkpoints periodically or set a retention policy."*
Compression is the application's responsibility (and is typically done
via the LangChain `SummarizationMiddleware` middleware above the
graph).

### Retrieval mechanism

- **Checkpointer**: read by `thread_id`. Time-travel supported: you can
  fetch the state at any past step.
- **Store**: `get(namespace, key)`, `search(namespace, filter, query)`,
  vector similarity search if `IndexConfig` was provided.

### API surface

```python
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.memory import InMemoryStore
from langgraph.store.base import IndexConfig

checkpointer = InMemorySaver()
store = InMemoryStore(index=IndexConfig(
    embed=embed_fn, dims=1536,
))

graph = builder.compile(checkpointer=checkpointer, store=store)

result = graph.invoke(
    {"messages": [{"role": "user", "content": "Hi, I'm Bob"}]},
    {"configurable": {"thread_id": "thread-1"}},
)
```

### Self-hosting complexity

Lowest of any persistent option here. `pip install -U langgraph` and
you're done. For production, point at a Postgres instance.

### Production readiness & license

MIT. Built by LangChain Inc, used by Klarna, Replit, Elastic, and 41k+
others. 296 contributors, daily commits. **The most production-deployed
memory primitive in this entire survey.**

### Limitations

- No built-in summarization, dedup, or consolidation — you build that.
- Checkpointer state grows unboundedly without a retention policy.
- `thread_id` is stored in a Postgres column with limited length — keep
  under 255 chars.
- Subgraph checkpoint namespaces are isolated from parent graphs (state
  changes in a subgraph don't bubble up automatically).

---

## 6. CrewAI memory — `crewAIInc/crewAI`

- **Repo**: <https://github.com/crewAIInc/crewAI>
- **Stars**: 55.5k · **Forks**: 7.8k · **Contributors**: many
- **Last commit**: Jul 14, 2026 (very active)
- **License**: MIT

### Architecture — unified `Memory` class

In older CrewAI versions there were four separate memory types:
`ShortTermMemory`, `LongTermMemory`, `EntityMemory`, and external
memory. **These have been replaced by a single unified `Memory` class**
that uses an LLM to analyze content on save (inferring scope,
categories, and importance) and supports adaptive-depth recall with
composite scoring.

```
                      remember(content, scope?, categories?, importance?, source?)
                                          │
                                          ▼
                          ┌───── Encoding pipeline ─────┐
                          │  1. LLM analyzes content    │
                          │     → scope (if omitted)    │
                          │     → categories            │
                          │     → importance (0-1)      │
                          │     → metadata              │
                          │  2. Embed                   │
                          │  3. Consolidation check:    │
                          │     if sim > 0.85 → LLM     │
                          │     decides keep/update/    │
                          │     delete/insert_new       │
                          │  4. Intra-batch dedup:      │
                          │     cosine ≥ 0.98 → drop    │
                          │     (no LLM call)           │
                          └─────────────────────────────┘
                                          │
                                          ▼
                          ┌─── LanceDB (default) ───────┐
                          │  ./  .crewai/memory/        │
                          │  Records: {content, scope,  │
                          │    categories, importance,  │
                          │    embedding, created_at,   │
                          │    source, private}         │
                          └─────────────────────────────┘
                                          ▲
                                          │
                       recall(query, limit=?)   (drains pending writes first)
                                          │
                                          ▼
                          ┌── Composite scoring ──────────────────┐
                          │  composite =                          │
                          │    semantic_weight  * similarity      │
                          │  + recency_weight   * decay           │
                          │  + importance_weight * importance     │
                          │                                       │
                          │  Default weights:                     │
                          │    semantic=0.5, recency=0.3,         │
                          │    importance=0.2                     │
                          │  Decay: 0.5^(age_days / 30)           │
                          └───────────────────────────────────────┘
```

### Hierarchical scopes

Memories are organized like a filesystem: `/`, `/project/alpha`,
`/agent/researcher/findings`, etc. When you `remember()` without a
scope, the LLM looks at the existing scope tree and picks the best
placement (or creates a new scope). `memory.tree()` prints the live
hierarchy. `memory.scope("/agent/researcher")` gives a sub-Memory
view. `memory.slice(scopes=[…], read_only=True)` gives a read-only
view across multiple scopes — the common pattern for giving one agent
read access to multiple knowledge branches without write access.

### Storage backend

- Default: **LanceDB** at `./.crewai/memory` (or
  `$CREWAI_STORAGE_DIR/memory`). No external services required.
- Custom: implement the `StorageBackend` protocol
  (`crewai.memory.storage.backend`) and pass an instance to
  `Memory(storage=your_backend)`.
- Default embeddings: **OpenAI `text-embedding-3-large`** (3072-dim).
  Many providers supported (OpenAI, Ollama `mxbai-embed-large`, Azure,
  Google AI/Vertex `gemini-embedding-001`, Cohere, VoyageAI, AWS
  Bedrock, HuggingFace, Jina, IBM WatsonX, Sentence Transformer, or a
  custom callable).
- Default LLM for analysis: `gpt-4o-mini`.

### Compression strategy

- **Atomic extraction**: `extract_memories(raw_text)` breaks raw text
  into discrete atomic facts *before* storing — agents call this on
  task output so they don't store one giant blob.
- **Consolidation**: on save, similarity > 0.85 triggers an LLM call
  that decides `keep | update | delete | insert_new` against the
  nearest 5 existing records.
- **Intra-batch dedup**: within a `remember_many()` batch, cosine
  similarity ≥ 0.98 silently drops near-duplicates with no LLM call.

### Retrieval mechanism

Adaptive-depth recall:

- If `confidence_threshold_high` (0.8) is hit by top match → return
  directly.
- If `confidence_threshold_low` (0.5) isn't hit → deeper exploration
  with LLM-driven query rewriting (up to `exploration_budget=1` extra
  rounds).
- Queries shorter than `query_analysis_threshold=200` chars skip LLM
  analysis during deep recall.
- Every `MemoryMatch` includes a `match_reasons` list (`["semantic",
  "recency", "importance"]`) so you can see why each result ranked
  where it did.

### API surface

```python
from crewai import Memory, Crew, Agent, Task, Process

# Standalone
memory = Memory(recency_weight=0.5, recency_half_life_days=7)
memory.remember("CTA above the fold converts 30% better on SaaS heroes",
                scope="/hero-patterns/saas/layout",
                categories=["layout", "cta"],
                importance=0.85,
                source="audit:iter-3")

# Recall — composite scored
hits = memory.recall("where should the CTA go on a SaaS hero?", limit=5)
for m in hits:
    print(f"[{m.score:.2f}] {m.record.content}  reasons={m.match_reasons}")

# Inspect / forget
print(memory.tree())
memory.forget(scope="/hero-patterns/old-experiments")

# Wire into a crew
crew = Crew(
    agents=[creator, auditor, corrector],
    tasks=[create_task, audit_task, correct_task],
    process=Process.sequential,
    memory=memory,    # or memory=True for defaults
)
# After each task: crew auto-extracts facts and stores them.
# Before each task: agent auto-recalls relevant context into the task prompt.
```

### Production readiness & license

MIT. 55.5k stars, very active. Default LanceDB storage means **zero
infra** for prototyping. Drop-in compatible with most major embedding
providers. The composite-scoring + adaptive-depth recall is the most
sophisticated default behavior of any framework in this survey.

### Limitations

- The unified Memory class is **new** — older CrewAI docs and tutorials
  still describe the old short/long/entity split.
- No graph store option — purely vector + composite scoring. You can't
  model entity *relationships* explicitly.
- LLM analysis on every save adds latency and cost; mitigated by
  non-blocking `remember_many()` (saves happen in a background thread).
- The composite-scoring weights are global per `Memory` instance — no
  per-namespace tuning without instantiating multiple Memory objects.

---

## 7. AutoGen memory patterns — `microsoft/autogen`

- **Repo**: <https://github.com/microsoft/autogen>
- **Stars**: 59.7k · **Forks**: 9k
- **License**: MIT (code) + CC-BY-4.0 (docs)
- **Status**: ⚠️ **MAINTENANCE MODE**

### Why this is the shortest section

AutoGen is now in maintenance mode. The README is explicit:

> "While AutoGen is now in maintenance mode, existing users can continue
> to use the framework with the architecture described below. For new
> projects, we recommend Microsoft Agent Framework, which builds on the
> lessons learned from AutoGen with enterprise-grade support."

AutoGen has **no first-class memory abstraction**. Memory in AutoGen is
just message history plus whatever state your tools persist. The
layered design (Core API / AgentChat API / Extensions API) provides
message passing, event-driven agents, and a runtime — but if you want
"long-term memory" you wire it in yourself, typically by saving
`ChatAgent`'s `chat_history` and re-loading it, or by using a tool
that wraps an external store.

AutoGen Studio (no-code GUI) and AutoGen Bench (eval suite) ship
alongside the framework. Magentic-One is their state-of-the-art
multi-agent example.

### What to take from it

- **Maintenance-mode signal** — don't start new projects on AutoGen.
  Migrate to Microsoft Agent Framework if you're already on it.
- The implicit lesson: **memory without an explicit abstraction rots
  fast**. Every team that built "remember stuff" on top of AutoGen
  rolled their own and got something subtly different.

---

## 8. Cross-cutting patterns

After reading all seven projects, the same five patterns show up over
and over:

### 8.1 Two-phase write pipeline (extract → consolidate)

Mem0, CrewAI, and Zep/Graphiti all do this. On write:

1. **Extract** atomic facts / entities from raw input via an LLM call.
2. **Consolidate** against existing similar memories — either via an
   explicit LLM "tool call" decision (Mem0 ADD/UPDATE/DELETE/NOOP,
   CrewAI keep/update/delete/insert_new) or via vector-similarity
   thresholds (CrewAI 0.85 for LLM consolidation, 0.98 for silent
   dedup).

The advantage: bounded store size. The disadvantage: every write costs
at least one extra LLM call.

### 8.2 Multi-signal retrieval fusion

Almost everyone now fuses multiple retrieval signals in parallel:

- **Semantic** (vector cosine) — conceptual questions
- **Keyword / BM25** — exact names, IDs, factual lookups
- **Entity / graph traversal** (Mem0g, Graphiti, CrewAI scopes) —
  relationship-aware retrieval
- **Temporal** (Mem0, Graphiti, CrewAI recency decay) — time-aware
  ranking

Single-signal vector search alone is now considered insufficient.

### 8.3 Hierarchical scopes / namespaces

CrewAI's `/project/alpha/agent/researcher/findings` filesystem-like
hierarchy, LangGraph's `(user_id, application_context)` tuple
namespaces, Mem0's `user_id`/`agent_id`/`run_id` filter triple — all
three let you scope queries so memories from one user/project/session
don't pollute another's results.

### 8.4 Hot-path vs background memory updates

LangMem and Mem0 both distinguish:

- **Hot path**: agent explicitly decides to remember facts via tool
  calls *before* responding. Adds latency, but memory is consistent
  immediately.
- **Background**: a separate process extracts memories after the
  conversation. No added latency, but memory isn't immediately available
  and you need a scheduler.

Mem0's paper specifically calls out that LangMem's hot-path
configuration produced 17.99s p50 search latency on LoCoMo — so the
trade-off is real.

### 8.5 Composite scoring

CrewAI's `composite = semantic*w_s + recency*w_r + importance*w_i` is
the cleanest formulation. Default weights (0.5 / 0.3 / 0.2) make
semantic similarity dominant but let recency and importance break ties.
You can tune per use case — sprint-retrospective memory should favor
recent (recency_weight=0.5, half_life=7d); architecture knowledge
should favor importance (importance=0.4, half_life=180d).

---

## 9. Comparison table

| Project | Stars | License | Storage | Compression | Retrieval | Self-host effort | Last commit |
|---|---|---|---|---|---|---|---|
| **mem0** | 60.8k | Apache-2.0 | SQL + Vector + optional Graph (Neo4j) | LLM extraction to atomic facts | Semantic + BM25 + entity + temporal | Low (pip) / Medium (docker stack) | Jul 14, 2026 |
| **Letta/MemGPT** | 23.8k | Apache-2.0 | Postgres + pgvector | FIFO eviction + recursive summarization + core memory block limits | Text + embedding (recall + archival) | Medium (Postgres + pgvector) | Jul 3, 2026 |
| **Zep / Graphiti** | 4.8k (zep) / n/a (graphiti) | Apache-2.0 | Neo4j / FalkorDB / Neptune | None — facts stored verbatim, invalidated when superseded | Semantic + BM25 + graph traversal | High (Neo4j required, async ingestion) | Jul 10, 2026 |
| **LangChain + LangMem** | n/a + 1.6k | MIT | LangGraph Store (Postgres) | Trim middleware / SummarizationMiddleware | Vector + filter | Low (pip + Postgres) | Jul 14, 2026 |
| **LangGraph** | 37.3k | MIT | Postgres / SQLite / In-memory | None (you write it) | get/put/search by namespace+key | Low (pip + Postgres) | Jul 14, 2026 |
| **CrewAI** | 55.5k | MIT | LanceDB (default) | Atomic extraction + LLM consolidation + dedup | Composite (semantic + recency + importance) + adaptive-depth | Lowest (pip, no infra) | Jul 14, 2026 |
| **AutoGen** | 59.7k | MIT | None (you build) | None | None | Low (pip) — but **maintenance mode** | Active but slowing |

### Benchmark snapshot (LoCoMo, J score, all from Mem0 paper unless noted)

| System | J score | Tokens/query | Search p50 | Search p95 | Source |
|---|---|---|---|---|---|
| Full-context | 72.90% | 26,031 | – | 17.1s | [Mem0 paper][mem0-paper] |
| **Letta Filesystem** | **74.0%** | n/a | n/a | n/a | [Letta blog][letta-bench] |
| **Zep (corrected)** | **75.14%** ± 0.17 | 3911 (paper) | 0.51s | 0.63s | [Zep rebuttal][zep-rebuttal] |
| Zep (as reported in Mem0 paper) | 65.99% | 3911 | 0.51s | 0.78s | [Mem0 paper][mem0-paper] |
| Mem0g (graph) | 68.44% | 3616 | 0.48s | 0.66s | [Mem0 paper][mem0-paper] |
| Mem0 | 66.88% | 1764 | **0.15s** | **0.20s** | [Mem0 paper][mem0-paper] |
| RAG best (k=2, chunk=256) | 60.97% | varies | 0.26s | 0.70s | [Mem0 paper][mem0-paper] |
| OpenAI memory | 52.90% | 4437 | – | 0.89s | [Mem0 paper][mem0-paper] |
| LangMem | 58.10% | 127 | 17.99s | 59.82s | [Mem0 paper][mem0-paper] |
| A-Mem | 48.38% | 2520 | 0.67s | 1.49s | [Mem0 paper][mem0-paper] |

Mem0's README (post-April 2026 rewrite) reports **Platform** (not OSS)
scores of 92.5 LoCoMo, 94.4 LongMemEval, 64.1 BEAM(1M), 48.6 BEAM(10M),
with ~7K tokens per query and p50 latency 0.88–1.09s.

**Read the benchmarks with a skeptical eye**: LoCoMo is short enough
that full-context wins on accuracy (just not on cost), and the Letta
team's "filesystem beats specialized memory" finding suggests
benchmark scores depend more on agent context-management skill than on
the retrieval engine. There is no neutral third-party benchmark that
all three vendors agree on.

---

## 10. Specific recommendations for our hero-iteration use case

Our loop is:

```
Creator → Auditor → User Simulator → Corrector → (back to Creator)
```

Each iteration currently replays: full skill doc + previous hero code +
audit JSON. Token usage grows linearly with iteration count. We need:

1. Compress previous iterations (don't replay all code every time)
2. Remember patterns that worked/didn't across sessions
3. Surface relevant past learnings when similar heroes are requested
4. Avoid token bloat as iterations grow

### Recommendation: a three-tier memory, not a single product

Don't pick one of the seven products above wholesale. Build a three-tier
memory that *borrows* the right pattern from each:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 1 — ITERATION STATE (per hero, in-flight)                          │
│ Mechanism: LangGraph-style checkpointing keyed by (hero_id, iter_n)     │
│ Stores: full code snapshot, full audit JSON, full simulator transcript  │
│ Retention: trimmed/summarized after each Corrector pass                 │
│ Borrows from: LangGraph checkpointer + SummarizationMiddleware         │
└─────────────────────────────────────────────────────────────────────────┘
                  │  after Corrector finishes one iteration:
                  │  call `extract_memories()` on the audit + correction
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 2 — PATTERN MEMORY (cross-iteration, per project/vertical)         │
│ Mechanism: Mem0-style extract-then-consolidate + CrewAI hierarchical    │
│ scopes + composite scoring                                              │
│ Stores: atomic facts like "CTA above fold converts better on SaaS",    │
│   "gradients distract from headline on enterprise", etc.                │
│ Scope tree: /hero-patterns/{saas,enterprise,ecommerce}/                 │
│              {layout,typography,color,cta,copy}/                        │
│ Each fact tagged: importance (auditor's severity), source=audit:iter-N, │
│   created_at, hero_id                                                   │
│ Borrows from: Mem0 API + CrewAI scopes + composite scoring              │
└─────────────────────────────────────────────────────────────────────────┘
                  │  before a new hero request:
                  │  recall top-k patterns matching the brief
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 3 — FEW-SHOT EPISODIC LIBRARY (cross-session, per vertical)        │
│ Mechanism: LangChain/LangSmith-style dynamic few-shot selection         │
│ Stores: (brief, hero_code, audit_score) tuples from past successful    │
│   runs                                                                   │
│ Used as: 2-3 few-shot examples injected into the Creator prompt         │
│ Borrows from: LangChain's episodic-memory pattern (CoALA)               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why this works for our specific constraints

- **Token cost**: Tier 1 keeps the full state but it's keyed per
  iteration; we only rehydrate the current iteration. Tier 2 stores
  atomic facts (~1 sentence each) — even 1000 patterns is ~20k tokens
  but we retrieve top-k=5 per turn. Tier 3 is 2-3 few-shot examples.
  Total per-turn injection: ~5k tokens, vs unbounded growth today.
- **Cross-session pattern recall**: Tier 2's scope tree
  `/hero-patterns/saas/layout` lets the Creator recall everything we
  learned about SaaS layout in past sessions, not just current.
- **"What worked / what didn't"**: composite scoring
  (`semantic + recency + importance`) with `importance` set by the
  Auditor's severity rating means high-severity audit findings
  automatically surface first.
- **No infra bloat**: Tier 1 uses Postgres (which we already have for
  the agent loop). Tier 2 uses LanceDB locally or Qdrant in production
  (single Docker container). Tier 3 is just JSON files.

### Concrete implementation: use **mem0 OSS** for Tier 2

mem0's API is the smallest and most focused of any of the projects.
For our pattern memory:

```python
from mem0 import Memory

pattern_memory = Memory()  # OSS defaults: SQLite + Qdrant embedded

# After each Auditor pass:
def remember_iteration_outcome(hero_id, brief, audit_json, corrected_code):
    # Let Mem0 extract the salient facts
    pattern_memory.add(
        messages=[
            {"role": "system", "content":
             "Extract durable hero-design patterns from this audit. "
             "Each memory must be one atomic fact tagged with vertical, "
             "category (layout|typography|color|cta|copy), severity."},
            {"role": "user", "content":
             f"Brief: {brief}\n\n"
             f"Audit: {audit_json}\n\n"
             f"Corrected code: {corrected_code}"},
        ],
        user_id="system",
        agent_id="hero-designer",
        run_id=hero_id,
        metadata={"vertical": brief.vertical,
                  "iter": brief.iteration},
    )

# Before each Creator call:
def inject_relevant_patterns(brief, creator_prompt):
    hits = pattern_memory.search(
        f"{brief.vertical} hero {brief.focus_area}",
        filters={"agent_id": "hero-designer"},
        top_k=5,
    )
    patterns = "\n".join(f"- {h['memory']}" for h in hits["results"])
    return creator_prompt.replace(
        "{{PATTERNS}}",
        f"Past patterns learned (apply if relevant):\n{patterns}",
    )
```

### Concrete implementation: use **LangGraph checkpointing** for Tier 1

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.base import BaseCheckpointSaver

# Each iteration of the Creator/Auditor/Corrector loop is a graph run.
# thread_id = (hero_id, iteration_n)
checkpointer = PostgresSaver.from_conn_string(DB_URI)
checkpointer.setup()

# Save the full state of an iteration:
def save_iteration(hero_id, iter_n, state):
    config = {"configurable": {"thread_id": f"{hero_id}#{iter_n}"}}
    graph.invoke(state, config=config)

# Rehydrate (rare — only when user requests a specific past iteration):
def load_iteration(hero_id, iter_n):
    config = {"configurable": {"thread_id": f"{hero_id}#{iter_n}"}}
    return graph.get_state(config)
```

The checkpointer handles serialization of code + audit JSON + simulator
transcript transparently. Add a retention cron to prune checkpoints
older than N days.

### Concrete implementation: Tier 3 few-shot library

```python
# Just a JSON file per vertical, loaded at Creator time.
import json, pathlib

few_shot_path = pathlib.Path("episodic_library/saas.json")
library = json.loads(few_shot_path.read_text()) if few_shot_path.exists() else []

# Add a successful hero to the library:
def record_success(brief, hero_code, audit_score):
    library.append({
        "brief": brief.summary(),
        "code": hero_code,
        "score": audit_score,
        "ts": datetime.utcnow().isoformat(),
    })
    few_shot_path.write_text(json.dumps(library[-50:], indent=2))  # keep top 50

# Inject 2-3 highest-scoring as few-shot examples in Creator prompt:
def top_examples(brief, k=3):
    # Could use vector similarity on brief.summary() instead of just score
    return sorted(library, key=lambda x: -x["score"])[:k]
```

---

## 11. What to do this week (concrete next actions)

1. **Day 1**: Add a Postgres-backed LangGraph checkpointer to the
   Creator/Auditor/Corrector loop, keyed by `(hero_id, iteration_n)`.
   Replace the "replay full skill + previous code + audit JSON" pattern
   with checkpoint rehydration. Expected: ~60–80% token reduction on
   iteration 2+ immediately.
2. **Day 2–3**: Stand up mem0 OSS in library mode (`pip install mem0ai`,
   default SQLite + Qdrant embedded). Wire `pattern_memory.add()` into
   the Auditor's post-step hook. Wire `pattern_memory.search(top_k=5)`
   into the Creator's prompt builder. Expected: cross-session pattern
   recall working in 2 days.
3. **Day 4**: Build the episodic few-shot library (Tier 3) as a JSON
   file per vertical. Inject 2-3 top examples into the Creator prompt.
4. **Day 5**: Add a retention cron that prunes LangGraph checkpoints
   older than 30 days. Add a metrics dashboard on (a) tokens per
   iteration, (b) audit score trajectory per hero, (c) pattern memory
   size growth.
5. **Week 2**: Evaluate. If Tier 2 retrieval quality is poor, swap mem0
   for CrewAI's unified `Memory` class (composite scoring is more
   sophisticated). If we outgrow SQLite + Qdrant, migrate to hosted
   Postgres + a dedicated Qdrant cluster.
6. **Week 4**: Decide whether to keep Tier 1 on LangGraph checkpointing
   or migrate to Letta Agent SDK (only if we want Letta's sleep-time
   compute for offline pattern refinement).

---

## Sources

### Primary repos
- mem0: <https://github.com/mem0ai/mem0>
- Letta (legacy server): <https://github.com/letta-ai/letta>
- Zep (examples/integrations): <https://github.com/getzep/zep>
- Graphiti (Zep's OSS engine): <https://github.com/getzep/graphiti>
- LangGraph: <https://github.com/langchain-ai/langgraph>
- LangMem: <https://github.com/langchain-ai/langmem>
- CrewAI: <https://github.com/crewAIInc/crewAI>
- AutoGen: <https://github.com/microsoft/autogen>

### Papers
- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory, arXiv:2504.19413][mem0-paper] (Chhikara, Khant, Aryan, Singh, Yadav — April 2025)
- [MemGPT: Towards LLMs as Operating Systems, arXiv:2310.08560][memgpt-paper] (Packer, Wooders, Lin, Fang, Patil, Stoica, Gonzalez — Oct 2023, rev. Feb 2024)
- Zep: A Temporal Knowledge Graph Architecture for Agent Memory — <https://blog.getzep.com> (Dec 2025)

### Docs & blog posts
- [How Mem0 Works][mem0-how]
- [Letta Memory Blocks blog][letta-blocks] (May 14, 2025)
- [Letta Agent Memory blog][letta-agent-memory] (Jul 7, 2025)
- [Letta Stateful Agents guide][letta-stateful]
- [Letta benchmarking blog: "Is a Filesystem All You Need?"][letta-bench] (Aug 12, 2025)
- [Zep rebuttal: "Is Mem0 Really SOTA in Agent Memory?"][zep-rebuttal] (Dec 2025)
- [LangChain Memory blog][lc-memory-blog]
- [LangGraph Persistence docs][langgraph-persistence]
- [LangChain short-term memory docs][langchain-st]
- [LangChain long-term memory docs][langchain-lt]
- [CrewAI Memory docs][crewai-memory]
- [Virtual context management with MemGPT and Letta][leonie] (Leonie Monigatti)

### Benchmark blogs and overviews
- "AI Agent Memory Systems in 2026: Mem0, Zep, Hindsight, Memvid" — <https://blog.devgenius.io/ai-agent-memory-systems-in-2026-mem0-zep-hindsight-memvid-and-everything-in-between-compared-96e35b818da8>
- "Best AI Agent Memory Providers in 2026" — <https://www.developersdigest.tech/blog/best-ai-agent-memory-providers-2026>
- "AI Memory Stats 2026" — <https://preuve.ai/blog/ai-memory-systems-statistics-2026>

[mem0-paper]: https://arxiv.org/abs/2504.19413
[memgpt-paper]: https://arxiv.org/abs/2310.08560
[zep-paper]: https://blog.getzep.com
[mem0-how]: https://docs.mem0.ai/core-concepts/how-it-works
[letta-blocks]: https://www.letta.com/blog/memory-blocks
[letta-agent-memory]: https://www.letta.com/blog/agent-memory
[letta-stateful]: https://docs.letta.com/guides/core-concepts/stateful-agents
[letta-bench]: https://www.letta.com/blog/benchmarking-ai-agent-memory
[zep-rebuttal]: https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory
[lc-memory-blog]: https://www.langchain.com/blog/memory-for-agents
[langgraph-persistence]: https://langchain-ai.github.io/langgraph/concepts/persistence/
[langchain-st]: https://docs.langchain.com/oss/python/langchain/short-term-memory
[langchain-lt]: https://docs.langchain.com/oss/python/langchain/long-term-memory
[crewai-memory]: https://docs.crewai.com/concepts/memory
[leonie]: https://www.leoniemonigatti.com/blog/memgpt.html
