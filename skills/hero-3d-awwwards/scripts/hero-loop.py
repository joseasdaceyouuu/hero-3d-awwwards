#!/usr/bin/env python3
"""
hero-loop.py — Orquestador del Agent Loop para hero-3d-awwwards

Ejecuta el ciclo Creator → Auditor → Corrector hasta alcanzar el criterio
de éxito o max_iterations.

USO:
    python hero-loop.py \\
        --prompt "Diseña un hero 3D para portfolio de fotógrafo" \\
        --max-iterations 5 \\
        --output-dir ./hero-output \\
        --llm glm          # o openai

REQUISITOS:
    - CLI `glm` disponible (GLM Code) — recomendado
    - O API key de OpenAI (env OPENAI_API_KEY)
    - O z-ai-web-dev-sdk instalado

El script produce:
    hero-output/
    ├── iteration-1/
    │   ├── manifest.json
    │   ├── code/
    │   ├── audit.json
    │   └── changes.md
    ├── iteration-2/
    │   └── ...
    ├── final/
    │   └── [mejor versión]
    └── report.md         (resumen del loop)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any, List


# ============================================================
# CONFIGURATION
# ============================================================

SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent
PROMPTS_DIR = SCRIPT_DIR / "prompts"

DEFAULT_MAX_ITERATIONS = 5
DEFAULT_MIN_SCORE = 9.0
DEFAULT_OUTPUT_DIR = Path.cwd() / "hero-output"


# ============================================================
# LLM BACKENDS
# ============================================================

class LLMBackend:
    """Abstract LLM backend. Subclasses implement actual API calls."""

    def __init__(self, model: str = "glm-4.6"):
        self.model = model

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        raise NotImplementedError


class GLMCLIBackend(LLMBackend):
    """Uses the `glm` CLI tool available in GLM Code/Cowork environments."""

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        full_prompt = f"# System\n{system_prompt}\n\n# User\n{user_prompt}"
        try:
            result = subprocess.run(
                ["glm", "-p", full_prompt, "--model", self.model],
                capture_output=True,
                text=True,
                timeout=300,
                check=True,
            )
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            raise RuntimeError("GLM CLI timeout (>300s)")
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"GLM CLI error: {e.stderr}")


class OpenAIBackend(LLMBackend):
    """Uses OpenAI-compatible API. Requires OPENAI_API_KEY env var."""

    def __init__(self, model: str = "gpt-4o"):
        super().__init__(model)
        try:
            from openai import OpenAI
            self.client = OpenAI()
        except ImportError:
            raise RuntimeError("openai package not installed. Run: pip install openai")

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        return response.choices[0].message.content or ""


class ZAISDKBackend(LLMBackend):
    """Uses the z-ai CLI tool (z-ai chat command) via subprocess.

    The CLI returns JSON to stdout with some log lines prefixed (🚀 ...).
    We extract the JSON block and parse choices[0].message.content.

    Note: CLI uses glm-4-plus by default and doesn't support model selection.
    For GLM-5.2, use ZAISDKDirectBackend instead.
    """

    def __init__(self, model: str = "glm-4.6"):
        super().__init__(model)

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        try:
            cmd = [
                "z-ai", "chat",
                "--system", system_prompt,
                "--prompt", user_prompt,
            ]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            output = result.stdout
            if not output:
                err = result.stderr.strip()
                raise RuntimeError(f"z-ai CLI returned empty stdout. stderr: {err[:500]}")

            # Extract JSON block from stdout (log lines start with 🚀 or ✓)
            lines = output.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("{"):
                    in_json = True
                if in_json:
                    json_lines.append(line)
                    if stripped == "}" or stripped.startswith("}"):
                        try:
                            data = json.loads("\n".join(json_lines))
                            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                            if content:
                                return content.strip()
                        except json.JSONDecodeError:
                            continue
            raise RuntimeError(f"Could not extract content from z-ai output. Raw: {output[:500]}")
        except subprocess.TimeoutExpired:
            raise RuntimeError("z-ai CLI timeout (>300s)")
        except FileNotFoundError:
            raise RuntimeError("z-ai CLI not found. Install: npm install -g z-ai-web-dev-sdk")
        except Exception as e:
            if "z-ai CLI" in str(e) or "timeout" in str(e).lower():
                raise
            raise RuntimeError(f"z-ai CLI error: {e}")


class ZAISDKDirectBackend(LLMBackend):
    """Uses z-ai-web-dev-sdk directly via Node.js subprocess.

    Supports model selection (e.g., glm-5.2, glm-4.6, glm-4-plus).
    Slower than CLI but allows using newer models like GLM-5.2.
    """

    def __init__(self, model: str = "glm-5.2"):
        super().__init__(model)

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        # Write a temp Node script that uses the SDK with specified model
        script = f"""
        const ZAI = require('z-ai-web-dev-sdk').default;
        (async () => {{
          try {{
            const zai = await ZAI.create();
            const completion = await zai.chat.completions.create({{
              model: {json.dumps(self.model)},
              messages: [
                {{ role: "system", content: {json.dumps(system_prompt)} }},
                {{ role: "user", content: {json.dumps(user_prompt)} }}
              ],
              temperature: {temperature}
            }});
            // Output ONLY the content, nothing else
            process.stdout.write(completion.choices[0].message.content || '');
          }} catch (e) {{
            process.stderr.write(e.message || e.toString());
            process.exit(1);
          }}
        }})();
        """
        try:
            result = subprocess.run(
                ["node", "-e", script],
                capture_output=True,
                text=True,
                timeout=300,
                cwd="/home/z/my-project",  # where z-ai-web-dev-sdk is installed
                check=False,
            )
            output = result.stdout.strip()
            if not output:
                err = result.stderr.strip()
                raise RuntimeError(f"z-ai SDK returned empty stdout. stderr: {err[:500]}")
            return output
        except subprocess.TimeoutExpired:
            raise RuntimeError("z-ai SDK timeout (>300s)")
        except Exception as e:
            if "timeout" in str(e).lower() or "z-ai SDK" in str(e):
                raise
            raise RuntimeError(f"z-ai SDK error: {e}")


def get_backend(llm: str, model: Optional[str] = None) -> LLMBackend:
    if llm == "glm":
        return GLMCLIBackend(model or "glm-4.6")
    elif llm == "openai":
        return OpenAIBackend(model or "gpt-4o")
    elif llm == "zai":
        return ZAISDKBackend(model or "glm-4.6")
    elif llm == "zai-direct":
        return ZAISDKDirectBackend(model or "glm-5.2")
    else:
        raise ValueError(f"Unknown LLM backend: {llm}")


# ============================================================
# PROMPT BUILDERS
# ============================================================

def load_prompt_template(name: str) -> str:
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


def load_skill_context() -> str:
    """Load SKILL.md + audit-checklist.md as context for the agents."""
    skill_md = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    checklist_md = (SKILL_DIR / "references" / "audit-checklist.md").read_text(encoding="utf-8")
    return f"# SKILL.md\n{skill_md}\n\n# Audit Checklist\n{checklist_md}"


def build_creator_prompt(
    user_request: str,
    skill_context: str,
    iteration: int,
    previous_code: Optional[Dict[str, str]] = None,
    previous_audit: Optional[Dict] = None,
    memory_context: Optional[Dict] = None,
    compressed_history: str = "",
) -> tuple[str, str]:
    """Returns (system_prompt, user_prompt) for the Creator.

    Args:
        memory_context: dict with retrieved patterns, skills, anti_patterns.
            If provided, these are injected as additional context to inform
            the Creator's design decisions.
        compressed_history: if provided (iteration > 1), replaces the full
            previous_code + previous_audit replay with a graduated-compression
            summary of past iterations.
    """
    system = load_prompt_template("creator")

    # Build memory context block (if available)
    memory_block = ""
    if memory_context:
        memory_block = _format_memory_context(memory_context)

    if iteration == 1:
        user = f"""# User Request
{user_request}

