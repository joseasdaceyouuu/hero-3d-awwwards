# Advanced Memory Patterns for AI Agents

> A deep research report on cognitive-science-inspired memory architectures for LLM agents, with concrete proposals for a creative-hero design system.

**Author:** Research Analyst Sub-Agent
**Date:** 2025-07-15
**Scope:** Pattern-by-pattern deep dive, paper summaries, architecture sketch, Python data structures, and a tailored implementation proposal for an Awwwards-level hero section design agent.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Cognitive Memory Taxonomy](#2-the-cognitive-memory-taxonomy)
3. [Paper Deep Dives](#3-paper-deep-dives)
4. [Memory Consolidation and Forgetting](#4-memory-consolidation-and-forgetting)
5. [Compression-via-Learning Patterns](#5-compression-via-learning-patterns)
6. [Answers to the Specific Research Questions](#6-answers-to-the-specific-research-questions)
7. [Synthesis: Combining Episodic, Semantic, Procedural, and Negative Memory](#7-synthesis-combining-episodic-semantic-procedural-and-negative-memory)
8. [Proposed Architecture for the Creative Hero Agent](#8-proposed-architecture-for-the-creative-hero-agent)
9. [Concrete Python Data Structures](#9-concrete-python-data-structures)
10. [Consolidation "Sleep" Phase Design](#10-consolidation-sleep-phase-design)
11. [Style Drift and Negative Knowledge](#11-style-drift-and-negative-knowledge)
12. [References and Links](#12-references-and-links)

---

## 1. Executive Summary

The frontier of LLM agent memory has moved decisively beyond "stuff everything in the prompt" and "append to a vector database." The 2023–2025 literature converges on a small set of recurring patterns that, taken together, define what a modern agent memory stack should look like:

1. **Multi-store architecture** — working, episodic, semantic, procedural (and sometimes prospective) memory as distinct stores with different read/write/forget policies (CoALA, Soar).
2. **Tri-score retrieval** — recency × importance × relevance scoring for episode recall (Generative Agents).
3. **Reflection / consolidation loops** — periodic synthesis of low-level episodes into higher-level abstractions (Generative Agents' reflection trees; Reflexion's verbal self-critique; SleepGate's KV-cache consolidation).
4. **Skill libraries indexed by description embeddings** — executable, composable procedures that compress many iterations into one reusable artifact (Voyager).
5. **Self-evolving, linked note networks** — Zettelkasten-style memory where each new note can re-write the attributes of related old notes (A-MEM).
6. **OS-style tiered memory with self-editing** — main context, working context, archival storage with LLM-driven page-in/page-out (MemGPT / Letta).
7. **Active forgetting and conflict resolution** — detecting stale facts, evicting them, and consolidating survivors into summaries (SleepGate, SCM, STALE/CUPMem).

For a **creative design agent that iteratively produces Awwwards-level hero sections**, the practical synthesis is: maintain a four-tier memory (episodic iteration logs → semantic pattern catalog → procedural skill library → negative-knowledge anti-patterns), run a weekly "sleep" consolidation pass that mines new episodes for skills and updates semantic facts, and use a Generative-Agents-style tri-score retrieval at inference time so the agent sees the right three-to-five prior episodes for any new design brief.

The remainder of this report justifies that recommendation with paper-by-paper detail and gives concrete Python data structures.

---

## 2. The Cognitive Memory Taxonomy

Modern agent-memory papers almost universally ground themselves in the same five-fold taxonomy borrowed from cognitive psychology (Tulving, Atkinson & Shiffrin, Baddeley). The **CoALA** paper (Sumers et al., 2023/2024) is the cleanest statement of this taxonomy for LLM agents.

### 2.1 Working Memory

In CoALA, working memory is *"a data structure that persists across LLM calls"* — it holds the current perceptual input, the active goal, and any knowledge retrieved or reasoned about in the current decision cycle. On each LLM call, a subset of working memory is serialized into the prompt; the LLM output is parsed back into working-memory variables.

**Implication for our hero agent:** working memory = the current brief + the current design's HTML/CSS + the audit results + a few retrieved exemplars. This is the only memory the LLM actually sees on a given turn.

### 2.2 Episodic Memory

Stores **raw experiences** — sequences of (state, action, observation, outcome) tuples. In CoALA's framing, episodic memory is the equivalent of a flight-data recorder: append-only, time-stamped, never edited in place. Generative Agents, Reflexion, and Voyager all maintain episodic memory of some kind.

**Implication:** every hero we ship becomes an episode: `{brief, generated_code, audit_scores, user_feedback, timestamp, iteration_count}`. Never overwrite — episodes are the raw material that consolidation mines.

### 2.3 Semantic Memory

Stores **generalized facts** about the world. CoALA notes that traditional NLP/RL approaches treat semantic memory as a read-only external database (Wikipedia, game manuals); language agents *write* to it as a form of learning. A-MEM's "memory evolution" is exactly this: when a new note arrives, the system updates the contextual description and tags of related old notes — i.e., it refines its semantic knowledge.

**Implication:** semantic memory is the home of statements like *"photography portfolios respond well to parallax 2.5D + accent color"*. These facts are derived from episodes (via consolidation) and refined over time.

### 2.4 Procedural Memory

In CoALA this is split into two parts: **(a)** implicit knowledge in the LLM's weights, and **(b)** explicit knowledge encoded as code. Voyager's skill library is the canonical example of (b): each skill is an executable JavaScript function with a natural-language description, indexed by an embedding of that description. Procedural memory is dangerous to write (a buggy procedure breaks everything downstream), so it must be gated by verification.

**Implication:** procedural skills for our agent are reusable component generators — e.g., a `parallax_hero_layers(n=3, accent="#ff5500")` function whose body was debugged across multiple successful episodes.

### 2.5 Prospective Memory

The least-implemented of the five: memory for **future intentions**. None of the four flagship papers (CoALA, Generative Agents, Voyager, Reflexion) implement prospective memory explicitly, but Generative Agents' planning module (which writes plans back into the memory stream) is the closest analog. The 2024 survey literature increasingly flags prospective memory as an open problem.

**Implication:** for a creative agent, prospective memory could store *"next time the user asks for a SaaS hero, try the new CSS `view-transition` API I read about"* — a deferred intention triggered by a future context match.

---

## 3. Paper Deep Dives

### 3.1 CoALA — Cognitive Architectures for Language Agents

**Paper:** Sumers, Yao, Narasimhan, Griffiths. *Cognitive Architectures for Language Agents.* TMLR 2024 (arXiv:2309.02427, Sep 2023, v3 Mar 2024).
**Repo:** https://github.com/ysymyth/awesome-language-agents

CoALA proposes the **standard reference architecture** for the field. The agent has:

- **Memory modules**: working memory (short-term) + episodic, semantic, procedural long-term memory.
- **Action space**: split into *internal* (retrieval from LTM, reasoning with LLM, learning by writing to LTM) and *external* (grounding — interacting with the world).
- **Decision cycle**: a loop. Each cycle, the agent uses reasoning + retrieval actions to plan; the plan selects a grounding or learning action; the action executes; the cycle repeats. CoALA calls this the agent's "main procedure."

The paper's central contribution is conceptual: it argues that the field has been rediscovering, under different names, the same components that Soar (Laird, 2012) and ACT-R (Anderson, 1996) formalized in the 1990s. The LLM is the new "production system," but the surrounding cognitive architecture (memory tiers, action types, decision cycle) is unchanged.

**Why it matters for us:** CoALA gives us the vocabulary. When we say "episodic memory," "semantic memory," "procedural skill," and "working memory," we are using CoALA's definitions, and any future engineer who has read the literature will understand us.

### 3.2 Generative Agents — Park et al. (Stanford / Google, 2023)

**Paper:** Park, O'Brien, Cai, Morris, Liang, Bernstein. *Generative Agents: Interactive Simulacra of Human Behavior.* UIST 2023 (arXiv:2304.03442).

The single most-cited memory architecture in the LLM-agent literature. Three components:

1. **Memory Stream** — an append-only log of natural-language records. Each record has content, creation timestamp, and last-access timestamp.
2. **Retrieval** — given a query, score every record by:
   
   ```
   score = α_recency · recency + α_importance · importance + α_relevance · relevance
   ```
   
   with all α's set to 1 in the original paper. The three components:
   - **Recency**: exponential decay, `0.995^(hours_since_last_access)`. Decays to ~0.005 after ~10 sandbox-hours.
   - **Importance**: an LLM-rated integer on a 1–10 scale. The prompt: *"On the scale of 1 to 10, where 1 is purely mundane (e.g., brushing teeth) and 10 is extremely poignant (e.g., a breakup, college acceptance), rate the likely poignancy of the following piece of memory."* Generated once at memory creation.
   - **Relevance**: cosine similarity between the embedding of the query and the embedding of the memory record.
   
   All three are min-max normalized to [0, 1] before summing.

3. **Reflection** — when the agent's recent memories cross an importance threshold, the system triggers a reflection: it pulls the most salient recent memories and asks the LLM to synthesize *"What recent insights can you derive from the following statements?"* The resulting reflection is itself a memory record, inserted back into the stream. Reflections can be recursive — higher-level reflections synthesize lower-level ones, producing a reflection tree.

4. **Planning** — top-down and recursive: a high-level plan ("write a research paper") is decomposed into sub-plans ("write introduction", "write methods") into detailed step-by-step actions. Plans are stored in the memory stream and retrieved like any other record.

The ablation in the paper shows that **removing any one of observation, planning, or reflection noticeably degrades agent believability**. Reflection alone accounts for the bulk of the "agent seems to have intentions and growth" effect.

**Why it matters for us:** the tri-score retrieval function is the cheapest, highest-leverage memory mechanism in the literature. It can be implemented in ~50 lines of Python. Reflection is the bridge between episodic and semantic memory — it is the consolidation primitive.

### 3.3 Voyager — Wang et al. (NVIDIA / Caltech / Stanford / UT Austin, 2023)

**Paper:** Wang, Xie, Jiang, Mandlekar, Xiao, Zhu, Fan, Anandkumar. *Voyager: An Open-Ended Embodied Agent with Large Language Models.* NeurIPS 2023 (arXiv:2305.16291).
**Repo:** https://github.com/MineDojo/Voyager

Voyager is the canonical **skill library** paper. Three components:

1. **Automatic Curriculum** — GPT-4 generates the next task based on the agent's current state and exploration progress, biased toward "discover as many diverse things as possible." This is in-context novelty search.
2. **Skill Library** — each skill is an executable JavaScript function (e.g., `craftStoneShovel()`, `combatZombieWithSword()`). The skill is committed to the library *only after* a self-verification module confirms the task is complete. Each skill is indexed by the **embedding of its natural-language description** (generated by GPT-3.5/4). At retrieval time, the system embeds the new task's context + environment feedback, queries the library, and returns the top-5 most similar skills.
   
   The retrieval query is itself composed: GPT-3.5 first generates a "general suggestion for solving the task," which is concatenated with the environment feedback, then embedded. This gives much better retrieval than embedding the raw task description.
3. **Iterative Prompting Mechanism** — three types of feedback are fed back into the GPT-4 code-generation prompt: (1) environment feedback (inventory listing, nearby creatures, intermediate progress), (2) execution errors (the JS exception trace), and (3) self-verification critique. The program is refined until self-verification passes, at which point it is committed to the skill library.

Voyager's headline result: **3.3× more unique items, 2.3× longer traversal, 15.3× faster tech-tree milestones** vs. prior SOTA. More importantly for us: the learned skill library transfers to a *new Minecraft world* and solves novel tasks from scratch — strong evidence that skill libraries encode generalizable procedural knowledge, not just memorized solutions.

**Why it matters for us:** skill libraries are the cleanest implementation of "compression-via-learning." For a creative agent, each reusable component generator (e.g., `parallax_layers`, `text_reveal_animation`, `cursor_magnetic_effect`) is a Voyager skill. The retrieval-via-embedding-of-description pattern is exactly right for "find the skill that worked on a similar brief."

### 3.4 Reflexion — Shinn et al. (Northeastern / MIT / Princeton, 2023)

**Paper:** Shinn, Cassano, Berman, Gopinath, Narasimhan, Yao. *Reflexion: Language Agents with Verbal Reinforcement Learning.* NeurIPS 2023 (arXiv:2303.11366).
**Repo:** https://github.com/noahshinn/reflexion

Reflexion is the canonical **verbal self-reflection** paper. Three modular LLMs:

- **Actor (M_a)** — generates actions, can be ReAct or Chain-of-Thought.
- **Evaluator (M_e)** — scores the actor's trajectory (binary pass/fail, scalar reward, or free-form critique).
- **Self-Reflection (M_sr)** — given the trajectory and the evaluator's verdict, produces a verbal reflection: a short natural-language summary of what went wrong and what to try next.

The algorithm (their Algorithm 1):

```
Initialize Actor, Evaluator, Self-Reflection models
Generate initial trajectory τ_0 using Actor
Evaluate τ_0 using Evaluator
Generate initial self-reflection sr_0 using M_sr
Set mem ← [sr_0]
while Evaluator doesn't pass or t < max_trials:
    Generate τ_t using Actor (conditioned on mem)
    Evaluate τ_t using Evaluator
    Generate self-reflection sr_t using M_sr
    Append sr_t to mem
    Increment t
```

The memory buffer `mem` is the agent's episodic memory of its own self-critiques. It is appended to (never overwritten) on each trial. The Actor's prompt is augmented with the full `mem` on each subsequent trial, so the agent effectively "remembers what it learned last time it tried this kind of task."

**Headline result:** 91% pass@1 on HumanEval, beating GPT-4 (80%) at the time.

**Why it matters for us:** Reflexion is the *negative-knowledge* primitive. Each failed hero iteration produces a verbal reflection — *"the 3D text was unreadable against the busy background; next time use a solid backdrop"* — that is appended to the episode's memory. On the next similar brief, the reflection is retrieved and injected into the prompt, preventing the same mistake.

### 3.5 A-MEM — Agentic Memory for LLM Agents (2025)

**Paper:** Xu, Liang, Mei, Gao, Tan, Zhang. *A-MEM: Agentic Memory for LLM Agents.* NeurIPS 2025 (arXiv:2502.12110, Feb 2025).
**Repo (system):** https://github.com/WujiangXu/A-mem-sys
**Repo (evaluation):** https://github.com/WujiangXu/A-mem

A-MEM is the most important recent paper in the space. It applies the **Zettelkasten method** (a note-taking system developed by sociologist Niklas Luhmann) to agent memory. The core idea: notes are atomic, self-contained, and *linked*; the network of links is itself a knowledge structure.

Each memory note is a structured object:

```
m_i = {c_i, t_i, K_i, G_i, X_i, e_i, L_i}
```

where:
- `c_i` — original interaction content
- `t_i` — timestamp
- `K_i` — LLM-generated **keywords** capturing key concepts
- `G_i` — LLM-generated **tags** for categorization
- `X_i` — LLM-generated **contextual description** providing rich semantic understanding
- `e_i` — dense vector embedding of `concat(c_i, K_i, G_i, X_i)`
- `L_i` — set of linked memories sharing semantic relationships

Three operations:

1. **Note Construction** — when a new interaction happens, an LLM generates `K_i`, `G_i`, `X_i` from the raw content. The note is then embedded.
2. **Link Generation** — for each existing memory `m_j`, compute cosine similarity `s_{n,j}` between the new note's embedding and `m_j`'s embedding. If similarity exceeds a threshold (and an LLM judge confirms a meaningful semantic relationship), add a bidirectional link.
3. **Memory Evolution** — the killer feature. For each memory `m_j` in the new note's nearest-neighbor set, the LLM is asked to *update* `m_j`'s contextual description, keywords, and tags in light of the new memory:
   
   ```
   m_j* ← LLM(m_n ‖ M_near^n \ {m_j} ‖ m_j ‖ P_s3)
   ```
   
   The evolved `m_j*` replaces the original. This is **continuous knowledge refinement** — as more episodes accumulate, the system's semantic understanding of older episodes becomes richer.

A-MEM outperforms MemGPT, MemoryBank, ReadAgent, and LoCoMo baselines across single-hop, multi-hop, temporal, open-domain, and adversarial question categories on six foundation models.

**Why it matters for us:** A-MEM is the first paper to operationalize "memories that change when you learn new things." For our agent, this means: when we ship hero #50 that finally nails the photographer-portfolio pattern, A-MEM's evolution step would automatically refine the contextual descriptions of heroes #5, #12, #28 — earlier attempts at the same pattern — so future retrieval surfaces them as a coherent cluster.

### 3.6 MemGPT / Letta — LLMs as Operating Systems

**Paper:** Packer, Wooders, Lin, Fang, Patil, Stoica, Gonzalez. *MemGPT: Towards LLMs as Operating Systems.* Oct 2023 (arXiv:2310.08560).
**Repo:** https://github.com/cpacker/MemGPT → evolved into https://github.com/letta-ai/letta

MemGPT borrows the **virtual memory hierarchy** from operating systems: main context (the LLM's prompt), working context (a small editable block of "pinned" facts that survives across turns), and archival storage (unbounded vector DB). The LLM is given tool calls to page memory between tiers — `core_memory_append`, `core_memory_replace`, `archival_memory_insert`, `archival_memory_search`. The LLM decides, via function-calling, when to evict from working context and when to page in from archival.

**Why it matters for us:** MemGPT's working-context pattern is the right model for "facts the agent should always remember about this user/project" (e.g., brand colors, target audience, last week's rejected direction). These don't fit naturally into episodic or semantic memory — they are session-scoped pinned facts.

### 3.7 Mem0 — Production-Ready Memory (2025)

**Paper:** Dev, Taranjeet et al. *Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory.* ECAI 2025 (arXiv:2504.19413, Apr 2025).

Mem0 is the *engineering* counterpart to A-MEM's *research*. It dynamically extracts salient facts from ongoing conversations, consolidates them (resolving contradictions and merging updates), and retrieves them with a hybrid vector + graph approach. The graph variant captures relational structure ("user works at company X, company X has policy Y"). Headline numbers: **26% relative improvement over OpenAI's memory on the LOCOMO benchmark, 91% lower p95 latency, 90% token-cost savings** vs. full-context approaches.

**Why it matters for us:** Mem0 is the reference if we want to *deploy* rather than prototype. The fact-extraction + contradiction-resolution + graph-linking pipeline is exactly what we need to scale from 100 episodes to 10,000.

### 3.8 SPRING — Studying the Paper and Reasoning to Play Games

**Paper:** Wu, Hu, Shu, Liu, Li, Zhao, Wu, Yue. *SPRING: Studying the Paper and Reasoning to Play Games.* NeurIPS 2023 (arXiv:2305.15486).

SPRING reads a game's academic paper (the LaTeX source) and uses the LLM to reason about how to play. It encodes the paper as a **directed acyclic graph (DAG)** of questions: nodes are questions ("What tools do I need to make a sword?"), edges are dependencies ("I need to know how to make a pickaxe first"). At inference time, the LLM traverses the DAG in topological order, answering each question; the final node's answer maps to a game action.

**Why it matters for us:** SPRING is a metaphor for how an agent should treat its own design-system documentation. Instead of a flat prompt, structure domain knowledge as a DAG of design questions — *"What is the user's industry?" → "What archetype suits this industry?" → "What animation pattern suits this archetype?"* — and traverse it at brief time.

### 3.9 SCM, SleepGate, STALE — Memory Consolidation & Forgetting (2025)

Three recent papers tackle the question of *how memories degrade and consolidate over time*, the most cognitively-realistic frontier.

**SCM (Sleep-Consolidated Memory, arXiv:2604.20943)** implements five biologically-inspired components:
- Limited-capacity working memory
- Multi-dimensional importance tagging
- Offline sleep with distinct **NREM and REM phases** (NREM = consolidation/replay; REM = creative recombination)
- Intentional value-based forgetting
- A computational self-model enabling introspection

SCM achieves perfect recall on 10-turn conversations while reducing memory noise by 90.9% via adaptive forgetting, with sub-millisecond search latency.

**SleepGate (arXiv:2603.14517)** tackles *proactive interference* — when stale associations in the KV cache disrupt retrieval of current values. It introduces (1) a conflict-aware temporal tagger detecting when new entries supersede old ones, (2) a forgetting gate trained to evict or compress stale entries, and (3) a consolidation module that merges survivors into compact summaries. Sleep micro-cycles are triggered by an adaptive entropy-based signal. SleepGate reduces the interference horizon from O(n) to O(log n) and achieves 99.5% retrieval accuracy where baselines are below 18%.

**STALE (arXiv:2605.06527) + CUPMem** introduces a benchmark for **memory conflict detection** with three probing dimensions: State Resolution (recognize a belief is outdated), Premise Resistance (reject queries that presuppose stale states), and Implicit Policy Adaptation (proactively apply updated states in downstream behavior). Frontier models achieve only 55.2% accuracy — a pervasive gap between *retrieving* updated evidence and *acting on* it. CUPMem proposes structured state consolidation at write-time + propagation-aware search.

**Why it matters for us:** this cluster validates the "weekly sleep phase" intuition. Without active forgetting and conflict resolution, an agent accumulating thousands of hero episodes will suffer from proactive interference (an old "use big serif typography" rule colliding with a newer "use big sans-serif typography" rule). The SCM NREM/REM split is particularly inspiring: NREM consolidates and prunes; REM recombines — we can use the same pattern to (a) compress episodes into facts and (b) occasionally try wild remixes of skill fragments.

---

## 4. Memory Consolidation and Forgetting

### 4.1 Spaced Repetition for Agents

Classic spaced-repetition systems (Anki, SuperMemo) schedule reviews at expanding intervals (1 day, 3 days, 7 days, 16 days...) based on the forgetting curve. For agents, the analog is: **episodes that are retrieved get their "last access" timestamp updated, boosting recency; episodes that are never retrieved decay.** This is precisely Generative Agents' recency-decay mechanism. No agent paper implements full SM-2 / FSRS scheduling yet — this is an open opportunity.

### 4.2 Sleep-like Consolidation

SCM and SleepGate formalize what an offline consolidation pass should do:
1. **Triage** — score each episode by importance × recency × retrieval_count.
2. **Replay** — re-encode high-value episodes into compressed semantic facts.
3. **Forget** — evict or compress low-value episodes (SCM: value-based; SleepGate: gate-predicted).
4. **Recombine** (REM analog) — sample skill fragments and recombine them to propose novel procedures, validate via self-verification.

For our creative agent, this maps to a weekly cron job that:
- Scans the past week's hero episodes.
- Calls an LLM with a reflection-style prompt: *"Given these 30 hero iterations, what 3 generalizable patterns can you extract? What 2 patterns consistently failed?"*
- Writes the patterns into semantic memory; writes the failures into negative-knowledge memory.
- Optionally: samples 2-3 existing skills, asks the LLM to propose a remix, validates against a held-out brief.

### 4.3 Active Forgetting

Three mechanisms, in increasing sophistication:
1. **TTL-based** — episodes older than N days are archived. Crude but cheap.
2. **Decay-based** — Generative Agents' exponential decay; an episode's retrieval score naturally drops over time.
3. **Conflict-driven** — SleepGate's gate detects when a new episode supersedes an old one and evicts the loser. A-MEM's evolution is the soft version: rather than evicting, it rewrites the older memory's description to incorporate the new information.

### 4.4 Rehearsal

Re-activating important memories to keep them accessible. In biological systems, this happens during sleep. In agents, this means: when consolidating, *re-embed* high-value memories so their retrieval scores stay high. SCM and SleepGate both implement this implicitly via the consolidation pass.

### 4.5 Interference Management

The STALE paper is the canonical reference. Three failure modes:
- An old fact is *explicitly* contradicted (easy — overwrite).
- An old fact is *implicitly* invalidated by a new observation without explicit negation (hard — requires commonsense reasoning).
- A change in one fact should *propagate* to related facts (very hard — requires graph traversal + LLM judge).

CUPMem's solution: structured state consolidation at write time (detect conflicts *before* writing) + propagation-aware search (when retrieving, also retrieve and reconcile related memories).

---

## 5. Compression-via-Learning Patterns

### 5.1 Skill Libraries (Voyager)

Already covered in §3.3. The key insight: **a skill is an executable procedure with a natural-language description**. The description is the retrieval key; the procedure is the value. Skills compose — `craftWoodenPickaxe()` can be called inside `mineStone()`. This composition is what compounds capabilities and alleviates catastrophic forgetting.

### 5.2 Concept Extraction

Generative Agents' reflection is the primitive: take N episodes, ask the LLM "what generalizable insight can you derive?", write the insight back as a higher-level memory. Voyager does the same when committing a verified skill (the skill *is* the extracted concept). A-MEM's memory evolution is the same idea at the per-memory level.

### 5.3 Analogy Engines

Less developed in the agent literature. The closest pattern is **structural retrieval**: given a new brief, retrieve not just semantically similar past episodes but *structurally* similar ones — same number of components, same interaction topology. This requires a structural embedding (e.g., embed a graph representation of the hero's component tree, not just its text). No flagship paper implements this yet; it's an open research direction.

### 5.4 Meta-Learning (Learning to Learn)

Reflexion is the closest: the self-reflection model `M_sr` learns (in-context, not via weight updates) what kinds of mistakes the actor tends to make. Over many trials, the reflections become more targeted and useful. Voyager's automatic curriculum is also a form of meta-learning: the curriculum-generating prompt implicitly learns "what kinds of tasks should I propose next given where I am in the tech tree."

For our agent, meta-learning would mean: after every N consolidation passes, run a meta-pass that asks *"which of my extracted skills have I never actually re-used? Why?"* and prunes the skill library accordingly.

---

## 6. Answers to the Specific Research Questions

**Q1. How does Generative Agents' memory stream work?**
An append-only log of natural-language records. Retrieval scores each record as `α_r·recency + α_i·importance + α_rel·relevance` (all α=1). Recency = `0.995^(hours since last access)` (exponential decay). Importance = LLM-rated 1–10, generated once at memory creation. Relevance = cosine similarity of embeddings. All three normalized to [0,1] before summing. Reflections (synthesized higher-level memories) and plans are stored alongside observations and retrieved the same way. See §3.2.

**Q2. How does Voyager's skill library store and retrieve skills?**
Each skill is an executable JavaScript function with a natural-language description. The library is a vector database keyed by the embedding of the description. Retrieval query = embedding of (GPT-3.5-generated task suggestion + environment feedback). Top-5 skills returned. Skills are committed only after self-verification passes. Skills compose (one skill can call another). See §3.3.

**Q3. What's Reflexion's self-correction loop?**
Three LLMs (Actor, Evaluator, Self-Reflection). On each trial: Actor generates a trajectory; Evaluator scores it; Self-Reflection produces a verbal critique ("here's what went wrong, here's what to try"). The critique is appended to an episodic memory buffer. On the next trial, the Actor's prompt includes the full memory buffer, so it sees all prior critiques. Loop until Evaluator passes or max trials reached. See §3.4.

**Q4. What does CoALA propose as the standard memory architecture?**
Working memory (short-term, persists across LLM calls) + three long-term stores: episodic (raw experiences), semantic (generalized facts), procedural (executable code + LLM weights). Actions are retrieval (read from LTM), reasoning (LLM call), learning (write to LTM), and grounding (external). A decision cycle loops: retrieve + reason → select action → execute → repeat. See §3.1.

**Q5. Are there implementations of episodic → semantic consolidation for LLM agents?**
Yes, three flavors:
- **Generative Agents' reflection** — periodic synthesis of recent episodes into higher-level insights, written back as new memory records.
- **A-MEM's memory evolution** — when a new memory arrives, related old memories have their contextual descriptions, keywords, and tags rewritten by the LLM.
- **SCM/SleepGate's sleep phase** — offline pass that compresses low-level episodes into compact summaries, evicts stale ones, and triggers on an adaptive entropy-based signal.
See §3.2, §3.5, §3.9.

**Q6. How would the skill library pattern apply to creative work (designing heroes)?**
Directly. Each reusable component generator is a Voyager-style skill: a Python/JS function with a natural-language description, indexed by embedding. Examples:
- `parallax_hero_layers(layers=4, accent="#ff5500", depth_range=(0.1, 0.4))` — emits the HTML/CSS for a multi-layer parallax hero.
- `text_reveal_animation(direction="up", stagger_ms=80, easing="cubic-bezier(0.22, 1, 0.36, 1)")` — emits a GSAP-style reveal.
- `cursor_magnetic_effect(selector=".cta", strength=0.3)` — emits the magnetic-cursor JS.

Skills are committed only after audits (Lighthouse ≥ 90, no console errors, visual smoke test) pass. At brief time, the system embeds the user brief + retrieval context, queries the skill library, returns top-5 relevant skills, and injects them into the generation prompt. Skills compose — a hero can call `parallax_hero_layers` which internally calls `text_reveal_animation`. See §3.3.

**Q7. What's the state of A-MEM or similar recent memory papers?**
A-MEM (Feb 2025, NeurIPS 2025) is the current state of the art for general-purpose agent memory. Its Zettelkasten-inspired note structure `{c, t, K, G, X, e, L}` and three operations (Note Construction, Link Generation, Memory Evolution) outperform MemGPT, MemoryBank, and Mem0 across multi-hop and temporal reasoning. The "memory evolution" feature — where old memories are rewritten when related new memories arrive — is the most novel contribution. A-MEM is open-sourced at https://github.com/WujiangXu/A-mem-sys. See §3.5.

---

## 7. Synthesis: Combining Episodic, Semantic, Procedural, and Negative Memory

### 7.1 The Combined Memory Stack

Drawing from all the above, a complete agent memory stack has **five stores**:

| Store | What it holds | Write policy | Read policy | Forget policy |
|---|---|---|---|---|
| Working | Current brief, current code, current audits | Overwrite each turn | Always in prompt | N/A |
| Episodic | Raw (brief, code, audits, outcome) tuples | Append-only | Tri-score retrieval | Decay + TTL |
| Semantic | Generalized patterns / facts | Consolidation-only | Top-k embedding similarity | Conflict-driven rewrite (A-MEM evolution) |
| Procedural | Skills (executable code + description) | Verification-gated commit | Embedding retrieval top-5 | Periodic meta-pruning |
| Negative | Failed patterns + Reflexion critiques | Append on failure | Always retrieved for similar briefs | Decay if not re-failed (rare) |

### 7.2 The Consolidation Pipeline (Episodic → Semantic → Procedural)

Run weekly (or after every N=20 episodes):

```
for each new episode e in this_window:
    reflect(e) → candidate_fact
    if candidate_fact conflicts with existing semantic memory:
        evolve(existing_memory, candidate_fact)  # A-MEM evolution
    else:
        insert(candidate_fact)

for each cluster of similar successful episodes:
    if cluster.size >= 3 and all passed audits:
        propose_skill(cluster)
        if verify(skill):  # run on held-out brief
            commit(skill) to procedural memory

for each cluster of similar failed episodes:
    extract_failure_pattern(cluster)
    commit(failure_pattern) to negative memory
```

### 7.3 Inference-time Retrieval

Given a new brief:

1. Embed brief + current-context summary.
2. Retrieve top-3 **episodic** memories via tri-score.
3. Retrieve top-5 **procedural** skills via embedding similarity.
4. Retrieve top-3 **semantic** facts via embedding similarity.
5. Retrieve top-2 **negative** memories via embedding similarity (so the agent sees "things that failed on similar briefs").
6. Inject all of the above into the generation prompt.

This is the Generative-Agents retrieval formula extended with Voyager-style skill retrieval and Reflexion-style negative-knowledge retrieval.

---

## 8. Proposed Architecture for the Creative Hero Agent

### 8.1 ASCII Architecture Sketch

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CREATIVE HERO DESIGN AGENT                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   WORKING MEMORY (per-turn)                 │   │
│  │  • current_brief (user prompt)                              │   │
│  │  • current_code (HTML/CSS/JS so far)                        │   │
│  │  • current_audits (Lighthouse, visual, console)             │   │
│  │  • retrieved_episodic[0..3]   ← from episodic store         │   │
│  │  • retrieved_skills[0..5]     ← from procedural store       │   │
│  │  • retrieved_facts[0..3]      ← from semantic store         │   │
│  │  • retrieved_antipatterns[0..2] ← from negative store       │   │
│  │  • pinned_facts (MemGPT-style core memory)                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│                              │ assembled into prompt                │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    LLM (generation + reasoning)             │   │
│  │  • plans via SPRING-style DAG traversal                     │   │
│  │  • Reflexion-style self-critique on failure                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│                              │ new code / new audit                  │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            EPISODE WRITER (append-only)                     │   │
│  │  → appends to EPISODIC MEMORY                               │   │
│  │  → on failure: appends Reflexion critique to NEGATIVE MEM   │   │
│  │  → on success + repeated: candidate for SKILL commit        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ──────────────── LONG-TERM MEMORY STORES ────────────────────     │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │  EPISODIC    │ │  SEMANTIC    │ │  PROCEDURAL  │ │ NEGATIVE  │ │
│  │  (vector DB) │ │ (A-MEM net)  │ │ (skill lib)  │ │ (vector)  │ │
│  │              │ │              │ │              │ │           │ │
│  │ • brief      │ │ • pattern    │ │ • skill code │ │ • failed  │ │
│  │ • code       │ │   facts      │ │ • description│ │   pattern │ │
│  │ • audits     │ │ • linked     │ │ • embedding  │ │ • critique│ │
│  │ • outcome    │ │   notes      │ │ • verify_pass│ │ • context │ │
│  │ • timestamp  │ │ • evolved X  │ │ • use_count  │ │ • date    │ │
│  │ • importance │ │ • tags/keys  │ │              │ │           │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ │
│         ▲                  ▲                ▲                ▲      │
│         │                  │                │                │      │
│         └──────────────────┴────────────────┴────────────────┘      │
│                              │                                       │
│                              │ weekly cron                           │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            SLEEP / CONSOLIDATION PHASE (weekly)             │   │
│  │  NREM:                                                       │   │
│  │   • triage episodes by importance × recency × retrievals     │   │
│  │   • reflect → candidate semantic facts                       │   │
│  │   • evolve existing semantic memories (A-MEM)                │   │
│  │   • cluster successful episodes → candidate skills           │   │
│  │   • cluster failed episodes → negative patterns              │   │
│  │   • forget low-value / stale / contradicted episodes         │   │
│  │  REM:                                                        │   │
│  │   • sample 2-3 skills, ask LLM to remix                     │   │
│  │   • verify remix on held-out brief                          │   │
│  │   • if pass: commit as new candidate skill                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Key Design Decisions

1. **Five stores, not one.** A single vector DB conflates episodes, facts, skills, and anti-patterns. Splitting them lets each store have its own write/forget policy.
2. **Tri-score retrieval for episodes** (Generative Agents) — recency matters because the agent's taste and the web's design trends drift.
3. **Embedding-of-description retrieval for skills** (Voyager) — skills are retrieved by *what they do*, not by which episode spawned them.
4. **A-MEM evolution for semantic memory** — when a new hero reveals that "parallax 2.5D works better than 3D for photographers," this should update the older semantic fact "3D scenes look impressive" rather than leave a contradiction.
5. **Reflexion for negative knowledge** — every failure produces a verbal critique that is appended to negative memory. Always retrieved on similar briefs.
6. **Weekly sleep phase** (SCM/SleepGate) — NREM consolidates and forgets; REM recombines. The agent gets better even when no user is interacting.
7. **MemGPT-style pinned facts** — brand colors, audience, last rejected direction live in working context, not in retrieval.

---

## 9. Concrete Python Data Structures

```python
"""
Data structures for the multi-tier creative hero design agent memory.
Inspired by CoALA, Generative Agents, Voyager, Reflexion, A-MEM, SCM.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional
from enum import Enum


# ─────────────────────────── EPISODIC MEMORY ───────────────────────────

class Outcome(str, Enum):
    SHIPPED = "shipped"          # user accepted, deployed
    REJECTED = "rejected"        # user rejected the direction
    ITERATED = "iterated"        # accepted as iteration, more to come
    FAILED_AUDIT = "failed_audit"
    FAILED_RUNTIME = "failed_runtime"


@dataclass
class HeroEpisode:
    """One iteration of one hero. Append-only — never mutate after write."""
    episode_id: str                       # uuid
    session_id: str                       # groups episodes in same user session
    timestamp: datetime
    last_accessed: datetime               # updated on each retrieval (for recency decay)

    # Inputs
    brief: str                            # user's natural-language brief
    brief_embedding: list[float]          # pre-computed for retrieval
    pinned_facts: dict[str, Any]          # brand colors, audience, etc. (MemGPT core memory)

    # Outputs
    generated_code: str                   # HTML/CSS/JS snapshot
    archetype: str                        # e.g., "Arquetipo 1 — Parallax 2.5D"
    layers: int                           # structural descriptor

    # Evaluation
    audits: dict[str, float]              # {"lighthouse_perf": 0.94, "visual_score": 0.88, ...}
    outcome: Outcome
    user_feedback: Optional[str] = None

    # Retrieval scoring (Generative Agents)
    importance: float = 5.0               # LLM-rated 1-10 at creation; 0.5 default for mundane
    retrieval_count: int = 0              # how many times this episode has been retrieved

    # Reflexion
    self_critique: Optional[str] = None   # verbal reflection if outcome != SHIPPED

    # Provenance
    parent_episode_id: Optional[str] = None   # if this iteration descended from a previous one
    skills_used: list[str] = field(default_factory=list)  # skill_ids invoked


def tri_score_retrieval(
    query_embedding: list[float],
    episodes: list[HeroEpisode],
    current_time: datetime,
    alpha_recency: float = 1.0,
    alpha_importance: float = 1.0,
    alpha_relevance: float = 1.0,
    recency_decay_per_hour: float = 0.995,   # Generative Agents default
) -> list[tuple[HeroEpisode, float]]:
    """
    Generative Agents retrieval formula:
        score = α_r · recency + α_i · importance + α_rel · relevance
    All three normalized to [0, 1] via min-max before summing.
    """
    scored = []
    raw = []
    for ep in episodes:
        hours_since = (current_time - ep.last_accessed).total_seconds() / 3600
        recency = recency_decay_per_hour ** hours_since
        importance = ep.importance / 10.0   # already in [0.1, 1.0]
        # relevance = cosine sim — assume ep.brief_embedding is pre-normalized
        relevance = sum(a*b for a, b in zip(query_embedding, ep.brief_embedding))
        raw.append((ep, recency, importance, relevance))

    # min-max normalize each component
    recencies = [r for _, r, _, _ in raw]
    importances = [i for _, _, i, _ in raw]
    relevances = [rel for _, _, _, rel in raw]

    def norm(x, xs):
        lo, hi = min(xs), max(xs)
        return (x - lo) / (hi - lo) if hi > lo else 1.0

    for ep, r, i, rel in raw:
        score = (alpha_recency * norm(r, recencies)
                 + alpha_importance * norm(i, importances)
                 + alpha_relevance * norm(rel, relevances))
        scored.append((ep, score))

    return sorted(scored, key=lambda t: -t[1])


# ─────────────────────────── SEMANTIC MEMORY (A-MEM) ───────────────────────────

@dataclass
class SemanticNote:
    """
    A-MEM Zettelkasten-inspired note:
        m_i = {c_i, t_i, K_i, G_i, X_i, e_i, L_i}
    """
    note_id: str
    c: str                                # original content (the fact, e.g., "parallax 2.5D works for photographers")
    t: datetime                           # timestamp
    K: list[str]                          # LLM-generated keywords
    G: list[str]                          # LLM-generated tags
    X: str                                # LLM-generated contextual description
    e: list[float]                        # embedding of concat(c, K, G, X)
    L: list[str]                          # linked note_ids (bidirectional)
    # extras for our domain
    source_episode_ids: list[str] = field(default_factory=list)  # provenance
    confidence: float = 0.5               # updated as more evidence accumulates
    last_evolved: datetime = field(default_factory=datetime.now)
    superseded_by: Optional[str] = None   # if a later note supersedes this one


# ─────────────────────────── PROCEDURAL MEMORY (Voyager-style) ───────────────────────────

@dataclass
class Skill:
    """
    Voyager-style skill: executable code + natural-language description,
    indexed by embedding of the description.
    """
    skill_id: str
    name: str                             # e.g., "parallax_hero_layers"
    description: str                      # natural-language, used for embedding
    description_embedding: list[float]
    code: str                             # the actual generator function (Python/JS)

    # Verification gate (Voyager)
    verified: bool = False
    verification_brief_ids: list[str] = field(default_factory=list)  # held-out briefs it passed on
    verification_audits: dict[str, float] = field(default_factory=list)

    # Composition
    calls: list[str] = field(default_factory=list)  # skill_ids this skill invokes

    # Provenance & telemetry
    source_episode_ids: list[str] = field(default_factory=list)
    use_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    last_used: Optional[datetime] = None

    # Meta-pruning signal
    last_meta_review: Optional[datetime] = None


# ─────────────────────────── NEGATIVE MEMORY (Reflexion-style) ───────────────────────────

@dataclass
class AntiPattern:
    """
    A pattern that consistently fails. Always retrieved for similar briefs.
    """
    antipattern_id: str
    timestamp: datetime
    pattern_description: str              # e.g., "Arquetipo 5 Text 3D for SaaS heroes — too aggressive"
    critique: str                         # Reflexion-style verbal critique
    trigger_context_embedding: list[float]  # embedding of briefs that should fire this anti-pattern
    failing_episode_ids: list[str] = field(default_factory=list)
    failure_count: int = 0
    last_triggered: Optional[datetime] = None


# ─────────────────────────── WORKING MEMORY (MemGPT-style) ───────────────────────────

@dataclass
class WorkingMemory:
    """Per-turn state. Subset is serialized into the LLM prompt."""
    # Inputs
    brief: str
    brief_embedding: list[float]

    # Pinned facts (MemGPT core memory)
    pinned: dict[str, Any] = field(default_factory=dict)  # brand, audience, rejected_directions

    # Current iteration state
    current_code: str = ""
    current_audits: dict[str, float] = field(default_factory=dict)
    iteration: int = 0

    # Retrieved context (assembled before each LLM call)
    retrieved_episodes: list[HeroEpisode] = field(default_factory=list)
    retrieved_skills: list[Skill] = field(default_factory=list)
    retrieved_notes: list[SemanticNote] = field(default_factory=list)
    retrieved_antipatterns: list[AntiPattern] = field(default_factory=list)

    # SPRING-style plan DAG (optional)
    plan_dag: Optional[dict] = None


# ─────────────────────────── CONSOLIDATION RECORD ───────────────────────────

@dataclass
class SleepCycleRecord:
    """Audit trail for the weekly sleep/consolidation pass."""
    cycle_id: str
    start_time: datetime
    end_time: datetime
    phase: str                            # "NREM" or "REM"

    # NREM
    episodes_triaged: int = 0
    episodes_forgotten: int = 0
    semantic_notes_created: list[str] = field(default_factory=list)
    semantic_notes_evolved: list[str] = field(default_factory=list)
    skills_committed: list[str] = field(default_factory=list)
    antipatterns_committed: list[str] = field(default_factory=list)

    # REM
    remixes_proposed: int = 0
    remixes_verified: int = 0
    new_candidate_skills: list[str] = field(default_factory=list)
```

---

## 10. Consolidation "Sleep" Phase Design

Inspired by SCM's NREM/REM distinction and SleepGate's adaptive trigger.

### 10.1 Trigger

Run weekly (Sunday 03:00) **and** adaptively when either:
- New episode count since last sleep ≥ 50, or
- Entropy of recent outcomes (mix of SHIPPED / REJECTED / FAILED) crosses a threshold — indicates the agent is in an unstable regime and would benefit from consolidation.

### 10.2 NREM Phase (Consolidation & Forgetting)

```python
def nrem_phase(episodes_since_last_sleep, semantic_store, skill_store, negative_store):
    # 1. Triage
    triaged = triage_by_importance_recency_retrievals(episodes_since_last_sleep)

    # 2. Reflect → candidate facts
    for cluster in cluster_similar(triaged):
        candidate_facts = llm_reflect(cluster)  # Generative-Agents reflection prompt
        for fact in candidate_facts:
            existing = semantic_store.find_similar(fact, threshold=0.85)
            if existing:
                # A-MEM evolution: rewrite existing note's X, K, G in light of new fact
                semantic_store.evolve(existing, fact, source_episodes=cluster.ids)
            else:
                semantic_store.insert(fact, source_episodes=cluster.ids)

    # 3. Cluster successful episodes → candidate skills (Voyager pattern)
    for cluster in cluster_successful(triaged, min_size=3):
        skill_proposal = llm_propose_skill(cluster)
        if verify_skill(skill_proposal, held_out_briefs):
            skill_store.commit(skill_proposal, source_episodes=cluster.ids)

    # 4. Cluster failed episodes → negative patterns (Reflexion pattern)
    for cluster in cluster_failed(triaged, min_size=2):
        critique = llm_extract_failure_pattern(cluster)
        negative_store.commit(critique, failing_episodes=cluster.ids)

    # 5. Active forgetting (SCM value-based + SleepGate conflict-driven)
    for ep in episodes_since_last_sleep:
        if ep.retrieval_count == 0 and age(ep) > 90_days:
            archive(ep)            # move to cold storage
        if conflicts_with_newer_episode(ep):
            compress_or_evict(ep)  # SleepGate-style
```

### 10.3 REM Phase (Creative Recombination)

```python
def rem_phase(skill_store):
    # Sample 2-3 skills, ask LLM to propose a remix
    seeds = skill_store.sample(n=3, weighted_by="recent_success")
    remix = llm_remix(seeds)
    # Verify on a held-out brief
    if verify_skill(remix, held_out_briefs):
        skill_store.commit(remix, source="REM_recombination", parents=seeds.ids)
```

The REM phase is the agent's "creative drift" — it occasionally invents new skills by recombining existing ones. Most remixes will fail verification; the few that pass expand the skill library into novel territory.

---

## 11. Style Drift and Negative Knowledge

### 11.1 Handling Style Drift

**Problem:** a hero that won Awwwards in 2023 may look dated in 2025. The agent's semantic memory ("big serif typography with grain texture works for editorial") may be stale.

**Three mechanisms, in order of aggressiveness:**

1. **Recency-weighted retrieval** (Generative Agents) — older episodes naturally decay. Newer evidence dominates.
2. **A-MEM evolution** — when a new episode contradicts an old semantic fact, evolution *rewrites* the old fact's contextual description to incorporate the new evidence, rather than leaving both as conflicting facts.
3. **Periodic meta-review** (REM phase, run quarterly) — explicitly ask the LLM: *"Here are 5 semantic facts you currently believe. Given the most recent 50 episodes, which of these should be deprecated?"* Mark deprecated facts with `superseded_by` field; retrieval excludes them.

### 11.2 Negative Knowledge

**Problem:** the agent should not repeatedly try patterns that consistently fail.

**Mechanism (Reflexion-extended):**

Every failed episode produces a Reflexion-style verbal critique appended to `negative_memory`. Critiques are retrieved *always* for similar briefs (high retrieval weight, low decay — negative knowledge should be sticky). A pattern is promoted from "one-off failure" to `AntiPattern` only after ≥2 similar failures, at which point it is also injected into the generation prompt as an explicit "avoid" instruction.

Concrete example:
- Episode #12: Arquetipo 5 Text 3D for a SaaS landing → user rejected ("too aggressive, feels like a game").
- Episode #47: Arquetipo 5 Text 3D for another SaaS → audit flagged readability issues, user rejected.
- → Sleep phase promotes this to an AntiPattern: *"Arquetipo 5 Text 3D for SaaS heroes — too aggressive, readability issues. Prefer Arquetipo 1 or 3 for SaaS."*
- On the next SaaS brief, the AntiPattern is retrieved and injected: *"Avoid: Text 3D hero (see prior failures). Prefer: Arquetipo 1 or 3."*

---

## 12. References and Links

### Foundational Papers

1. **CoALA — Cognitive Architectures for Language Agents** (Sumers, Yao, Narasimhan, Griffiths, 2023/2024)
   - Paper: https://arxiv.org/abs/2309.02427
   - HTML: https://arxiv.org/html/2309.02427v3
   - Repo: https://github.com/ysymyth/awesome-language-agents
   - TMLR camera-ready, 19 pages, 5 figures.

2. **Generative Agents: Interactive Simulacra of Human Behavior** (Park, O'Brien, Cai, Morris, Liang, Bernstein, 2023)
   - Paper: https://arxiv.org/abs/2304.03442
   - HTML (readable): https://ar5iv.labs.arxiv.org/html/2304.03442
   - ACM: https://dl.acm.org/doi/10.1145/3586183.3606763
   - UIST 2023.

3. **Voyager: An Open-Ended Embodied Agent with Large Language Models** (Wang, Xie, Jiang, Mandlekar, Xiao, Zhu, Fan, Anandkumar, 2023)
   - Paper: https://arxiv.org/abs/2305.16291
   - Site: https://voyager.minedojo.org
   - Repo: https://github.com/MineDojo/Voyager
   - NeurIPS 2023.

4. **Reflexion: Language Agents with Verbal Reinforcement Learning** (Shinn, Cassano, Berman, Gopinath, Narasimhan, Yao, 2023)
   - Paper: https://arxiv.org/abs/2303.11366
   - Repo: https://github.com/noahshinn/reflexion
   - NeurIPS 2023.

5. **SPRING: Studying the Paper and Reasoning to Play Games** (Wu, Hu, Shu, Liu, Li, Zhao, Wu, Yue, 2023)
   - Paper: https://arxiv.org/abs/2305.15486
   - NeurIPS 2023.

6. **MemGPT: Towards LLMs as Operating Systems** (Packer, Wooders, Lin, Fang, Patil, Stoica, Gonzalez, 2023)
   - Paper: https://arxiv.org/abs/2310.08560
   - Site: https://memgpt.ai → evolved into Letta: https://github.com/letta-ai/letta

### Recent Memory-System Papers (2024–2025)

7. **A-MEM: Agentic Memory for LLM Agents** (Xu, Liang, Mei, Gao, Tan, Zhang, 2025)
   - Paper: https://arxiv.org/abs/2502.12110
   - System repo: https://github.com/WujiangXu/A-mem-sys
   - Evaluation repo: https://github.com/WujiangXu/A-mem
   - NeurIPS 2025.

8. **Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory** (Dev, Taranjeet et al., 2025)
   - Paper: https://arxiv.org/abs/2504.19413
   - Site: https://mem0.ai
   - ECAI 2025.

9. **SCM: Sleep-Consolidated Memory with Algorithmic Forgetting** (2025)
   - Paper: https://arxiv.org/abs/2604.20943

10. **SleepGate / Learning to Forget: Sleep-Inspired Memory Consolidation for LLMs** (2025)
    - Paper: https://arxiv.org/abs/2603.14517

11. **STALE: Can LLM Agents Know When Their Memories Are No Longer Valid?** (+ CUPMem) (2025)
    - Paper: https://arxiv.org/abs/2605.06527

12. **Integrating Dynamic Human-like Memory Recall and Consolidation in LLM-Based Agents** (Hou, Tamoto, Miyashita, 2024)
    - Paper: https://arxiv.org/abs/2404.00573

13. **How Memory Management Impacts LLM Agents: An Empirical Study** (2025)
    - Paper: https://arxiv.org/abs/2505.16067

14. **Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and …** (2025 survey)
    - Paper: https://arxiv.org/abs/2603.07670

15. **Multiple Memory Systems for Enhancing the Long-term …** (2025)
    - Paper: https://arxiv.org/abs/2508.15294

### Workshops & Community

16. **ICLR 2026 Workshop on Memory for LLM-Based Agentic Systems (MemAgents)**
    - https://iclr.cc/virtual/2026/workshop/10000792

17. **Cognee — Cognitive Architectures for AI Agents (CoALA) Explained**
    - https://www.cognee.ai/blog/fundamentals/cognitive-architectures-for-language-agents-explained

18. **Letta Blog — Benchmarking AI Agent Memory: Is a Filesystem All You Need?**
    - https://www.letta.com/blog/benchmarking-ai-agent-memory

19. **Mem0 Blog — State of AI Agent Memory 2026**
    - https://mem0.ai/blog/state-of-ai-agent-memory-2026

---

## Appendix: Synthesis Answers to the Original Synthesis Questions

**1. Can we combine episodic (raw iteration logs) + semantic (extracted patterns) memory?**
Yes — and we should. Episodic is append-only, low-friction, never-edited. Semantic is curated, evolved, occasionally deprecated. The bridge is the weekly consolidation pass: episodes are clustered → reflected into candidate facts → facts either inserted as new semantic notes or used to *evolve* existing notes (A-MEM pattern). At inference time, both are retrieved: episodes give the LLM concrete prior examples; semantic notes give it generalized principles.

**2. How to extract "skills" from creative work?**
Cluster successful episodes by brief-similarity (e.g., all photographer-portfolio heroes that shipped). When a cluster reaches ≥3 episodes, propose a skill: ask the LLM *"Given these 3 successful heroes, write a reusable Python function that generates the common component, parameterized by accent_color, layer_count, etc."* Verify the skill by running it on a held-out brief and checking audits. If it passes, commit to the procedural skill library. The skill's natural-language description (e.g., *"Generate a multi-layer parallax hero with optional accent color, suited to photography and editorial portfolios"*) is the retrieval key.

**3. Should our system have a "sleep" phase that processes past sessions into generalized knowledge?**
Yes. SCM and SleepGate provide the theoretical foundation; A-MEM's memory evolution provides the per-note update mechanism. Weekly NREM phase: triage, reflect, evolve, forget. Weekly REM phase: recombine 2-3 random skills and verify on held-out briefs (the creative-drift engine). The sleep phase is what makes the agent *improve without user interaction* — every Monday morning it is marginally better than Friday evening.

**4. How to handle style drift (what worked 6 months ago may not work now)?**
Three layers: (a) recency decay in retrieval naturally down-weights old episodes; (b) A-MEM evolution rewrites old semantic facts when new evidence contradicts them; (c) quarterly meta-review explicitly deprecates stale facts. Additionally, the REM phase's remix proposals bias the skill library toward novel combinations, preventing the agent from fossilizing around a 2023 aesthetic.

**5. What about negative knowledge — patterns that consistently fail?**
First failure: Reflexion-style critique appended to the episode. Second similar failure: promote to `AntiPattern` with explicit trigger-context embedding. AntiPatterns are retrieved *always* for similar briefs (no decay — negative knowledge should be sticky) and injected into the generation prompt as explicit "avoid" instructions. AntiPatterns can themselves be deprecated if a later successful episode shows the pattern was wrong *for that specific context* but right in another (the A-MEM evolution pattern, applied to negative memory).

---

*End of report. ~4,800 words.*
