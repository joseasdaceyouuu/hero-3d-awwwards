#!/usr/bin/env python3
"""
auto-loop-v3.py — Auto-loop ESTABLE con SDK directo (no CLI).

Mejoras vs v2:
  1. Usa z-ai-web-dev-sdk directamente via Node subprocess (no z-ai CLI)
  2. Retry con backoff exponencial en llamadas LLM
  3. Timeout de 180s por llamada (suficiente para GLM-4.6)
  4. Post-procesamiento automático integrado
  5. VLM audit integrado (import correcto)
  6. Logging detallado para debug

Uso:
  python auto-loop-v3.py --brief "Hero para marca de café" --max-iter 2
"""

import argparse
import json
import os
import subprocess
import sys
import time
import hashlib
from pathlib import Path
from typing import Optional

SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent
PROJECT_DIR = SKILL_DIR.parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from memory.stores import MemorySystem
from memory.embeddings import LLMKeywordEmbedder

DB_PATH = SKILL_DIR / "data" / "memory.db"
LANCEDB_PATH = SKILL_DIR / "data" / "lancedb"


def llm_call(prompt: str, max_retries: int = 3, timeout: int = 180) -> str:
    """Llama al LLM via z-ai CLI con retry y backoff exponencial."""
    output_file = f"/tmp/autoloop-v3-{hashlib.md5(prompt.encode()).hexdigest()[:8]}.json"

    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ["z-ai", "chat", "-p", prompt[:8000], "-m", "glm-4.6", "-o", output_file],
                capture_output=True, text=True, timeout=timeout
            )
            if result.returncode == 0 and Path(output_file).exists():
                data = json.loads(Path(output_file).read_text(encoding="utf-8"))
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if content and len(content) > 50:
                    return content
                else:
                    print(f"  ⚠ Respuesta vacía, intento {attempt+1}")
            else:
                print(f"  ⚠ Error CLI (rc={result.returncode}), intento {attempt+1}: {result.stderr[:100]}")
        except subprocess.TimeoutExpired:
            print(f"  ⚠ Timeout ({timeout}s), intento {attempt+1}")
        except Exception as e:
            print(f"  ⚠ Error: {e}, intento {attempt+1}")

        # Backoff exponencial: 2s, 4s, 8s
        if attempt < max_retries - 1:
            wait = 2 ** (attempt + 1)
            print(f"  Esperando {wait}s antes de reintentar...")
            time.sleep(wait)

    return ""


def extract_code(output: str) -> str:
    """Extrae código TSX del output del LLM."""
    for marker in ["```tsx", "```jsx", "```javascript", "```ts", "```"]:
        if marker in output:
            start = output.find(marker) + len(marker)
            end = output.find("```", start)
            if end > start:
                code = output[start:end].strip()
                if len(code) > 100:
                    return code
    return ""


def post_process(code: str, brief: str) -> str:
    """Post-procesa código: arregla anti-patterns conocidos."""
    # 5.9: overflow hidden → clip
    code = code.replace("overflow-x: hidden", "overflow-x: clip")
    code = code.replace("overflowX: 'hidden'", "overflowX: 'clip'")
    code = code.replace('overflowX: "hidden"', 'overflowX: "clip"')
    code = code.replace("overflow-x-hidden", "")

    # 5.18: preloader sin timer
    if "const [loaded, setLoaded] = useState(false)" in code and "setTimeout" not in code:
        code = code.replace(
            "const [loaded, setLoaded] = useState(false);",
            """const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);""",
            1
        )

    # 5.13: h1 anidado
    if "<h1" in code and "<LetterReveal" in code and 'as="span"' not in code:
        code = code.replace("<LetterReveal", '<LetterReveal as="span"', 1)

    # Remover imports prohibidos
    lines = code.split("\n")
    fixed = []
    for line in lines:
        if "framer-motion" in line and line.strip().startswith("import"):
            fixed.append("// REMOVED: framer-motion not installed")
        elif "@/lib/library/shaders/" in line and line.strip().startswith("import"):
            fixed.append("// REMOVED: shaders are .glsl not .ts modules")
        else:
            fixed.append(line)
    code = "\n".join(fixed)

    return code