# Skill Context
{skill_context}
{memory_block}
# Task
Generate iteration 1 of the hero. Follow the 7-step workflow strictly.
Output the manifest, files, setup commands, and notes.
"""
    else:
        user = f"""# User Request
{user_request}

# Skill Context
{skill_context}
{memory_block}
# Iteration
This is iteration {iteration}. Apply audit feedback from iteration {iteration - 1}.

# Previous Iterations (compressed history)
{compressed_history if compressed_history else "(no prior iterations)"}

# Previous Code (current state, may be unchanged)
"""
        # Only include code that's referenced as "current" — Creator needs to
        # know what to modify, but we don't replay all past iterations.
        for path, content in (previous_code or {}).items():
            user += f"\n## File: {path}\n```\n{content}\n```\n"

        user += f"\n# Previous Audit (most recent, full)\n```json\n{json.dumps(previous_audit, indent=2)}\n```\n"

        user += f"""
# Task
Generate iteration {iteration}. Apply MINIMAL fixes for each failed criterion.
Output the change log, modified files (full content), verification notes, and
criteria you could not fix.
"""

    return system, user


def _format_memory_context(memory_context: Dict) -> str:
    """Format retrieved memory (patterns, skills, anti_patterns) as prompt block."""
    lines = ["\n# Memory Context (from past sessions)"]
    lines.append("Apply these patterns/skills/anti-patterns if relevant to the current brief.")
    lines.append("Do NOT blindly copy — adapt to the specific user request.")
    lines.append("")

    patterns = memory_context.get("patterns", [])
    if patterns:
        lines.append("## Relevant Patterns (semantic memory)")
        for p in patterns[:5]:  # max 5
            content = p.get("content", "")
            importance = p.get("importance", 5)
            lines.append(f"- [imp={importance}/10] {content}")
        lines.append("")

    skills = memory_context.get("skills", [])
    if skills:
        lines.append("## Relevant Skills (procedural memory)")
        for s in skills[:3]:  # max 3
            desc = s.get("description", "")
            success = s.get("success_count", 0)
            lines.append(f"- [success={success}] {desc}")
            # Note: code_template is intentionally NOT inlined here to save tokens.
            # The Creator will regenerate from the description. If a skill is a
            # perfect match, the Corrector can pull the code from the procedural store.
        lines.append("")

    anti_patterns = memory_context.get("anti_patterns", [])
    if anti_patterns:
        lines.append("## Known Pitfalls (avoid these)")
        for ap in anti_patterns[:3]:
            desc = ap.get("description", "")
            count = ap.get("occurrence_count", 1)
            lines.append(f"- [seen={count}x] {desc}")
        lines.append("")

    return "\n".join(lines)


def build_auditor_prompt(
    creator_output: str,
    skill_context: str,
    iteration: int,
    previous_audit: Optional[Dict] = None,
) -> tuple[str, str]:
    """Returns (system_prompt, user_prompt) for the Auditor."""
    system = load_prompt_template("auditor")

    user = f"""# Iteration
{iteration}

# Skill Context
{skill_context}

# Creator's Output
{creator_output}

