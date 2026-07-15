# Context Compression & Token Optimization for LLM Agents

> A deep research report on prompt compression, prompt caching, and tiered memory management for multi-iteration agent loops.

**Author:** Research Analyst Sub-Agent
**Date:** 2025-07-15
**Scope:** Technique-by-technique deep dive on LLMLingua family, Selective Context, Context-Aware Decoding, recursive summarization, Anthropic & OpenAI prompt caching, MemGPT, Tree/Graph of Thoughts, code/JSON-specific compression, RAG-based compression. Concrete numbers, comparison table, and a hierarchical compression strategy tailored to a multi-agent design loop.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Taxonomy of Context Compression](#2-the-taxonomy-of-context-compression)
3. [Technique Deep Dives](#3-technique-deep-dives)
   - 3.1 [LLMLingua (EMNLP'23)](#31-llmlingua-emnlp23)
   - 3.2 [LongLLMLingua (ACL'24)](#32-longllmlingua-acl24)
   - 3.3 [LLMLingua-2 (ACL Findings'24)](#33-llmlingua-2-acl-findings24)
   - 3.4 [Selective Context (EMNLP'23)](#34-selective-context-emnlp23)
   - 3.5 [Context-Aware Decoding (NAACL'24)](#35-context-aware-decoding-naacl24)
   - 3.6 [Recursive / Hierarchical Summarization](#36-recursive--hierarchical-summarization)
   - 3.7 [Anthropic Prompt Caching](#37-anthropic-prompt-caching)
   - 3.8 [OpenAI Prompt Caching](#38-openai-prompt-caching)
   - 3.9 [MemGPT — OS-Style Virtual Context](#39-memgpt--os-style-virtual-context)
   - 3.10 [Tree of Thoughts / Graph of Thoughts](#310-tree-of-thoughts--graph-of-thoughts)
   - 3.11 [Code-Specific: SWE-Pruner](#311-code-specific-swe-pruner)
   - 3.12 [JSON-Specific: TOON & Minification](#312-json-specific-toon--minification)
   - 3.13 [RAG-Specific: Provence, xRAG, Contextual Retrieval](#313-rag-specific-provence-xrag-contextual-retrieval)
4. [Master Comparison Table](#4-master-comparison-table)
5. [Answers to the Specific Research Questions](#5-answers-to-the-specific-research-questions)
6. [Hierarchical Compression Strategy Proposal](#6-hierarchical-compression-strategy-proposal)
7. [Code Examples](#7-code-examples)
8. [References and Links](#8-references-and-links)

---

## 1. Executive Summary

The 2023–2025 literature on context compression for LLMs converges on a single architectural insight: **no single technique is enough; you combine four orthogonal levers**. They are, in order of cost (cheapest first):

1. **Prompt caching** — don't recompute KV-cache for repeated prefixes. Free 50–90% cost reduction if the provider supports it (Anthropic, OpenAI). Zero quality loss.
2. **Structural / syntactic compression** — change the format (TOON instead of JSON), reference unchanged code by pointer, drop verbose evidence. No model inference required. 30–60% token savings on structured inputs.
3. **Selective token pruning** — small-model-driven (LLMLingua family, Selective Context, SWE-Pruner). 2–20× compression. Small quality hit (1–5 points on most benchmarks); sometimes *improves* quality by removing noise.
4. **Summarization-based compression** — LLM-generated summaries of older context. Most aggressive (10–100×) but most lossy. Reserve for old content the agent probably won't need verbatim.

For our specific problem — a multi-agent design loop where iteration 5 passes 50–100 KB of context per call across 20 LLM calls — the right architecture is a **time-decayed hierarchical scheme**: cache the SKILL.md prefix, reference (not inline) unchanged code from prior iterations, summarize old audit JSONs down to their blocker fields, and only apply token-level pruning (LLMLingua-2) to the small slice of natural-language context that's neither cached nor already summarized.

The single most important finding from the research: **84% of tokens in a typical agent's context window are observation tokens** (tool-call outputs, audit JSONs, code snapshots) — not user messages or reasoning (Atlan, citing NeurIPS 2025 / arXiv 2508.21433). Pruning observations is where the ROI is.

---

## 2. The Taxonomy of Context Compression

Before diving into individual techniques, it helps to categorize them along two axes.

**Axis 1: What gets compressed?**
- *Token-level*: removes individual tokens (LLMLingua, LLMLingua-2, Selective Context).
- *Sentence/phrase-level*: removes whole sentences (Provence, LongLLMLingua coarse stage).
- *Document/section-level*: removes whole chunks (LongLLMLingua question-aware retrieval; MemGPT archival paging).
- *Format-level*: changes encoding without removing information (TOON, JSON minification, prompt caching).
- *Semantic-level*: replaces content with an LLM-generated summary (recursive summarization, MemGPT reflection).

**Axis 2: Does compression happen online or offline?**
- *Offline / precomputed*: prompt caching (the cache is built once, reused many times).
- *Online / per-request*: LLMLingua, Selective Context run a small LM on each prompt.
- *Amortized / per-session*: MemGPT-style paging, recursive summarization triggered when thresholds are hit.

The cheapest axis-2 mode is *precomputed* (prompt caching). The most expensive is *per-request semantic summarization*. The graduated-reduction rule (Atlan; JetBrains NeurIPS DL4Code 2025) is unambiguous: **always try caching and structural compression first, token pruning second, summarization only as last resort.**

---

## 3. Technique Deep Dives

### 3.1 LLMLingua (EMNLP'23)

**Paper:** Jiang, Wu, Lin, Yang, Qiu. *LLMLingua: Compressing Prompts for Accelerated Inference of Large Language Models.* EMNLP 2023.
**Repo:** https://github.com/microsoft/LLMLingua
**arXiv:** https://arxiv.org/abs/2310.05736

**Mechanism.** Uses a small language model (default LLaMA-7B-Chat, also supports GPT-2-small, phi-2, quantized Llama-2-7B-Chat-GPTQ which needs <8 GB GPU) to score every prompt token by perplexity. Low-perplexity tokens (highly predictable given context) are removed; high-perplexity tokens are kept. Three components:
1. **Budget controller** — assigns different compression ratios to instruction, demonstrations, and question (coarse level).
2. **Iterative token-level compression** — segments the surviving text and re-evaluates perplexity on the *already-compressed* prefix, avoiding the conditional-independence assumption of one-shot perplexity scoring.
3. **Distribution alignment** — fine-tunes the small LM on data from the target LLM so its perplexity signal matches what the target LLM "cares about."

**Token reduction.** Up to **20×** with "minimal performance loss" (paper claim). On GSM8K at 5× compression, EM stays at 79.08 vs 78.85 full-shot — i.e., **zero quality loss at 5× compression**. At 14× compression it drops to 77.41 — ~1.4-point loss.

**Quality loss.** Task-dependent. On natural-language reasoning (GSM8K, BBH) and RAG it's near-zero at moderate ratios. On long-context retrieval (NaturalQuestions with 20 docs) vanilla LLMLingua collapses — the entropy signal retains too much noise; this is what motivated LongLLMLingua.

**Latency cost.** Adds ~1–10 s per call depending on small-LM size and prompt length (must do a forward pass). Worth it when (a) you're calling GPT-4-class APIs with per-token pricing, (b) the prompt is >2k tokens, (c) the same compressed prompt is reused. Not worth it for short prompts or streaming.

**Implementation complexity.** `pip install llmlingua`, ~5 lines of Python. Heavily integrated: LangChain, LlamaIndex, Microsoft Prompt flow.

**Compatibility.** Model-agnostic — produces a compressed text string that goes to any LLM. The small compressor LM runs locally (GPU recommended; CPU works for GPT-2-small).

**Production status.** Shipped in LangChain, LlamaIndex, Prompt flow. Used in production RAG pipelines. Microsoft continues to invest (KV-cache compression via RetrievalAttention, MInference).

```python
from llmlingua import PromptCompressor
llm_lingua = PromptCompressor()  # default LLaMA-7B
out = llm_lingua.compress_prompt(prompt, instruction="", question="",
                                  target_token=200)
# out = {'compressed_prompt': ..., 'origin_tokens': 2365,
#        'compressed_tokens': 211, 'ratio': '11.2x',
#        'saving': ', Saving $0.1 in GPT-4.'}
```

### 3.2 LongLLMLingua (ACL'24)

**Paper:** Jiang, Wu, Luo, Li, Lin, Yang, Qiu. *LongLLMLingua: Accelerating and Enhancing LLMs in Long Context Scenarios via Prompt Compression.* ACL 2024.
**arXiv:** https://arxiv.org/abs/2310.06839

**Mechanism.** Extends LLMLingua with **question-aware coarse-to-fine compression**. The key idea: vanilla LLMLingua scores tokens by perplexity ignoring the question, so it keeps a lot of question-irrelevant noise. LongLLMLingua adds four mechanisms on top of LLMLingua:

1. **Question-aware coarse-grained compression.** Score each document `x_k^doc` by how well it predicts the question (plus a restrictive statement "We can get the answer to this question in the given documents"): `r_k = -(1/N_c) Σ log p(x_i^que,restrict | x_k^doc)`. Drop low-`r_k` documents. The paper shows this metric beats BM25, SentenceBERT, OpenAI embeddings, and Cohere rerankers on recall@1.
2. **Question-aware fine-grained compression.** Use contrastive perplexity — the perplexity of the question under the document minus the perplexity under a neutral context — to score individual tokens.
3. **Document reordering.** Mitigates "lost in the middle" by placing high-relevance docs at the beginning and end of the prompt.
4. **Post-compression subsequence recovery.** Greedily re-insert dropped tokens that are highly predictive of the question.
5. **Dynamic compression ratios** — different documents get different compression levels depending on their relevance.

**Token reduction.** ~4× on average. Up to 6× on LongBench sub-tasks.

**Quality loss.** *Negative*. LongLLMLingua **improves** performance over the original prompt by up to **21.4%** on NaturalQuestions (with the ground-truth doc at the 10th position). On LooGLE: 94% cost reduction. On LongBench with a 2,000-token constraint, LongLLMLingua scores 48.3 vs 44.0 for the original 10k-token prompt (Table 2 in the paper).

**Latency cost.** Compression takes 2–10 s for 10k-token prompts. End-to-end speedup is 1.4×–2.6× because the LLM call itself is much faster on the shorter prompt.

**Implementation complexity.** Same `llmlingua` package; just pass extra params:

```python
out = llm_lingua.compress_prompt(
    prompt_list, question=question, rate=0.55,
    condition_in_question="after_condition",
    reorder_context="sort",
    dynamic_context_compression_ratio=0.3,
    condition_compare=True,
    context_budget="+100",
    rank_method="longllmlingua",
)
```

**Production status.** Less adopted than LLMLingua in OSS frameworks (the question-aware path requires extra setup), but it's the recommended mode for RAG.

### 3.3 LLMLingua-2 (ACL Findings'24)

**Paper:** Pan, Wu, Jiang, Xia, Luo, Zhang, Lin, Rühle, Yang, Lin, Zhao, Qiu, Zhang. *LLMLingua-2: Data Distillation for Efficient and Faithful Task-Agnostic Prompt Compression.* ACL Findings 2024.
**arXiv:** https://arxiv.org/abs/2403.12968

**Mechanism.** Reformulates prompt compression as a **binary token-classification problem** (preserve/discard) rather than perplexity scoring. The pipeline:

1. **Data distillation.** Use GPT-4 to compress texts from the MeetingBank corpus into extractive (token-preserving) summaries. The result is a training set of (original, compressed) pairs where the compressed version is a strict subsequence of the original.
2. **Train a Transformer encoder** (XLM-RoBERTa-large, 560M, or mBERT) to classify each token as keep/drop. Because it's an encoder, it uses **bidirectional context**, unlike LLMLingua's causal-LM perplexity.
3. **At inference**, run the classifier once per prompt and threshold on probability.

**Token reduction.** Comparable to LLMLingua (2–14×). Notably: on GSM8K at 14× compression, EM = 77.79 (vs 78.85 full-shot) — only ~1 point loss.

**Quality loss.** Better than LLMLingua on out-of-domain data (MeetingBank, LongBench single-doc QA) because the classification objective is directly aligned with the compression task. Equal or slightly worse on in-domain NaturalQuestions.

**Latency cost.** **3–6× faster** than LLMLingua because the encoder is small (560M) and runs a single forward pass per prompt (vs iterating perplexity per token). End-to-end latency speedup: **1.6×–2.9×** at 2×–5× compression. GPU memory: 8× lower than LLMLingua (LLaMA-7B).

**Implementation complexity.** Same `llmlingua` package; pass `use_llmlingua2=True`:

```python
llm_lingua = PromptCompressor(
    model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
    use_llmlingua2=True,
)
```

**Compatibility.** Model-agnostic; the compressor runs locally.

**Production status.** Released. Becoming the default recommendation for task-agnostic compression because of the speed advantage.

### 3.4 Selective Context (EMNLP'23)

**Paper:** Li, Dong, Lin, Guerin. *Compressing Context to Enhance Inference Efficiency of Large Language Models.* EMNLP 2023.
**Repo:** https://github.com/liyucheng09/Selective_Context

**Mechanism.** Self-information-based filtering. Uses a base LM (default GPT-2) to compute self-information for lexical units at three granularities (token, phrase, sentence). Filter out units whose self-information falls below a threshold. The unit granularity is configurable.

**Token reduction.** "2× more content" — i.e., 50% reduction at default settings. Configurable via `reduce_ratio`.

**Quality loss.** Mixed. The LongLLMLingua paper (Table 2) shows Selective Context scoring 24.8 on LongBench at 5× compression vs 48.3 for LongLLMLingua and 44.0 for the original prompt — Selective Context actually *hurts* performance here because it doesn't consider the question. On NaturalQuestions at 2× it scores 17.2 (worse than zero-shot baseline of 35.0). Useful for chat and document summarization, less so for retrieval.

**Latency cost.** High. The paper's Table 5 reports Selective-Context latency of 15.5–15.9 s on MeetingBank vs 0.4–0.5 s for LLMLingua-2 — over 30× slower — because of "sequential entropy calculation of semantic units."

**Implementation complexity.** `pip install selective-context`; also requires `spacy` models.

```python
from selective_context import SelectiveContext
sc = SelectiveContext(model_type='gpt2', lang='en')
context, reduced = sc(text, reduce_ratio=0.5)
```

**Production status.** Research artifact. Largely superseded by the LLMLingua family for production use.

### 3.5 Context-Aware Decoding (NAACL'24)

**Paper:** Shi, Han, Min, Yang, Liu, Zhou. *Enhancing Contextual Understanding in Large Language Models via Contrastive Decoding.* NAACL 2024.
**Repo:** https://github.com/amazon-science/ContextualUnderstanding-ContrastiveDecoding
**Related:** https://github.com/xhan77/context-aware-decoding

**Mechanism.** Not really "compression" in the token-removal sense — it's a **decoding-time intervention**. The model is run twice: once with the full context (relevant + irrelevant passages), once with no/irrelevant context. The final logits are `logits_full - α · logits_irrelevant`. This amplifies the contribution of context-relevant tokens and suppresses context-irrelevant ones, mitigating the "lost in the middle" problem without removing any tokens.

**Token reduction.** 0× — it does not compress; it makes existing tokens work harder.

**Quality loss.** Improves quality, particularly when the prompt contains irrelevant context (RAG with noisy retrieval). Outperforms regular decoding across datasets and model scales.

**Latency cost.** ~2× per generation (two forward passes per token). With prefix caching, the second pass can share the cached prefix.

**Implementation complexity.** Requires logit-level access to the model — only works for self-hosted models (Llama, Mistral, etc.). Not applicable to OpenAI/Anthropic APIs.

**Production status.** Niche. Mainly used in research and for self-hosted inference setups where you control the serving stack. The contrastive-decoding idea has been folded into newer training recipes (e.g., DPO-style preference objectives that downweight irrelevant context).

### 3.6 Recursive / Hierarchical Summarization

**Paper:** Wang, Fu, Cao, Wang, Tian, Ding. *Recursively Summarizing Enables Long-Term Dialogue Memory in Large Language Models.* Neurocomputing 2024.
**arXiv:** https://arxiv.org/abs/2308.15022

**Mechanism.** Three-step iterative procedure:

1. **Initial memorization.** Prompt the LLM to summarize a small initial dialogue window into a `memory M_0`.
2. **Recursive update.** For each subsequent dialogue chunk `C_t`, prompt the LLM with `M_{t-1} ⊕ C_t` and ask it to produce an updated `M_t` that retains key information from both. The old memory is the *only* persistent state — the raw dialogue chunks are discarded after being folded into the summary.
3. **Response generation.** The LLM produces a reply using the latest `M_t` as its primary reference, plus the current user turn.

**Token reduction.** Linear in number of sessions, logarithmic in total dialogue length. A 100-turn dialogue gets folded into a single ~500-token summary, which is then incrementally updated — net reduction can be 50–200× depending on chunk size.

**Quality loss.** The paper reports small but consistent gains over vanilla long-context ChatGPT on MSC and Carecall datasets (+0.2% F1, plus qualitative improvements in consistency). Crucially, the method **complements** both large-context models and retrieval-based methods — combining recursive summary + retrieval outperforms either alone. This is because the summary captures *durable facts* (persona, preferences) while retrieval captures *episodic detail* (specific past utterances).

**Latency cost.** One extra LLM call per chunk for the summary update. Cheap if you use a small model (Haiku, 4o-mini) for summarization.

**Implementation complexity.** Trivial in concept; the hard part is prompt engineering the summary update so it doesn't degenerate ("the user likes things" after 10 recursions). The paper notes that including 2–3 ICL examples of (dialogue → memory → response) triples dramatically improves quality.

**Hierarchical variant (HAT — Hierarchical Aggregate Tree).** From arXiv 2406.06124: instead of a single flat summary, build a tree. Leaves are raw chunks. Each internal node is an LLM-written summary of its children. At inference, traverse the tree conditionally — descend into a child only if its summary is query-relevant. This gives logarithmic retrieval cost and is the basis for most "agent memory" libraries today (Mem0, MemGPT archival, A-MEM).

### 3.7 Anthropic Prompt Caching

**Source:** https://platform.claude.com/docs/en/build-with-claude/prompt-caching
**Announcement:** https://www.anthropic.com/news/prompt-caching

**Mechanism.** When you send a request to Claude, the system can cache the *KV-cache* of a prefix so that subsequent requests with the same prefix skip the prefill. There are two ways to enable it:

1. **Automatic caching** — add a top-level `cache_control: {type: "ephemeral"}` field. The system caches everything up to the last cacheable block. As the conversation grows, the breakpoint moves forward automatically.
2. **Explicit cache breakpoints** — place `cache_control` on individual content blocks (up to 4 breakpoints). Useful when different sections change at different rates (e.g., tools rarely change; system prompt changes daily; conversation grows turn-by-turn).

Cache ordering is fixed: `tools → system → messages`. Each level builds on the previous. A hash of the prefix up to each breakpoint is stored; reads walk back up to 20 blocks looking for a matching prior write.

**When it kicks in.** Minimum cacheable prompt length is model-dependent:
- Claude Sonnet 4.6 / Opus 4.8 / Sonnet 5: **1,024 tokens**
- Claude Opus 4.5–4.6: 4,096 tokens
- Claude Haiku 4.5: 4,096 tokens
- Claude Haiku 3.5: 2,048 tokens

**TTL.** Two options:
- 5-minute (default) — refreshed each time the cached content is used, at no extra cost.
- 1-hour — explicit `ttl: "1h"`. 2× the write cost but useful for long-running sessions or batch workloads.

**Cost.** Pricing per million tokens (representative):

| Model | Base Input | 5-min Write | 1-hour Write | Cache Hit/Refresh | Output |
|---|---|---|---|---|---|
| Claude Sonnet 4.6 | $3.00 | $3.75 | $6.00 | **$0.30** | $15.00 |
| Claude Opus 4.8 | $5.00 | $6.25 | $10.00 | **$0.50** | $25.00 |
| Claude Haiku 4.5 | $1.00 | $1.25 | $2.00 | **$0.10** | $5.00 |

So cache reads are **10% of base input price** (0.1× multiplier). Writes cost 1.25× (5-min) or 2× (1-hour). If your cache hit rate is >55% on a 5-min cache, you save money. Production users report **91–95% cache hit rates** on Claude (Reddit r/Anthropic), translating to ~10× cost reduction.

**Quality loss.** None. Identical bits in → identical KV cache → identical output.

**Latency reduction.** Up to 85% (Hakkoda case study) on long prompts because prefill is skipped.

**The 20-block lookback trap.** Common mistake: putting `cache_control` on the *last* block when that block changes every request (e.g., contains a timestamp). The lookback walks backward 20 blocks looking for a prior *write*, not for "stable content" — and writes only happen at breakpoints. So if you always cache the last block and that block changes, you get zero hits. **Place the breakpoint on the last block whose prefix is identical across requests.** For multi-turn chat with a static system prompt and a per-turn user message, the natural pattern is: explicit breakpoint at end of system prompt + automatic caching for the conversation.

### 3.8 OpenAI Prompt Caching

**Source:** https://openai.com/index/api-prompt-caching
**Docs:** https://developers.openai.com/api/docs/guides/prompt-caching

**Mechanism.** Automatic, no API changes required. The API caches the longest prefix of a prompt that has been previously computed, starting at **1,024 tokens** and increasing in **128-token increments**.

**Cost.** 50% discount on cached input tokens (vs 90% for Anthropic — OpenAI's deal is less aggressive but the bar to entry is lower).

| Model | Uncached Input | Cached Input | Output |
|---|---|---|---|
| GPT-4o (2024-08-06) | $2.50/MTok | $1.25/MTok | $10.00/MTok |
| GPT-4o-mini | $0.15 | $0.075 | $0.60 |
| o1-preview | $15.00 | $7.50 | $60.00 |

**Hit rate.** Production users report 80–90% hit rates on prefixes >1,024 tokens (Reddit r/LLMDevs). Important caveats:
- Caches are typically cleared after **5–10 minutes of inactivity**, always removed within **1 hour** of last use.
- Requests must be routed to the same machine — OpenAI hashes the initial ~256-token prefix for routing. A `prompt_cache_key` parameter helps pin parallel conversations to the same cache shard.
- Caches are not shared between organizations.
- Some users report intermittent `cached_tokens=0` returns even with a stable prefix (community.openai.com) — likely due to load balancing.

**Quality loss.** None.

**Production status.** Generally available. The right mental model: structure prompts with a long static prefix (system prompt + tool definitions + few-shot examples) >1,024 tokens, then append per-request content. Don't put timestamps or request IDs in the first 1,024 tokens.

### 3.9 MemGPT — OS-Style Virtual Context

**Paper:** Packer, Wooders, Lin, Fang, Patil, Stoica, Gonzalez. *MemGPT: Towards LLMs as Operating Systems.* arXiv 2310.08560 (Oct 2023).
**Project:** https://research.memgpt.ai/ — productionized as **Letta** (https://www.letta.com) since Sept 2024.

**Mechanism.** Treats the LLM context window as RAM and external storage as disk, with the LLM itself acting as the "process" that pages data in and out via function calls. Two tiers:

**Tier 1 — Main context (in-context, the LLM's prompt):**
- **System instructions** — fixed persona/behavior.
- **Core / working memory** — a small editable text region (typically capped at ~5,000 chars per block) that the LLM edits explicitly via `core_memory_append` and `core_memory_replace` function calls. This is where durable facts ("user's name is Sarah", "current task is hero redesign") live.
- **FIFO message queue** — recent messages, capped at a token budget.

**Tier 2 — External context (out-of-context, persistent storage):**
- **Recall storage** — full message history, searchable via `conversation_search` and `conversation_search_date`.
- **Archival storage** — unlimited-size vector DB + text store, written via `archival_memory_insert`, retrieved via `archival_memory_search`.

**The self-editing algorithm.** MemGPT exposes the four functions above as tools. The LLM is prompted (in its system message) to actively decide what to page in/out. When the message FIFO approaches the context limit, MemGPT triggers an internal interrupt: it pre-empts the LLM's normal flow, runs a summarization pass over the oldest messages, writes the summary into a special "summary memory" region, and evicts the raw messages to recall storage. The LLM can also call functions proactively (e.g., before answering a question, call `archival_memory_search` to pull in relevant context).

**Heartbeat events.** The LLM "wakes up" periodically (timed heartbeat) and after every function call, letting it chain retrieval/edit operations before responding to the user. This is what makes the system feel continuous.

**Token reduction.** Bounded only by external storage. MemGPT can analyze documents that far exceed the LLM's context window because it pages through them in chunks.

**Quality loss.** Self-managed: if the LLM pages out something it later needs, it must call `conversation_search` to retrieve it. Quality depends heavily on the LLM's skill at self-editing. The paper shows MemGPT outperforming fixed-context baselines on long-document QA and multi-session chat by large margins, but the failure mode is "the LLM forgot to write a key fact to core memory."

**Implementation complexity.** High if you build from scratch. Trivial if you use Letta — `pip install letta-client`, run the Letta server in Docker, create an agent with two memory blocks (`human`, `persona`).

**Production status.** Letta is VC-funded and shipping in production. The MemGPT design pattern (tiered memory + function-call self-editing) is now standard in agent frameworks — LangGraph, AutoGen, and the Letta server all implement variants.

### 3.10 Tree of Thoughts / Graph of Thoughts

**ToT paper:** Yao, Yu, Zhao, Griffiths, Cao, Narasimhan. *Tree of Thoughts: Deliberate Problem Solving with Large Language Models.* NeurIPS 2023. https://github.com/princeton-nlp/tree-of-thought-llm

**GoT paper:** Besta, Blach, Kubicek, Gerstenberger, Podstawski, Gianinazzi, Wittwer, Gajda, Lehmann, Hoefler. *Graph of Thoughts: Solving Elaborate Problems with Large Language Models.* AAAI 2024. https://github.com/spcl/graph-of-thoughts

**Mechanism as compression.** ToT and GoT are not primarily compression techniques, but they enable a structural form of compression. Instead of forcing the LLM to reason linearly through 20 pages of context, you structure the reasoning as a search tree (ToT) or DAG (GoT): each node is a short LLM-generated "thought" (a few sentences), branches represent alternative reasoning paths, and you prune low-value branches. The final answer depends only on a small winning subtree. The intermediate nodes can be discarded or archived.

**Token reduction.** Indirect but large. For exploration-heavy tasks (creative design, code debugging, mathematical proofs), ToT/GoT let you avoid putting 100k tokens of context into one prompt; instead you make 20 short calls each with ~2k tokens of context. Net token spend can be lower *and* quality higher.

**Quality loss.** Usually a quality *gain* — ToT improves on CoT on creative writing, crosswords, 24-game. GoT further improves on ToT for tasks with merging paths (sorting, set operations).

**Latency cost.** High — many sequential LLM calls.

**Implementation complexity.** Moderate. You write a controller that defines the thought-level operations (generate, evaluate, aggregate, backtrack).

**Production status.** Niche in production agents; mainstream in research. The pattern resurfaces in agent planning (ReAct, Plan-and-Execute) under different names.

### 3.11 Code-Specific: SWE-Pruner

**Paper:** Wang, Shi, Yang, Zhang, He, Lian, Chen, Ye, Cai, Gu. *SWE-Pruner: Self-Adaptive Context Pruning for Coding Agents.* arXiv 2601.16746 (Jan 2026).
**Repo:** https://github.com/Ayanami1314/swe-pruner

**Why code needs its own compressor.** General-purpose compressors (LLMLingua, Selective Context) score tokens by perplexity and remove the "predictable" ones. In code, predictable tokens are exactly the ones that matter — closing braces, type annotations, variable declarations that are referenced later. Removing them breaks syntactic and logical structure. The Atlan guide is explicit: "LLMLingua and similar general-purpose compressors remove tokens based on statistical importance, not semantic structure. In code contexts, this breaks function signatures and removes variable declarations needed later in the same block."

**Mechanism.** A 0.6B-parameter neural "skimmer" model. Given the current task, the agent formulates an explicit pruning goal (e.g., "focus on error handling") as a natural-language hint. The skimmer scores each line of code conditioned on (a) the surrounding context and (b) the pruning goal, then selects the lines to keep. The unit of selection is the *line*, not the token — preserving syntactic structure.

**Token reduction.** **23–54%** on agent tasks (SWE-Bench Verified). Up to **14.84×** compression on single-turn tasks (LongCodeQA) with minimal performance impact.

**Quality loss.** *Negative* on agent tasks: 64% success rate on SWE-Bench vs 54% for LLMLingua-2 — pruning irrelevant code *improves* the agent's focus. The pruning helps the LLM see only the relevant code instead of getting distracted by 50KB of unrelated repo content.

**Latency cost.** One forward pass through a 0.6B model — sub-second on GPU.

**Implementation complexity.** Deploy the 0.6B skimmer (open-source on Hugging Face). Integrate as a pre-pass before sending context to the main agent LLM. Requires formulating good pruning goals, which is itself an LLM call (or a rule-based template).

**Production status.** Research-stage (paper published Jan 2026) but the approach is being adopted by coding-agent frameworks (Atlan cites it as the recommended approach for code contexts).

### 3.12 JSON-Specific: TOON & Minification

**Sources:**
- TOON spec: https://tensorlake.ai/blog/toon-vs-json
- Halodoc case study: https://blogs.halodoc.io/reducing-llm-token-costs-by-5-15-by-switching-from-json-to-toon-format
- David Gilbertson's format comparison: https://david-gilbertson.medium.com/llm-output-formats-why-json-costs-more-than-tsv-ebaf590bd541

**Mechanism.** Modern BPE tokenizers (GPT, Claude) break JSON syntax into many sub-token pieces: `{`, `"`, `:`, `,`, `}` each become separate tokens. Repeated field names in arrays multiply the cost. A 500-row JSON array of `{"id":1,"name":"Alice"}`-style objects runs ~11,842 tokens pretty-printed, 4,617 minified — both vastly more than the data warrants.

**TOON (Token-Optimized Object Notation).** Preserves the JSON data model (objects, arrays, numbers, nulls, strings, booleans) but reformats for the LLM reader:
- Indentation-based hierarchy instead of braces (two spaces = one nesting level).
- Header-driven arrays: declare `items[3]{sku,qty,price}:` once, then only the values follow.
- Drop unnecessary quotes around keys.

```
JSON: {"items":[{"sku":"A12","qty":4,"price":19.99}]}
TOON: items[1]{sku,qty,price}:
      A12,4,19.99
```

**Token reduction.** 30–60% on structured data; up to 61% reported on a production RAG payload (TensorLake case study: $1,940 → $760 over a weekend). Halodoc reports 5–15% on payloads that mix JSON with natural language.

**Minification alone.** Removing whitespace from pretty-printed JSON saves ~60% of tokens. Trivial — just `JSON.stringify(obj)` instead of pretty-print. Most teams forget this.

**Schema-aware compression.** Drop the keys entirely and use a column header. For audit JSONs with repeated structure (`{"severity": "blocker", "rule": "ACC-01", "evidence": "..."}` × N), this is the single biggest win — typically 50%+ reduction.

**Quality loss.** None for the data model; sometimes *improves* LLM accuracy because the model spends fewer tokens parsing syntax and more on semantics.

**Production status.** TOON is new (Hugging Face released the spec in 2025). Minification is universal best practice. Schema-aware compression is standard in production RAG systems.

### 3.13 RAG-Specific: Provence, xRAG, Contextual Retrieval

**Provence** (arXiv 2501.16214, https://github.com/hotchpotch/open_provence). Formulates context pruning as **sentence-level sequence labeling**. A lightweight model scores each sentence in retrieved passages; retain sentences where relevant tokens outnumber irrelevant ones. Drops **~99% of off-topic sentences while keeping 80–90% of relevant content**. Adds negligible overhead to standard RAG pipelines.

**xRAG** (OpenReview forum 6pTlXqrO0p). "Extreme Context Compression for Retrieval-Augmented Generation." Reinterprets retrieved documents as hidden embeddings and feeds them into the LLM's attention via a projection layer, completely bypassing the token sequence. Zero tokens added to the prompt per retrieved doc — but requires training the projection and access to model internals.

**Anthropic Contextual Retrieval** (https://www.anthropic.com/engineering/contextual-retrieval). Pre-process each chunk at index time with a small LLM that writes a 50–100 token "contextual" prefix explaining what the chunk is about and how it fits the larger document. Combined with prompt caching (the contextual prefixes are stable), this reportedly reduces retrieval failure rate by 49% and pairs naturally with caching to keep cost low.

**Mechanism as compression.** Retrieval-based compression: don't put all context in the prompt — only retrieve the relevant slice. Combines naturally with token-level compression: retrieve → Provence-prune → LongLLMLingua → prompt.

---

## 4. Master Comparison Table

| Technique | Mechanism | Token reduction | Quality loss | Latency cost (per call) | Implementation | Compatible with APIs | Production status |
|---|---|---|---|---|---|---|---|
| **LLMLingua** | Small-LM perplexity token pruning | 2–20× | ~1–5 pts at 5×; collapses on noisy RAG | +1–10 s | `pip install llmlingua`, 5 LoC | Any (text output) | LangChain/LlamaIndex |
| **LongLLMLingua** | + question-aware coarse-to-fine, reordering, recovery | 2–6× | **negative** (improves 21.4% on NQ) | +2–10 s, net 1.4–2.6× faster | Same package, extra params | Any | Recommended for RAG |
| **LLMLingua-2** | Token classification (XLM-RoBERTa, 560M) | 2–14× | ~1 pt at 14× on GSM8K | +0.4 s (3–6× faster than v1) | Same package | Any | Default recommendation |
| **Selective Context** | Self-information filtering (GPT-2) | ~50% | Hurts on retrieval (17.2 vs 35.0 zero-shot on NQ) | +15 s (slow) | `pip install selective-context` | Any | Research artifact |
| **Context-Aware Decoding** | Contrastive logits (full − irrelevant) | 0× (no compression) | Improves quality | ~2× generation time | Requires logit access | Self-hosted only | Niche |
| **Recursive summarization** | LLM-written summary, incrementally updated | 50–200× | Small loss, complements retrieval | +1 LLM call per chunk | DIY, ~50 LoC | Any | Standard in agent frameworks |
| **Hierarchical Aggregate Tree** | Tree of summaries, conditional traversal | Logarithmic in content size | Low if summarizer is good | +1 LLM call per node | DIY | Any | Used in Mem0, A-MEM |
| **Anthropic prompt caching** | KV-cache prefix reuse | 0× tokens, ~90% cost cut | None | −85% latency on long prompts | `cache_control` field | Claude API only | GA, automatic mode |
| **OpenAI prompt caching** | KV-cache prefix reuse | 0× tokens, ~50% cost cut | None | Automatic | No code change | GPT-4o+ | GA, automatic |
| **MemGPT / Letta** | Tiered memory + LLM self-editing via function calls | Unbounded (pages to disk) | Self-managed (LLM may forget) | +function-call overhead | Letta server | OpenAI/Anthropic | Production (Letta) |
| **Tree of Thoughts** | Search tree of LLM thoughts | Indirect, often net negative | Improves quality | Many sequential calls | DIY | Any | Research mainstream |
| **SWE-Pruner (code)** | 0.6B line-level neural skimmer | 23–54% on agents, up to 14.84× single-turn | **Negative** (improves 64% vs 54%) | Sub-second on GPU | Deploy skimmer | Any | Research stage |
| **TOON (JSON)** | Indentation + header-driven arrays | 30–61% on structured data | None, sometimes improves | Zero | Format converter | Any | New spec (2025) |
| **JSON minification** | Drop whitespace | ~60% on pretty-printed JSON | None | Zero | `JSON.stringify` | Any | Universal best practice |
| **Provence (RAG)** | Sentence-level sequence labeling | 99% off-topic dropped, 80–90% relevant kept | Improves (less noise) | Negligible | `open_provence` | Any | Production |
| **xRAG** | Embed retrieved docs into attention | 100% (no tokens added) | Trained into model | Projection forward pass | Train projection | Self-hosted | Research |
| **Anthropic Contextual Retrieval** | LLM-written chunk prefix at index time | Reduces chunks needed | Reduces failure 49% | One-time per chunk | Index-time pipeline | Claude (with caching) | Production |
| **Observation masking** | Replace old tool outputs with placeholder | 40–60% on agent contexts | None if M recent kept | Zero | DIY, ~30 LoC | Any | Standard |

---

## 5. Answers to the Specific Research Questions

### Q1. What's the actual token savings from LLMLingua on code/prompts? Quality loss?

On natural-language prompts: 2–20× compression, quality loss typically 1–5 points at 5× and ~1 point at 14× on GSM8K (EM 78.85 → 77.41). On RAG with noisy retrieval, vanilla LLMLingua *collapses* (worse than zero-shot) — use LongLLMLingua instead, which gives 21.4% *improvement* at 4× compression.

**On code specifically**, LLMLingua is the wrong tool. The Atlan guide and SWE-Pruner paper are explicit: perplexity-based token removal destroys function boundaries and variable scopes. The LongLLMLingua Table 2 confirms this — on the LongBench "Code" subtask, vanilla LLMLingua scores 53.2 vs 54.2 for the original prompt (slight loss at 3× compression), and Selective Context scores worse. SWE-Pruner is the right tool for code: 23–54% reduction with *improved* task success (64% vs 54%).

### Q2. How does Anthropic's prompt caching work technically? When does it kick in? Cost?

**Technically.** When you send a Messages API request with `cache_control` set, Claude computes a hash of the prefix up to each cache breakpoint. After processing, it writes that hash plus the corresponding KV-cache to a server-side store. On subsequent requests, it walks back up to 20 blocks looking for a matching prior write; if found, it skips prefill on that prefix and reads the cached KV state. Up to 4 explicit breakpoints are allowed; ordering is `tools → system → messages`.

**When it kicks in.** Minimum cacheable prefix is 1,024 tokens for Sonnet 4.x / Opus 4.8 / Sonnet 5 (4,096 for Opus 4.5–4.6 and Haiku 4.5). Cache TTL is 5 minutes by default (refreshed on each hit), extendable to 1 hour at 2× write cost.

**Cost.** Cache reads = **10% of base input price**. Cache writes = 125% (5-min) or 200% (1-hour) of base input price. Break-even at ~55% hit rate; production users see 91–95% hit rates → ~10× cost reduction.

### Q3. Best strategy for compressing code specifically?

**Don't use token-level perplexity compressors** (LLMLingua, Selective Context) on code — they break syntax. Use, in order:

1. **Reference, don't inline.** If the agent already wrote a file, pass only the diff or a structured reference (e.g., `[file: src/hero.tsx, lines 1-127, hash: a3f2…, see prior context]`). The agent remembers what it wrote.
2. **Function-level chunking.** Split code into functions/classes. Only include the functions referenced in the current task. SWE-Pruner automates this with a 0.6B skimmer conditioned on a pruning goal.
3. **AST-aware pruning.** Drop comments, blank lines, type annotations on internal locals (keep on signatures), and unused imports. Pure mechanical, ~15–25% reduction.
4. **Line-level selection with goals.** If you can't deploy SWE-Pruner, write a prompt for a small model: "Given this code and the goal X, list the line ranges relevant to X." Then include only those ranges.

For audit results that *contain* code snippets (e.g., "evidence" fields), strip the code down to the specific line(s) flagged, not the whole function.

### Q4. How do you compress structured JSON (audit results) without losing fields?

Three layers, applied in order:

1. **Minify.** `JSON.stringify(obj)` instead of pretty-print. ~60% savings on pretty JSON. Lose nothing.
2. **Switch to TOON or TSV for arrays of records.** A list of audit findings:
   ```
   findings[3]{severity,rule,evidence,suggestion}:
   blocker,ACC-01,"line 42: aria-label missing","add aria-label"
   warn,PERF-03,"image not lazy-loaded","loading=\"lazy\""
   pass,SEO-01,"meta description present",""
   ```
   Savings: 50–70% over minified JSON. Fields preserved exactly.
3. **Drop empty/verbose fields programmatically.** If `suggestion` is empty for passes, omit it. If `evidence` is >200 chars, truncate to the first sentence plus a `[evidence truncated, N more chars]` marker. Keep `severity` and `rule` always — these are the lookup keys.

Never apply LLMLingua to JSON. The perplexity signal will drop the braces and field names you need.

### Q5. Is there a pattern for "incremental compression" where older iterations are more aggressively compressed than recent ones?

Yes — this is the **graduated reduction framework** (Atlan, citing JetBrains NeurIPS DL4Code 2025). The pattern:

```
For iteration i in [0..N]:
  For prior iteration j < i:
    age = i - j
    if age == 0:           # current iteration
      pass through unchanged
    elif age == 1:         # last iteration
      keep full audit JSON + full code diff
    elif age <= 3:         # middle iterations
      keep audit summary (blocker list only) + code reference (no body)
    else:                  # old iterations
      keep one-line summary: "iter {j}: {status}, {blockers fixed}, {blockers added}"
      drop audit JSON and code entirely
```

This is "progressive summarization with clear boundaries" (Bijit Ghosh, LinkedIn). The key is to **mark boundaries clearly** — each compressed section should start with `[ITERATION 3 — COMPRESSED TO SUMMARY, see archival for details]` so the agent doesn't hallucinate that it has the full context.

For tool outputs specifically (audit results, user simulator outputs), the JetBrains observation-masking pattern is even cheaper: replace old outputs with a placeholder `[8 prior audit_results omitted; 2 most recent follow]`. Research shows this halves cost while matching or exceeding summarization solve rates.

### Q6. How does hierarchical summarization work for agent memory (summary of summaries)?

The **Hierarchical Aggregate Tree (HAT)** pattern (arXiv 2406.06124):

1. **Leaves** = raw chunks (one iteration's audit + code + agent messages, ~5–20 KB each).
2. **Level-1 parents** = LLM-written summaries of each leaf (~500 tokens each). Prompt: "Summarize this iteration's outcome: what changed, what blockers remained, what was tried."
3. **Level-2 parents** = LLM-written summaries of N level-1 children (~500 tokens each). Prompt: "Summarize these N iteration summaries into a single status report."
4. **Continue** until you have a single root summary.

At inference, the agent's prompt contains: the root summary (always) + the level-1 summaries for the most recent 2–3 iterations + the raw leaf for the current iteration. To go deeper on any thread, the agent calls a `retrieve_summary(level, iteration_id)` function — this is exactly the MemGPT archival pattern.

The trick is in the *summary update prompt*. Naive "summarize this" prompts degenerate after 3–4 recursions (everything becomes "the user wants a good design"). The fix, from the recursive-summarization paper: include 2–3 ICL examples of (raw, prior-summary, updated-summary) triples so the LLM sees what level of detail to preserve. The other fix is *structured summaries* — a fixed JSON schema `{goal, blockers_fixed, blockers_added, code_changes, decisions, open_questions}` — that prevents drift toward vague prose.

### Q7. What about retrieval-augmented compression (only decompress what's relevant)?

Three flavors:

1. **Retrieve-then-prune (Provence).** Pull top-K chunks via standard RAG retrieval. Run a sentence-level classifier over the retrieved chunks; keep only sentences where relevant tokens outnumber irrelevant. 99% of off-topic sentences dropped, 80–90% of relevant content retained. Negligible overhead. Best for multi-document RAG.

2. **Retrieve-then-summarize (Anthropic Contextual Retrieval).** At index time, run each chunk through a small LLM that writes a 50–100 token contextual prefix. At query time, retrieve chunks by the embedded prefix; only the contextual prefixes hit the prompt. Combine with prompt caching (the prefixes are stable across queries) for ~30% additional cost reduction. Reduces retrieval failure rate by 49%.

3. **Embed-don't-tokenize (xRAG).** Skip the token sequence entirely — project retrieved docs into the LLM's attention via a trained projection layer. Zero tokens added per doc. Requires training and self-hosting, but eliminates the retrieval-token bottleneck entirely.

For our use case (iterations of audit JSONs), the right pattern is **schema-keyed retrieval**: index each audit finding by `(severity, rule_id, iteration)`. At iteration N+1, the agent retrieves only the findings with `severity=blocker` from iterations ≤ N, plus the current iteration's full audit. This is essentially observation masking with a smart retrieval layer.

---

## 6. Hierarchical Compression Strategy Proposal

### The problem we have

```
Iteration N context:
  SKILL.md              ~5 KB       (static, never changes)
  prior iter 1..N-1 code  ~10-50 KB  (grows; mostly unchanged across iters)
  prior iter 1..N-1 audits ~2-10 KB each (mostly verbose evidence)
  prior user simulator outputs ~3-5 KB each (grows)
  current iter code + audit + simulator ~15 KB
Total by iter 5: 50-100 KB × 4 agents × 5 iters = 20 calls × 100 KB
```

### The proposed 5-layer strategy

**Layer 0 — Prompt caching (free, do first).**
Cache the SKILL.md as an explicit breakpoint in the system message. Since SKILL.md never changes across iterations, every call after the first reads the cached version at 10% of base price. Net savings: ~90% on the 5 KB skill block. For Anthropic specifically, also cache the tool definitions block (these rarely change).

**Layer 1 — Reference, don't inline, unchanged code.**
After iteration 1, the code is mostly stable — only the parts the agent modified change. Store a snapshot of each iteration's code in a separate file. In the prompt, include only:
- The current iteration's full code (latest state).
- For each prior iteration: a one-line reference `[iter N code: 247 lines, 6.2 KB, hash a3f2…, key changes vs iter N-1: <2-line diff summary>]`.

The agent does not need the full code body of iteration 1 at iteration 5. If it does, the prompt should explicitly say "request iter 1 code body if needed" — making the retrieval on-demand rather than always-inline.

**Layer 2 — Schema-compressed audit JSONs (TOON + field pruning).**
Convert each audit JSON to TOON format. Keep `severity` and `rule_id` always; truncate `evidence` to first sentence + length marker; drop `suggestion` for passes. Apply graduated compression by age:

| Iteration age | What to keep |
|---|---|
| 0 (current) | Full TOON audit, all fields |
| 1 | Full TOON audit, evidence truncated |
| 2–3 | Blockers only (severity IN [blocker, warn]) |
| ≥4 | One-line summary: `iter N: K blockers [ACC-01, PERF-03], M warnings, P passes` |

**Layer 3 — Summarize user simulator outputs as conversation history.**
Use recursive summarization. Maintain a rolling 500-token summary that gets updated each iteration: "After iter N, user simulator feedback was: <2-3 sentence summary>. Open preferences: <bullet list>." Drop the raw simulator outputs for iterations older than 2.

**Layer 4 — Token-level compression only for the residual.**
After layers 0–3, the only natural-language content that's neither cached nor already summarized should be the current iteration's audit narrative and agent reasoning notes. Apply LLMLingua-2 at 2× compression to this slice only — fast (sub-second), small quality hit, and the slice is small so even a 2× compression helps.

### Expected results

For a 5-iteration, 4-agent run with the original 100 KB per call:

- **Layer 0 (caching):** SKILL.md cached → ~4.5 KB saved per call after the first. Across 20 calls, that's ~85 KB of input billed at 10% instead of 100%.
- **Layer 1 (reference code):** At iter 5, prior 4 iters of code (40 KB) collapse to ~2 KB of references. **~38 KB saved per call.**
- **Layer 2 (audit TOON + graduated):** 4 prior audits × 5 KB avg = 20 KB → ~3 KB. **~17 KB saved per call.**
- **Layer 3 (simulator summaries):** 4 prior simulator outputs × 4 KB = 16 KB → ~2 KB. **~14 KB saved per call.**
- **Layer 4 (LLMLingua-2 on residual):** ~15 KB current content → ~8 KB. **~7 KB saved per call.**

**Total: ~76 KB saved per call → 100 KB → 24 KB.** Across 20 calls, that's 480 KB → 115 KB of input tokens — roughly **4× reduction** in input token spend, plus the 90% cache discount on the cached SKILL.md portion. Combined cost reduction on the order of **6–8×**, with minimal quality loss because the most recent iteration (where the agent's attention is needed) is always passed in full.

### Operational rules

1. **Always pass the current iteration unchanged.** The agent's working set must be complete.
2. **Mark compression boundaries explicitly.** Every compressed section starts with `[ITER N — SUMMARY, full content archived at /iters/N/]`. This prevents the agent from assuming it has the full picture.
3. **Provide a retrieval function.** `get_full_iter(n)` returns the full uncompressed iteration. Let the agent call it if a summary is insufficient.
4. **Use a small model for summaries.** Claude Haiku or GPT-4o-mini for layers 2–3 summarization. Don't burn Opus tokens on compression.
5. **Monitor token utilization per call.** Log pre- and post-compression token counts. Alert if any single call exceeds 80% of context window.

---

## 7. Code Examples

### 7.1 LLMLingua-2 compression on natural language

```python
from llmlingua import PromptCompressor

# LLMLingua-2 is faster (3-6x) than LLMLingua-1
compressor = PromptCompressor(
    model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
    use_llmlingua2=True,
)

def compress_nl(text: str, target_tokens: int = 500) -> str:
    out = compressor.compress_prompt(text, target_token=target_tokens, rate=0.5)
    print(f"  compressed {out['origin_tokens']}→{out['compressed_tokens']} "
          f"({out['ratio']})")
    return out["compressed_prompt"]
```

### 7.2 Audit JSON → TOON with field pruning

```python
import json

def audit_toon(audits: list[dict], max_evidence_chars: int = 120) -> str:
    """Compress audit JSON list to TOON format with field pruning."""
    # Filter empty suggestions on passes
    rows = []
    for a in audits:
        ev = a.get("evidence", "")
        if len(ev) > max_evidence_chars:
            ev = ev[:max_evidence_chars].rsplit(" ", 1)[0] \
                 + f" [...{len(ev)-max_evidence_chars} chars truncated]"
        sug = a.get("suggestion", "")
        if a.get("severity") == "pass" and not sug:
            sug = "-"
        rows.append(f"{a['severity']},{a['rule_id']},\"{ev}\",\"{sug}\"")

    header = f"audit[{len(rows)}]{{severity,rule_id,evidence,suggestion}}:"
    return header + "\n" + "\n".join(rows)

# Example
audits = json.loads(open("iter3_audit.json").read())
print(audit_toon(audits))
# audit[12]{severity,rule_id,evidence,suggestion}:
# blocker,ACC-01,"line 42: aria-label missing on <button> [...87 chars truncated]","add aria-label"
# warn,PERF-03,"hero image not lazy-loaded","loading=\"lazy\""
# pass,SEO-01,"meta description present","-"
```

### 7.3 Graduated iteration compression

```python
from dataclasses import dataclass
from typing import Literal

@dataclass
class Iteration:
    idx: int
    code: str
    audit: list[dict]
    simulator_output: str

def render_iteration(it: Iteration, current_idx: int) -> str:
    age = current_idx - it.idx
    if age == 0:
        # Current iteration — pass through unchanged
        return f"=== ITERATION {it.idx} (current) ===\n" \
               f"CODE:\n{it.code}\n\n" \
               f"AUDIT (TOON):\n{audit_toon(it.audit)}\n\n" \
               f"SIMULATOR:\n{it.simulator_output}\n"
    elif age == 1:
        # Last iteration — full audit (TOON), code reference, full simulator
        return f"=== ITERATION {it.idx} (last, age=1) ===\n" \
               f"CODE: [{len(it.code)} chars, hash {hash(it.code) % 0xffff:#x}, " \
               f"see /iters/{it.idx}/code]\n" \
               f"AUDIT (TOON, full):\n{audit_toon(it.audit)}\n" \
               f"SIMULATOR: {it.simulator_output}\n"
    elif age <= 3:
        # Middle — blockers only, code reference, simulator summary
        blockers = [a for a in it.audit if a["severity"] in ("blocker", "warn")]
        return f"=== ITERATION {it.idx} (age={age}, compressed) ===\n" \
               f"CODE: [see /iters/{it.idx}/code]\n" \
               f"AUDIT (blockers only): {audit_toon(blockers) if blockers else 'none'}\n" \
               f"SIMULATOR: {summarize(it.simulator_output, max_tokens=80)}\n"
    else:
        # Old — one-line summary
        blockers = [a["rule_id"] for a in it.audit if a["severity"] == "blocker"]
        return f"=== ITERATION {it.idx} (age={age}, summary) ===\n" \
               f"  {len(blockers)} blockers {blockers}, " \
               f"{len(it.audit)} total findings, " \
               f"simulator: {summarize(it.simulator_output, max_tokens=40)}\n"
```

### 7.4 Anthropic prompt caching with explicit breakpoints

```python
import anthropic

client = anthropic.Anthropic()

# Cache the SKILL.md (static across iterations) and tool defs
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    system=[
        {"type": "text", "text": SKILL_MD, 
         "cache_control": {"type": "ephemeral"}},  # breakpoint 1: SKILL.md
        {"type": "text", "text": TOOL_DEFINITIONS,
         "cache_control": {"type": "ephemeral"}},  # breakpoint 2: tools
    ],
    tools=TOOL_SCHEMAS,
    messages=[
        {"role": "user", "content": rendered_iteration_context},
    ],
)

# First call: cache_creation_input_tokens > 0, cache_read_input_tokens = 0
# Subsequent calls (within 5 min): cache_creation_input_tokens = 0,
#   cache_read_input_tokens = ~len(SKILL_MD) + len(TOOL_DEFINITIONS)
print(response.usage)
```

### 7.5 MemGPT-style self-editing memory blocks

```python
# Using Letta (https://docs.letta.com)
from letta_client import Letta, CreateBlock

client = Letta(base_url="http://localhost:8283")

agent = client.agents.create(
    model="anthropic/claude-sonnet-4-6",
    embedding="openai/text-embedding-3-small",
    memory_blocks=[
        CreateBlock(label="human",       value="User is building an Awwwards hero."),
        CreateBlock(label="persona",     value="You are a senior front-end design agent."),
        CreateBlock(label="design_brief",value="<current brief, max 5000 chars>"),
        CreateBlock(label="iteration_log",
                    value="iter 0: initial hero. iter 1: added parallax. iter 2: ..."),
    ],
)

# The agent self-edits these blocks via core_memory_append/replace
# When the iteration_log block fills, it triggers a MemGPT interrupt:
#   - summarize old entries into archival_memory
#   - reset the block to a fresh summary
# This is the "virtual context management" pattern.
```

### 7.6 Observation masking (JetBrains pattern)

```python
def observation_mask(messages: list[dict], keep_last: int = 2) -> list[dict]:
    """Replace old tool outputs with placeholders, keep last M."""
    tool_indices = [i for i, m in enumerate(messages)
                    if m.get("role") == "tool"]
    mask_indices = set(tool_indices[:-keep_last]) if len(tool_indices) > keep_last else set()

    out = []
    omitted = 0
    for i, m in enumerate(messages):
        if i in mask_indices:
            omitted += 1
        else:
            if omitted > 0:
                tool_name = messages[list(mask_indices)[0]].get("name", "tool")
                out.append({"role": "system",
                            "content": f"[{omitted} prior {tool_name} outputs omitted. "
                                       f"Showing last {keep_last}.]"})
                omitted = 0
            out.append(m)
    if omitted > 0:
        out.append({"role": "system",
                    "content": f"[{omitted} prior tool outputs omitted.]"})
    return out
```

---

## 8. References and Links

### Primary papers
- **LLMLingua** (EMNLP 2023): https://arxiv.org/abs/2310.05736 — https://github.com/microsoft/LLMLingua
- **LongLLMLingua** (ACL 2024): https://arxiv.org/abs/2310.06839 — https://aclanthology.org/2024.acl-long.91.pdf
- **LLMLingua-2** (ACL Findings 2024): https://arxiv.org/abs/2403.12968 — https://aclanthology.org/2024.findings-acl.57.pdf
- **Selective Context** (EMNLP 2023): https://arxiv.org/abs/2310.06201 — https://github.com/liyucheng09/Selective_Context
- **Context-Aware Decoding** (NAACL 2024): https://arxiv.org/abs/2405.02750 — https://github.com/amazon-science/ContextualUnderstanding-ContrastiveDecoding
- **MemGPT** (arXiv 2310.08560): https://arxiv.org/abs/2310.08560 — https://research.memgpt.ai — https://www.letta.com
- **Recursive Summarization** (Neurocomputing 2024): https://arxiv.org/abs/2308.15022
- **Hierarchical Aggregate Tree (HAT)**: https://arxiv.org/html/2406.06124v1
- **SWE-Pruner** (arXiv 2601.16746): https://arxiv.org/abs/2601.16746 — https://github.com/Ayanami1314/swe-pruner
- **Tree of Thoughts** (NeurIPS 2023): https://github.com/princeton-nlp/tree-of-thought-llm
- **Graph of Thoughts** (AAAI 2024): https://github.com/spcl/graph-of-thoughts
- **Provence** (arXiv 2501.16214): https://github.com/hotchpotch/open_provence
- **xRAG** (OpenReview): https://openreview.net/forum?id=6pTlXqrO0p
- **Prompt Compression Survey** (arXiv 2410.12388): https://arxiv.org/html/2410.12388v2
- **Contextual Compression in RAG Survey** (arXiv 2409.13385): https://arxiv.org/abs/2409.13385
- **Context Compression for LLM Agents Survey** (preprints.org 2026): https://www.preprints.org/manuscript/202605.2065
- **JetBrains / NeurIPS DL4Code 2025** — "The Complexity Trap" (arXiv 2508.21433): observation tokens = ~84% of agent context.

### Provider docs
- **Anthropic Prompt Caching**: https://platform.claude.com/docs/en/build-with-claude/prompt-caching — https://www.anthropic.com/news/prompt-caching
- **Anthropic Contextual Retrieval**: https://www.anthropic.com/engineering/contextual-retrieval
- **OpenAI Prompt Caching**: https://openai.com/index/api-prompt-caching — https://developers.openai.com/api/docs/guides/prompt-caching
- **Azure OpenAI Prompt Caching**: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/prompt-caching

### Practitioner write-ups
- **Atlan — Context Pruning for AI Agents** (graduated reduction framework): https://atlan.com/know/ai-agent/ai-agent-context/how-to-implement-context-pruning-ai-agents
- **TensorLake — TOON vs JSON**: https://tensorlake.ai/blog/toon-vs-json
- **Halodoc — TOON cost reduction**: https://blogs.halodoc.io/reducing-llm-token-costs-by-5-15-by-switching-from-json-to-toon-format
- **Leonie Monigatti — MemGPT review**: https://www.leoniemonigatti.com/blog/memgpt.html
- **LangChain — Context Engineering for Agents**: https://www.langchain.com/blog/context-engineering-for-agents
- **Factory.ai — Compressing Context**: https://factory.ai/news/compressing-context
- **Mem0 — Context Compression vs Memory**: https://mem0.ai/blog/context-compression-vs-memory-in-ai-agents
- **Frugal — Anthropic Claude API costs**: https://frugal.co/blog/the-frugal-approach-to-anthropic-claude-api-costs
- **Hakkoda — Prompt caching**: https://hakkoda.io/resources/prompt-caching
- **labeveryday — $720→$72/month with caching**: https://labeveryday.medium.com/prompt-caching-is-a-must-how-i-went-from-spending-720-to-72-monthly-on-api-costs-3086f3635d63

### Companion documents in this research folder
- `05-advanced-memory-patterns.md` — companion piece on cognitive-memory architectures (CoALA, Generative Agents, Voyager, A-MEM, Reflexion, SleepGate) that complements this compression-focused report.

---

**Bottom line.** For our multi-agent design loop: cache SKILL.md and tool definitions, reference unchanged code instead of inlining, TOON+graduate-compress audit JSONs, recursively summarize simulator outputs, and reserve token-level LLMLingua-2 for the current iteration's natural-language narrative only. Expected ~4× token reduction and ~6–8× cost reduction at minimal quality loss.