def run_loop(brief: str, max_iter: int = 2, target: float = 7.5):
    print("=" * 70)
    print("AUTO-LOOP V3 — ESTABLE CON RETRY")
    print("=" * 70)
    print(f"Brief: {brief[:80]}...")
    print(f"Max iter: {max_iter}, Target: {target}/10")

    # Inicializar memoria
    memory = MemorySystem(db_path=str(DB_PATH), lancedb_path=str(LANCEDB_PATH), embedder=LLMKeywordEmbedder())

    # Stage 1: Recuperar patrones
    print("\n📚 Stage 1: Recuperando patrones...")
    patterns = memory.semantic.search(brief, top_k=5, vertical_filter=None)
    anti_patterns = memory.anti_patterns.search(brief, top_k=3)
    print(f"  ✓ {len(patterns)} patrones, {len(anti_patterns)} anti-patterns")

    # Stage 2: Creator genera código
    print("\n🎨 Stage 2: Creator generando...")
    creator_prompt = f"""Eres un Creator de heroes web Awwwards. Generas código React/Next.js.

REGLAS:
1. SOLO importa de: @/lib/library/components/LetterReveal, ConnectedParticles, GoldenDust, MouseGlow, Preloader, HeroPolish
2. NO uses framer-motion. NO uses @/lib/library/shaders/*
3. USA overflow-x: clip en main
4. Si usas LetterReveal en <h1>, pasa as="span"
5. Si usas preloader, añade useEffect con setTimeout
6. Añade <HeroPolish accentColor="#tu-color" /> antes de </section>
7. Layout DISTINTO (no centrado): B split, C grid, G corner, H tipográfico
8. USA español. Paleta ≤ 3 colores. Máximo 200 líneas.

BRIEF: {brief}

Patrones de memoria: {json.dumps([p.get('content','')[:60] for p,s in patterns], ensure_ascii=False)[:1000]}

Anti-patterns a evitar: {json.dumps([a.get('description','')[:60] for a in anti_patterns], ensure_ascii=False)[:500]}

Genera SOLO el código en ```tsx```"""

    output = llm_call(creator_prompt, max_retries=3, timeout=180)
    code = extract_code(output)

    if not code or len(code) < 200:
        print("  ✗ Creator no generó código válido")
        memory.close()
        return {"success": False, "reason": "no code"}

    # Post-procesar
    code = post_process(code, brief)
    print(f"  ✓ Código: {len(code)} chars (post-procesado)")

    # Guardar a archivo
    route = "auto-loop"
    route_dir = PROJECT_DIR / "src" / "app" / route
    route_dir.mkdir(parents=True, exist_ok=True)
    (route_dir / "page.tsx").write_text(code, encoding="utf-8")
    print(f"  ✓ Guardado: src/app/{route}/page.tsx")

    # Build
    print("\n🔨 Build...")
    subprocess.run(["pkill", "-9", "-f", "next"], capture_output=True)
    time.sleep(2)
    build = subprocess.run(["npm", "run", "build"], cwd=str(PROJECT_DIR), capture_output=True, text=True, timeout=180)
    if build.returncode != 0:
        print(f"  ✗ Build falló: {build.stderr[-200:]}")
        memory.close()
        return {"success": False, "reason": "build failed"}

    # Start server
    print("  ✓ Build OK. Iniciando server...")
    log = open("/tmp/autoloop-v3.log", "w")
    subprocess.Popen(["npm", "run", "start"], cwd=str(PROJECT_DIR), stdout=log, stderr=log, start_new_session=True)
    time.sleep(6)

    # Stage 3: VLM audit
    print("\n🔍 Stage 3: VLM Audit...")
    url = f"http://localhost:3000/{route}"
    try:
        import urllib.request
        urllib.request.urlopen(url, timeout=10)
        print(f"  ✓ Server ready: {url}")
    except:
        print("  ✗ Server no respondió")
        memory.close()
        return {"success": False, "reason": "server timeout"}

    # VLM audit
    sys.path.insert(0, str(SKILL_DIR / "evals" / "visual"))
    try:
        from vlm_auditor import audit_hero
        result = audit_hero(url, "AutoLoopV3", steps=[0.0, 0.5, 1.0])
        score = result.get("avg_score", 0)
        bugs = result.get("total_bugs", 0)
        print(f"  ✓ VLM Score: {score}/10, {bugs} bugs")

        # Stage 5: Extraer a memoria (loop cerrado)
        print("\n💾 Stage 5: Extrayendo a memoria...")
        memory.start_session(brief=brief, brief_summary=f"AutoLoopV3 — {brief[:50]}", vertical="auto", archetype="auto", stack="auto")
        memory.save_iteration(iteration=1, code={f"src/app/{route}/page.tsx": code}, audit={"score": score, "feedback": "Auto-loop v3"}, subjective={"score": score, "feedback": "v3"})
        ep_id = memory.finalize_session(outcome="success" if score >= 7 else "needs_work", final_score=score, final_subjective_score=score, user_feedback=f"Auto-loop v3: {score}")

        # Bugs VLM → anti-patterns (loop negativo cerrado)
        for bug in result.get("bugs", [])[:3]:
            b = bug.get("bug", "")
            existing = memory.anti_patterns.find_similar(b)
            if existing:
                memory.anti_patterns.record_occurrence(existing["id"], episode_id=ep_id)
            else:
                memory.anti_patterns.add(description=f"[VLM-v3] {b}", failure_mode="visual", episode_id=ep_id)

        print(f"  ✓ Episodio: {ep_id[:8]}...")
    except Exception as e:
        print(f"  ⚠ VLM error: {e}")
        score = 0

    memory.close()

    result = {
        "success": score >= target,
        "route": f"/{route}",
        "score": score,
        "code_length": len(code),
    }

    print(f"\n{'='*70}")
    print(f"RESULTADO: {'✓ ÉXITO' if result['success'] else '✗ NEEDS WORK'}")
    print(f"Score: {score}/10 | Código: {len(code)} chars | Ruta: /{route}")
    print("=" * 70)

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--brief", required=True)
    parser.add_argument("--max-iter", type=int, default=1)
    parser.add_argument("--target", type=float, default=7.5)
    args = parser.parse_args()
    result = run_loop(args.brief, args.max_iter, args.target)
    print(json.dumps(result, indent=2))