# Task
Evaluate the Creator's output against the audit checklist. Output strict JSON.
"""

    if previous_audit:
        user += f"\n# Previous Audit (for detecting stagnation)\n```json\n{json.dumps(previous_audit, indent=2)}\n```\n"

    return system, user


def build_corrector_prompt(
    creator_output: str,
    audit_json: Dict,
    skill_context: str,
    iteration: int,
    subjective_audit: Optional[Dict] = None,
    compressed_history: str = "",
    memory_context: Optional[Dict] = None,
) -> tuple[str, str]:
    """Returns (system_prompt, user_prompt) for the Corrector.

    Args:
        compressed_history: graduated-compression summary of iterations before
            the one being corrected. Saves tokens vs replaying all past code/audits.
        memory_context: retrieved patterns/skills/anti_patterns for context.
    """
    system = load_prompt_template("corrector")

    memory_block = ""
    if memory_context:
        memory_block = _format_memory_context(memory_context)

    user = f"""# Iteration
This is the corrector pass for iteration {iteration + 1} (fixing iteration {iteration}).

# Skill Context
{skill_context}
{memory_block}
# Creator's Code (iteration {iteration})
{creator_output}

# Audit Feedback (iteration {iteration}) — objective criteria
```json
{json.dumps(audit_json, indent=2)}
```
"""

    if subjective_audit:
        user += f"""
# User Simulator Feedback (iteration {iteration}) — subjective criteria
```json
{json.dumps(subjective_audit, indent=2)}
```

You have TWO sources of feedback:
1. **Audit Feedback** (objective, C-prefixed criteria): technical fixes
2. **User Simulator Feedback** (subjective, S-prefixed blockers): creative fixes

Prioritize: blockers from Auditor first, then major subjective_blockers from
User Simulator, then minors from both. Each fix must map to either a C-ID or
an S-ID. Output the change log with the ID prefix.
"""
    else:
        user += """
# Task
Apply minimal fixes for each failed criterion. Output modified files (full content),
change log, verification notes, and criteria you could not fix.
"""

    # Add compressed history for context (what happened in earlier iterations)
    if compressed_history:
        user += f"""
# Earlier Iterations (compressed history, for context)
{compressed_history}
"""

    return system, user


def build_user_simulator_prompt(
    creator_output: str,
    audit_json: Optional[Dict],
    user_request: str,
    skill_context: str,
    iteration: int,
    previous_subjective: Optional[Dict] = None,
) -> tuple[str, str]:
    """Returns (system_prompt, user_prompt) for the User Simulator."""
    system = load_prompt_template("user-simulator")

    user = f"""# Iteration
{iteration}

# User's Original Request
{user_request}

# Skill Context
{skill_context}

# Creator's Output (the hero to evaluate subjectively)
{creator_output}
"""

    if audit_json:
        user += f"""
# Auditor's Result (objective — DO NOT repeat this work)
```json
{json.dumps(audit_json, indent=2)}
```
The Auditor already checked objective criteria. You focus ONLY on subjective
dimensions: wow factor, narrative, soul, memorability, SOTD competitiveness.
"""

    if previous_subjective:
        user += f"""
# Previous Subjective Evaluation (for detecting stagnation)
```json
{json.dumps(previous_subjective, indent=2)}
```
"""

    user += """
# Task
Evaluate the hero subjectively. Output strict JSON following the schema in your
system prompt. Be honest, specific, calibrated. A 9+ means "would win SOTD this
month" — most heroes should land 5-7.
"""
    return system, user


# ============================================================
# OUTPUT PARSING
# ============================================================

def parse_creator_output(output: str) -> Dict[str, Any]:
    """Extract manifest, files, and metadata from Creator's markdown output."""
    result = {
        "raw": output,
        "manifest": {},
        "files": {},
        "setup_commands": [],
        "notes": [],
    }

    # Extract manifest JSON
    manifest_match = re_search_json(output, "## Manifest")
    if manifest_match:
        try:
            result["manifest"] = json.loads(manifest_match)
        except json.JSONDecodeError:
            pass

    # Extract files (```code blocks under ### `path` headers)
    result["files"] = extract_code_blocks(output)

    return result


def parse_corrector_output(output: str, previous_files: Dict[str, str]) -> Dict[str, Any]:
    """Corrector only outputs modified files. Merge with previous."""
    result = {
        "raw": output,
        "files": dict(previous_files),  # start with previous
        "changes_applied": [],
    }

    # Replace modified files
    modified = extract_code_blocks(output)
    result["files"].update(modified)

    return result


def extract_code_blocks(markdown: str) -> Dict[str, str]:
    """Extract code blocks with file path headers like '### `path/to/file.tsx`'."""
    files = {}
    lines = markdown.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for file header pattern
        if line.startswith("### `") and line.endswith("`"):
            filepath = line[5:-1]
            # Skip to next code block
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                i += 1
            if i < len(lines):
                # Found code fence start
                i += 1  # skip the ```lang line
                code_lines = []
                while i < len(lines) and not lines[i].startswith("```"):
                    code_lines.append(lines[i])
                    i += 1
                files[filepath] = "\n".join(code_lines)
                i += 1  # skip closing ```
        else:
            i += 1
    return files


def re_search_json(text: str, section_header: str) -> Optional[str]:
    """Find JSON block following a section header."""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if line.strip() == section_header:
            # Look for ```json block or inline JSON
            j = i + 1
            while j < len(lines):
                if lines[j].startswith("```json"):
                    # Extract until closing ```
                    j += 1
                    json_lines = []
                    while j < len(lines) and not lines[j].startswith("```"):
                        json_lines.append(lines[j])
                        j += 1
                    return "\n".join(json_lines)
                elif lines[j].startswith("{"):
                    # Inline JSON
                    json_lines = []
                    while j < len(lines) and not lines[j].strip() == "":
                        json_lines.append(lines[j])
                        j += 1
                    return "\n".join(json_lines)
                j += 1
    return None


def parse_auditor_output(output: str) -> Optional[Dict]:
    """Auditor outputs strict JSON. Parse it."""
    # Find the JSON content (may have leading/trailing whitespace)
    output = output.strip()

    # Strip markdown fences if present
    if output.startswith("```"):
        lines = output.split("\n")
        # Remove first and last line (fences)
        lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        output = "\n".join(lines)

    try:
        return json.loads(output)
    except json.JSONDecodeError as e:
        print(f"⚠️  Auditor output is not valid JSON: {e}")
        print(f"Output preview: {output[:500]}...")
        return None


# ============================================================
# LOOP ORCHESTRATOR
# ============================================================

def run_loop(
    user_prompt: str,
    backend: LLMBackend,
    output_dir: Path,
    max_iterations: int = DEFAULT_MAX_ITERATIONS,
    min_score: float = DEFAULT_MIN_SCORE,
    min_subjective_score: float = 7.5,
    enable_user_simulator: bool = True,
    enable_memory: bool = True,
    memory_db: Optional[Path] = None,
    memory_lancedb: Optional[Path] = None,
    vertical: str = "",
    archetype: str = "",
    stack: str = "",
    verbose: bool = True,
) -> Dict[str, Any]:
    """Main loop. Returns summary dict.

    Args:
        enable_memory: if True, use MemorySystem for cross-session learning
            and intra-session compression. If False, behaves like v3 (full replay).
        memory_db: path to SQLite DB for memory. Defaults to output_dir/memory.db.
        memory_lancedb: path to LanceDB dir. Defaults to output_dir/.lancedb.
        vertical, archetype, stack: hints for memory retrieval. If empty,
        the memory system will try to infer from the prompt.
    """

    output_dir.mkdir(parents=True, exist_ok=True)
    skill_context = load_skill_context()

    # === Initialize memory system (if enabled) ===
    memory = None
    memory_context = None
    if enable_memory:
        try:
            from memory import MemorySystem
            memory_db_path = memory_db or (output_dir / "memory.db")
            memory_lancedb_path = memory_lancedb or (output_dir / ".lancedb")
            memory = MemorySystem(
                db_path=memory_db_path,
                lancedb_path=memory_lancedb_path,
            )
            # Start session — this auto-retrieves relevant patterns/skills/anti_patterns
            memory.start_session(
                brief=user_prompt,
                brief_summary=user_prompt[:200],
                vertical=vertical,
                archetype=archetype,
                stack=stack,
            )
            memory_context = {
                "patterns": memory.working.retrieved_patterns,
                "skills": memory.working.retrieved_skills,
                "anti_patterns": memory.working.retrieved_anti_patterns,
            }
            stats = memory.stats()
            print(f"🧠 Memory system enabled")
            print(f"   Episodes: {stats['episodes']} | Patterns: {stats['semantic_notes']} | "
                  f"Skills: {stats['skills']} | Anti-patterns: {stats['anti_patterns']}")
            print(f"   Retrieved for this brief: {len(memory_context['patterns'])} patterns, "
                  f"{len(memory_context['skills'])} skills, "
                  f"{len(memory_context['anti_patterns'])} anti-patterns")
        except Exception as e:
            print(f"⚠️  Memory system failed to initialize: {e}")
            print(f"   Continuing without memory (full replay mode).")
            memory = None
            enable_memory = False

    state = {
        "user_prompt": user_prompt,
        "iteration": 0,
        "current_code": {},
        "current_manifest": {},
        "audits": [],
        "subjective_audits": [],
        "stopped_reason": None,
        "final_score": 0.0,
        "final_subjective_score": 0.0,
        "memory_enabled": enable_memory,
        "token_stats": {
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "per_iteration": [],
        },
        "episode_id": None,
    }

    print(f"🚀 Starting hero-3d-awwwards agent loop")
    print(f"   Max iterations: {max_iterations}")
    print(f"   Min combined score: {min_score}")
    print(f"   Min subjective score: {min_subjective_score}")
    print(f"   User Simulator: {'ENABLED' if enable_user_simulator else 'DISABLED'}")
    print(f"   Memory: {'ENABLED' if enable_memory else 'DISABLED'}")
    print(f"   Output: {output_dir}")
    print()

    for iteration in range(1, max_iterations + 1):
        state["iteration"] = iteration
        iter_dir = output_dir / f"iteration-{iteration}"
        iter_dir.mkdir(parents=True, exist_ok=True)

        print(f"━━━ Iteration {iteration}/{max_iterations} ━━━")

        # === Build compressed history (if memory enabled) ===
        compressed_history = ""
        if memory and iteration > 1:
            # Use working memory's compressed history
            compressed_history = memory.working.compressed_history()

        # === STEP 1: Creator (or Corrector if iteration > 1) ===
        if iteration == 1:
            print(f"  ▶ Creator generating v{iteration}...")
            system, user = build_creator_prompt(
                user_request=user_prompt,
                skill_context=skill_context,
                iteration=iteration,
                memory_context=memory_context if memory else None,
            )
            creator_temp = 0.7
        else:
            print(f"  ▶ Corrector fixing v{iteration - 1} → v{iteration}...")
            previous_audit = state["audits"][-1]
            previous_subjective = state["subjective_audits"][-1] if state["subjective_audits"] else None
            system, user = build_corrector_prompt(
                creator_output=state["current_raw"] if "current_raw" in state else "",
                audit_json=previous_audit,
                skill_context=skill_context,
                iteration=iteration - 1,
                subjective_audit=previous_subjective if enable_user_simulator else None,
                compressed_history=compressed_history,
                memory_context=memory_context if memory else None,
            )
            creator_temp = 0.5

        # Token tracking (estimate)
        iter_input_tokens = len(system) // 4 + len(user) // 4

        t0 = time.time()
        creator_output = backend.complete(system, user, temperature=creator_temp)
        creator_time = time.time() - t0
        iter_output_tokens = len(creator_output) // 4
        print(f"     ✓ Done in {creator_time:.1f}s (~{iter_input_tokens:,}+{iter_output_tokens:,} tokens)")

        state["token_stats"]["total_input_tokens"] += iter_input_tokens
        state["token_stats"]["total_output_tokens"] += iter_output_tokens

        # Parse creator output
        if iteration == 1:
            parsed = parse_creator_output(creator_output)
            state["current_code"] = parsed["files"]
            state["current_manifest"] = parsed["manifest"]
        else:
            parsed = parse_corrector_output(creator_output, state["current_code"])
            state["current_code"] = parsed["files"]

        state["current_raw"] = creator_output

        # Save code
        code_dir = iter_dir / "code"
        code_dir.mkdir(exist_ok=True)
        for filepath, content in state["current_code"].items():
            file_path = code_dir / filepath
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding="utf-8")

        (iter_dir / "manifest.json").write_text(
            json.dumps(state["current_manifest"], indent=2), encoding="utf-8"
        )
        (iter_dir / "raw_output.md").write_text(creator_output, encoding="utf-8")

        # === STEP 2: Auditor + User Simulator (parallel) ===
        previous_audit = state["audits"][-1] if state["audits"] else None
        previous_subjective = state["subjective_audits"][-1] if state["subjective_audits"] else None

        # Run Auditor
        print(f"  ▶ Auditor evaluating v{iteration}...")
        system_a, user_a = build_auditor_prompt(
            creator_output=creator_output,
            skill_context=skill_context,
            iteration=iteration,
            previous_audit=previous_audit,
        )
        t0 = time.time()
        auditor_output = backend.complete(system_a, user_a, temperature=0.2)
        auditor_time = time.time() - t0
        print(f"     ✓ Auditor done in {auditor_time:.1f}s")

        audit = parse_auditor_output(auditor_output)
        if audit is None:
            print(f"  ⚠️  Auditor output unparseable. Saving raw and continuing.")
            (iter_dir / "audit_raw.txt").write_text(auditor_output, encoding="utf-8")
            audit = {
                "iteration": iteration,
                "overall_pass": False,
                "score": 0.0,
                "summary": "Auditor output unparseable",
                "recommendation": "escalate_to_user",
                "criteria": [],
                "blockers": [],
            }

        state["audits"].append(audit)
        (iter_dir / "audit.json").write_text(
            json.dumps(audit, indent=2), encoding="utf-8"
        )

        # Run User Simulator (parallelizable in future; sequential for now)
        subjective = None
        if enable_user_simulator:
            print(f"  ▶ User Simulator evaluating v{iteration}...")
            system_s, user_s = build_user_simulator_prompt(
                creator_output=creator_output,
                audit_json=audit,
                user_request=user_prompt,
                skill_context=skill_context,
                iteration=iteration,
                previous_subjective=previous_subjective,
            )
            t0 = time.time()
            subjective_output = backend.complete(system_s, user_s, temperature=0.4)
            subjective_time = time.time() - t0
            print(f"     ✓ User Simulator done in {subjective_time:.1f}s")

            subjective = parse_auditor_output(subjective_output)  # same JSON parser
            if subjective is None:
                print(f"  ⚠️  User Simulator output unparseable. Saving raw and continuing.")
                (iter_dir / "subjective_raw.txt").write_text(subjective_output, encoding="utf-8")
                subjective = {
                    "iteration": iteration,
                    "subjective_score": 0.0,
                    "subjective_blockers": [],
                    "recommendation": "continue_loop",
                    "summary": "User Simulator output unparseable",
                }

            state["subjective_audits"].append(subjective)
            (iter_dir / "subjective.json").write_text(
                json.dumps(subjective, indent=2), encoding="utf-8"
            )

        # === Combined evaluation ===
        score = audit.get("score", 0.0)
        subjective_score = subjective.get("subjective_score", 0.0) if subjective else 0.0
        combined_score = (score * 0.6) + (subjective_score * 0.4) if subjective else score
        overall_pass = audit.get("overall_pass", False)
        blockers = audit.get("blockers", [])
        subjective_blockers = subjective.get("subjective_blockers", []) if subjective else []
        all_blockers = blockers + [b.get("id", "?") for b in subjective_blockers]
        recommendation = audit.get("recommendation", "continue_loop")
        if subjective and subjective.get("recommendation") == "escalate_to_user":
            recommendation = "escalate_to_user"

        print(f"  📊 Auditor: {score:.1f}/10  |  User Simulator: {subjective_score:.1f}/10  |  Combined: {combined_score:.1f}/10")
        print(f"     Blockers: {len(blockers)} objective + {len(subjective_blockers)} subjective = {len(all_blockers)} total")
        print(f"     Recommendation: {recommendation}")

        if verbose:
            for c in audit.get("criteria", []):
                if not c.get("passed", True):
                    print(f"     ❌ {c['id']}: {c['name']}")
                    if c.get("fix_hint"):
                        print(f"        → {c['fix_hint'][:120]}")
            for s in subjective_blockers:
                print(f"     ❌ {s.get('id', 'S?')}: {s.get('name', '?')} (subjective)")
                if s.get("fix_hint"):
                    print(f"        → {s['fix_hint'][:120]}")

        # === STEP 2.5: Save iteration to working memory (if enabled) ===
        if memory:
            memory.save_iteration(
                iteration=iteration,
                code=state["current_code"],
                audit=audit,
                subjective=subjective if subjective else {},
            )

        # Track per-iteration tokens
        state["token_stats"]["per_iteration"].append({
            "iteration": iteration,
            "input_tokens": iter_input_tokens,
            "output_tokens": iter_output_tokens,
        })

        # === STEP 3: Check exit conditions ===
        # Success requires BOTH agents to pass
        success = overall_pass
        if enable_user_simulator and subjective:
            success = success and subjective_score >= min_subjective_score

        if success:
            state["stopped_reason"] = "success"
            state["final_score"] = combined_score
            state["final_subjective_score"] = subjective_score
            print(f"\n✅ SUCCESS: All agents passed in iteration {iteration}")
            break

        if combined_score >= min_score and not all_blockers:
            state["stopped_reason"] = "score_sufficient"
            state["final_score"] = combined_score
            state["final_subjective_score"] = subjective_score
            print(f"\n✅ Combined score {combined_score:.1f} ≥ {min_score} with no blockers. Accepting.")
            break

        if recommendation == "escalate_to_user":
            state["stopped_reason"] = "escalated"
            state["final_score"] = combined_score
            state["final_subjective_score"] = subjective_score
            print(f"\n⚠️  Escalation recommended. Stopping loop.")
            break

        if recommendation == "abort":
            state["stopped_reason"] = "aborted"
            state["final_score"] = combined_score
            state["final_subjective_score"] = subjective_score
            print(f"\n🛑 Abort recommended. Stopping loop.")
            break

        # Stagnation: check both signals
        if len(state["audits"]) >= 3:
            recent_combined = []
            for i in range(-3, 0):
                a = state["audits"][i]
                s = state["subjective_audits"][i] if i < len(state["subjective_audits"]) and state["subjective_audits"] else None
                a_score = a.get("score", 0)
                s_score = s.get("subjective_score", 0) if s else 0
                combined = (a_score * 0.6) + (s_score * 0.4) if s else a_score
                recent_combined.append(combined)
            if max(recent_combined) - min(recent_combined) < 0.5:
                state["stopped_reason"] = "stagnated"
                state["final_score"] = combined_score
                state["final_subjective_score"] = subjective_score
                print(f"\n⚠️  Stagnation detected (delta < 0.5 over 3 iterations). Stopping.")
                break

        # Divergence: auditor improving but subjective worsening, or vice versa
        if enable_user_simulator and len(state["audits"]) >= 3 and len(state["subjective_audits"]) >= 3:
            audit_trend = state["audits"][-1].get("score", 0) - state["audits"][-3].get("score", 0)
            subj_trend = state["subjective_audits"][-1].get("subjective_score", 0) - state["subjective_audits"][-3].get("subjective_score", 0)
            if (audit_trend > 0.5 and subj_trend < -0.5) or (audit_trend < -0.5 and subj_trend > 0.5):
                state["stopped_reason"] = "diverged"
                state["final_score"] = combined_score
                state["final_subjective_score"] = subjective_score
                print(f"\n⚠️  Divergence: technical and creative signals disagree. Escalating.")
                break

        print()

    else:
        state["stopped_reason"] = "max_iterations"
        if state["audits"]:
            last_a = state["audits"][-1].get("score", 0)
            last_s = state["subjective_audits"][-1].get("subjective_score", 0) if state["subjective_audits"] else 0
            state["final_score"] = (last_a * 0.6) + (last_s * 0.4) if state["subjective_audits"] else last_a
            state["final_subjective_score"] = last_s
        print(f"\n⚠️  Max iterations ({max_iterations}) reached without success.")

    # === Save final ===
    final_dir = output_dir / "final"
    final_dir.mkdir(exist_ok=True)
    for filepath, content in state["current_code"].items():
        file_path = final_dir / filepath
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")

    # === Finalize memory session (save as episode) ===
    if memory:
        try:
            episode_id = memory.finalize_session(
                outcome=state["stopped_reason"] or "unknown",
                final_score=state["final_score"],
                final_subjective_score=state["final_subjective_score"],
            )
            state["episode_id"] = episode_id
            print(f"💾 Episode saved to memory: {episode_id}")
            stats = memory.stats()
            print(f"   Memory totals: {stats['episodes']} episodes, "
                  f"{stats['semantic_notes']} patterns, "
                  f"{stats['skills']} skills, "
                  f"{stats['anti_patterns']} anti-patterns")

            # === Fase 2: Extract patterns from this session ===
            # This is what makes the system learn across sessions.
            try:
                from memory.extraction import extract_patterns_from_episode
                patterns, anti_patterns = extract_patterns_from_episode(
                    memory=memory,
                    episode_id=episode_id,
                    backend=backend,
                    verbose=verbose,
                )
                state["patterns_extracted"] = len(patterns)
                state["anti_patterns_extracted"] = len(anti_patterns)

                # Print summary
                if patterns or anti_patterns:
                    print(f"🧠 Pattern extraction complete:")
                    print(f"   + {len(patterns)} patterns stored in semantic memory")
                    print(f"   + {len(anti_patterns)} anti-patterns stored in negative knowledge")
                    # Re-print updated stats
                    stats = memory.stats()
                    print(f"   Updated memory: {stats['episodes']} episodes, "
                          f"{stats['semantic_notes']} patterns, "
                          f"{stats['skills']} skills, "
                          f"{stats['anti_patterns']} anti-patterns")
                else:
                    print(f"🧠 No new patterns extracted from this session")
            except Exception as e:
                print(f"⚠️  Pattern extraction failed: {e}")
                import traceback
                if verbose:
                    traceback.print_exc()

        except Exception as e:
            print(f"⚠️  Failed to save episode to memory: {e}")
        finally:
            memory.close()

    # === Print token summary ===
    total_tokens = state["token_stats"]["total_input_tokens"] + state["token_stats"]["total_output_tokens"]
    print(f"\n💰 Token usage (estimated):")
    print(f"   Input:  {state['token_stats']['total_input_tokens']:,}")
    print(f"   Output: {state['token_stats']['total_output_tokens']:,}")
    print(f"   Total:  {total_tokens:,}")
    if state["token_stats"]["per_iteration"]:
        for it in state["token_stats"]["per_iteration"]:
            print(f"   iter {it['iteration']}: {it['input_tokens']:,}+{it['output_tokens']:,}")

    # === Generate report ===
    report = generate_report(state)
    (output_dir / "report.md").write_text(report, encoding="utf-8")

    print(f"\n📋 Final report: {output_dir / 'report.md'}")
    print(f"📁 Final code: {final_dir}")

    return state


# ============================================================
# REPORT GENERATOR
# ============================================================

def generate_report(state: Dict[str, Any]) -> str:
    """Generate a markdown report summarizing the loop."""
    subjective_enabled = bool(state.get("subjective_audits"))
    final_subjective = state.get("final_subjective_score", 0.0)

    lines = [
        "# Hero 3D Awwwards — Agent Loop Report",
        "",
        f"**User request**: {state['user_prompt']}",
        f"**Iterations**: {state['iteration']}",
        f"**Final combined score**: {state['final_score']:.1f}/10",
    ]
    if subjective_enabled:
        lines.append(f"**Final subjective score**: {final_subjective:.1f}/10")
    lines.extend([
        f"**Outcome**: {state['stopped_reason']}",
        "",
        "## Iteration History",
        "",
    ])

    if subjective_enabled:
        lines.append("| Iteration | Auditor | User Sim | Combined | Obj Blockers | Subj Blockers |")
        lines.append("|-----------|---------|----------|----------|--------------|---------------|")
        for i, audit in enumerate(state["audits"], 1):
            score = audit.get("score", 0.0)
            blockers = len(audit.get("blockers", []))
            if i <= len(state["subjective_audits"]):
                subj = state["subjective_audits"][i - 1]
                subj_score = subj.get("subjective_score", 0.0)
                subj_blockers = len(subj.get("subjective_blockers", []))
            else:
                subj_score = 0.0
                subj_blockers = 0
            combined = (score * 0.6) + (subj_score * 0.4)
            lines.append(f"| {i} | {score:.1f} | {subj_score:.1f} | {combined:.1f} | {blockers} | {subj_blockers} |")
    else:
        lines.append("| Iteration | Score | Blockers | Passed | Failed |")
        lines.append("|-----------|-------|----------|--------|--------|")
        for i, audit in enumerate(state["audits"], 1):
            score = audit.get("score", 0.0)
            blockers = len(audit.get("blockers", []))
            passed = sum(1 for c in audit.get("criteria", []) if c.get("passed"))
            failed = sum(1 for c in audit.get("criteria", []) if not c.get("passed"))
            lines.append(f"| {i} | {score:.1f} | {blockers} | {passed} | {failed} |")

    lines.extend([
        "",
        "## Final Audit Summary (Objective — Auditor)",
        "",
    ])

    if state["audits"]:
        last = state["audits"][-1]
        lines.append(f"**Summary**: {last.get('summary', 'N/A')}")
        lines.append(f"**Recommendation**: {last.get('recommendation', 'N/A')}")
        lines.append("")
        lines.append("### Failed Criteria (last iteration)")
        lines.append("")
        for c in last.get("criteria", []):
            if not c.get("passed"):
                lines.append(f"- **{c['id']}** ({c.get('severity', '?')}): {c['name']}")
                if c.get("fix_hint"):
                    lines.append(f"  - Fix: {c['fix_hint']}")

    if subjective_enabled and state["subjective_audits"]:
        last_subj = state["subjective_audits"][-1]
        lines.extend([
            "",
            "## Final Subjective Summary (User Simulator)",
            "",
            f"**Subjective score**: {last_subj.get('subjective_score', 0.0):.1f}/10",
            f"**Summary**: {last_subj.get('summary', 'N/A')}",
            f"**Recommendation**: {last_subj.get('recommendation', 'N/A')}",
            "",
        ])

        # Soul analysis
        soul = last_subj.get("soul_analysis", {})
        if soul:
            lines.append(f"**Soul**: {soul.get('soul_description', 'N/A')}")
            lines.append(f"**Soul clarity**: {soul.get('soul_clarity', '?')}/10")
            lines.append("")

        # First impression
        fi = last_subj.get("first_impression", {})
        if fi:
            lines.append("### First Impression Scores")
            lines.append("")
            lines.append(f"- Hook clarity: {fi.get('hook_clarity', '?')}/10")
            lines.append(f"- Wow factor: {fi.get('wow_factor', '?')}/10")
            lines.append(f"- Memorability: {fi.get('memorability', '?')}/10")
            lines.append(f"- Premium feel: {fi.get('premium_feel', '?')}/10")
            lines.append("")

        # Competitive comparison
        cc = last_subj.get("competitive_comparison", {})
        if cc:
            lines.append("### Competitive Comparison")
            lines.append("")
            lines.append(f"**SOTD worthy**: {cc.get('sotd_worthy', False)}")
            if cc.get("sotd_gap"):
                lines.append(f"**SOTD gap**: {cc['sotd_gap']}")
            if cc.get("comparable_awwwards_sites"):
                lines.append(f"**Comparable to**: {', '.join(cc['comparable_awwwards_sites'])}")
            lines.append("")

        # Subjective blockers
        subj_blockers = last_subj.get("subjective_blockers", [])
        if subj_blockers:
            lines.append("### Subjective Blockers (last iteration)")
            lines.append("")
            for s in subj_blockers:
                lines.append(f"- **{s.get('id', 'S?')}** ({s.get('severity', '?')}): {s.get('name', '?')}")
                if s.get("fix_hint"):
                    lines.append(f"  - Fix: {s['fix_hint']}")

    lines.extend([
        "",
        "## Files in Final Output",
        "",
    ])
    for filepath in state["current_code"]:
        lines.append(f"- `{filepath}`")

    lines.extend([
        "",
        "## Next Steps",
        "",
    ])

    if state["stopped_reason"] == "success":
        lines.append("- Hero is ready. Copy files from `final/` to your project.")
        lines.append("- Run setup commands if not yet done.")
        lines.append("- Test in browser at mobile + desktop sizes.")
    elif state["stopped_reason"] == "stagnated":
        lines.append("- Loop stagnated. Review the last audit and subjective evaluation.")
        lines.append("- Possible root cause: archetype/stack mismatch with requirements.")
    elif state["stopped_reason"] == "escalated":
        lines.append("- Agent flagged for user review. Read the last audit.json and subjective.json carefully.")
        lines.append("- Address the blocker manually, then optionally re-run the loop.")
    elif state["stopped_reason"] == "diverged":
        lines.append("- Technical and creative signals diverged. The Corrector may be optimizing for")
        lines.append("  one at the expense of the other. Review the trajectory of both scores.")
        lines.append("- Possible causes: archetype mismatch, over-constrained prompt, or fundamental")
        lines.append("  trade-off between performance and wow factor.")
    elif state["stopped_reason"] == "max_iterations":
        lines.append("- Max iterations reached. Review what's still failing in both audits.")
        lines.append("- Consider: (a) increase max_iterations, (b) revise user prompt, (c) manual fixes.")
    else:
        lines.append("- Review the loop outcome and proceed accordingly.")

    return "\n".join(lines)


# ============================================================
# CLI ENTRY POINT
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Agent Loop for hero-3d-awwwards skill (4-agent: Creator → Auditor → User Simulator → Corrector) with memory system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python hero-loop.py --prompt "Diseña un hero 3D para portfolio de fotógrafo"
  python hero-loop.py --prompt "..." --max-iterations 7 --llm openai
  python hero-loop.py --prompt "..." --no-user-simulator  # faster, less rigorous
  python hero-loop.py --prompt "..." --min-subjective-score 8.0  # SOTD-quality bar
  python hero-loop.py --prompt "..." --no-memory  # disable cross-session memory (v3 behavior)
  python hero-loop.py --prompt "..." --vertical portfolio --archetype 2.5D-Parallax --stack css-3d
        """,
    )
    parser.add_argument("--prompt", required=True, help="User request for the hero")
    parser.add_argument("--max-iterations", type=int, default=DEFAULT_MAX_ITERATIONS)
    parser.add_argument("--min-score", type=float, default=DEFAULT_MIN_SCORE,
                        help="Minimum combined score (auditor*0.6 + subjective*0.4) to accept")
    parser.add_argument("--min-subjective-score", type=float, default=7.5,
                        help="Minimum subjective score from User Simulator (default 7.5)")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--llm", choices=["glm", "openai", "zai"], default="glm",
                        help="LLM backend to use")
    parser.add_argument("--model", default=None, help="Model name (default depends on backend)")
    parser.add_argument("--no-user-simulator", action="store_true",
                        help="Disable User Simulator (faster loop, less rigorous evaluation)")
    parser.add_argument("--no-memory", action="store_true",
                        help="Disable memory system (v3 behavior: full replay, no cross-session learning)")
    parser.add_argument("--memory-db", type=Path, default=None,
                        help="Path to memory SQLite DB (default: output_dir/memory.db)")
    parser.add_argument("--memory-lancedb", type=Path, default=None,
                        help="Path to LanceDB dir (default: output_dir/.lancedb)")
    parser.add_argument("--vertical", default="",
                        help="Vertical hint for memory retrieval (saas, portfolio, ecommerce, agency)")
    parser.add_argument("--archetype", default="",
                        help="Archetype hint (2.5D-Parallax, 3D-Scene, Shaders, Distortion, Text-3D)")
    parser.add_argument("--stack", default="",
                        help="Stack hint (r3f, threejs-vanilla, css-3d)")
    parser.add_argument("--verbose", action="store_true", default=True)

    args = parser.parse_args()

    backend = get_backend(args.llm, args.model)

    state = run_loop(
        user_prompt=args.prompt,
        backend=backend,
        output_dir=args.output_dir,
        max_iterations=args.max_iterations,
        min_score=args.min_score,
        min_subjective_score=args.min_subjective_score,
        enable_user_simulator=not args.no_user_simulator,
        enable_memory=not args.no_memory,
        memory_db=args.memory_db,
        memory_lancedb=args.memory_lancedb,
        vertical=args.vertical,
        archetype=args.archetype,
        stack=args.stack,
        verbose=args.verbose,
    )

    # Exit code based on outcome
    if state["stopped_reason"] in ("success", "score_sufficient"):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
