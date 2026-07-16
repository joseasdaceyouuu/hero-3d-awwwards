#!/usr/bin/env python3
"""
auto-loop-v2.py — Loop end-to-end real con VLM integrado.

Mejoras vs auto-loop.py:
  1. Escribe el código generado a src/app/auto-loop/page.tsx
  2. Hace build + restart del servidor automáticamente
  3. VLM audita el hero generado (no uno existente)
  4. Corrector recibe feedback VLM real
  5. Itera hasta score >= 8.0 o max_iteraciones

Uso:
  python auto-loop-v2.py --brief "Hero para marca de música electrónica"
"""

import argparse
import json
import os
import subprocess
import sys
import time
import shutil
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
PROMPTS_DIR = SCRIPT_DIR / "prompts"


def llm_complete(system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
    """Llama al LLM via z-ai CLI."""
    combined = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}"
    output_file = f"/tmp/auto-loop-v2-{int(time.time()*1000)}.json"
    try:
        result = subprocess.run(
            ["z-ai", "chat", "-p", combined, "-m", "glm-4.6", "-o", output_file],
            capture_output=True, text=True, timeout=300  # 5 min timeout
        )
        if result.returncode != 0:
            return f"ERROR: {result.stderr[:200]}"
        output_path = Path(output_file)
        if output_path.exists():
            data = json.loads(output_path.read_text(encoding="utf-8"))
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return result.stdout
    except subprocess.TimeoutExpired:
        return "ERROR: LLM timeout (300s)"
    except Exception as e:
        return f"ERROR: {e}"


def stage_retrieve(brief: str, memory: MemorySystem) -> dict:
    """Stage 1: Recupera patrones de memoria."""
    print("\n📚 Stage 1: Recuperando patrones de memoria...")
    patterns = memory.semantic.search(brief, top_k=5, vertical_filter=None)
    anti_patterns = memory.anti_patterns.search(brief, top_k=3)
    skills = memory.procedural.search(brief, top_k=3, vertical_filter=None)
    episodes = memory.episodic.search_similar(brief, top_k=2, vertical_filter=None)

    context = {
        "patterns": [{"content": p.get("content", ""), "score": s} for p, s in patterns],
        "anti_patterns": [{"description": a.get("description", "")} for a in anti_patterns],
        "skills": [{"description": s.get("description", "")} for s, _ in skills],
        "episodes": [{"brief_summary": e.get("brief_summary", "")} for e, _ in episodes],
    }
    print(f"  ✓ {len(context['patterns'])} patrones, {len(context['anti_patterns'])} anti-patterns")
    return context


def stage_create(brief: str, memory_context: dict, force_layout: str = None, force_simple: bool = False) -> str:
    """Stage 2: Creator genera código. Soporta force_layout y force_simple para circuit-breaker."""
    print("\n🎨 Stage 2: Creator generando hero...")
    # Usar versión simplificada del prompt para evitar timeout
    creator_prompt = """Eres un Creator de heroes web nivel Awwwards. Generas código React/Next.js.

REGLAS CRÍTICAS:
1. SOLO importa de: @/lib/library/components/LetterReveal, ConnectedParticles, GoldenDust, MouseGlow, Preloader
2. NO uses framer-motion (no instalado)
3. NO uses @/lib/library/shaders/* (son .glsl)
4. USA overflow-x: clip (no hidden) en main
5. Si usas LetterReveal dentro de <h1>, pasa as="span"
6. Si el hero tiene canvas con pointer-events: none, usa window.addEventListener para mouse
7. Si usas preloader custom div, añade useEffect con setTimeout(()=>setLoaded(true), 1800)
8. Elige un layout DISTINTO (no centrado): B split, C grid 3-col, G corner, H tipográfico
9. USA español para todo texto visible
10. Paleta <= 3 colores
11. Máximo 200 líneas de código
"""
    memory_str = json.dumps(memory_context, indent=2, ensure_ascii=False)[:2000]  # Limitar tamaño

    layout_hint = ""
    if force_layout:
        layout_hint = f"\n\nLAYOUT OBLIGATORIO: usa Layout {force_layout} (G=minimalist corner, contenido en esquina inferior izquierda, tipografía gigante). NO uses layout centrado."

    simple_hint = ""
    if force_simple:
        simple_hint = "\n\nSIMPLIFICACIÓN: genera código mínimo (<100 líneas), sin canvas, sin animaciones complejas. Solo tipografía + CTA + CSS."

    user_prompt = f"""BRIEF:
{brief}

CONTEXTO DE MEMORIA (patrones recuperados):
{memory_str}{layout_hint}{simple_hint}

Genera el código completo del hero. Devuelve SOLO el código en:
```tsx
[código completo]
```
"""
    output = llm_complete(creator_prompt, user_prompt, temperature=0.7)

    code = ""
    if "```tsx" in output:
        start = output.find("```tsx") + 6
        end = output.find("```", start)
        if end > start:
            code = output[start:end].strip()

    # Si no hay ```tsx, intentar otros markers
    if not code:
        for marker in ["```jsx", "```javascript", "```ts", "```"]:
            if marker in output:
                start = output.find(marker) + len(marker)
                end = output.find("```", start)
                if end > start:
                    code = output[start:end].strip()
                    break

    print(f"  ✓ Código generado: {len(code)} chars")

    # POST-PROCESAMIENTO AUTOMÁTICO (anti-pattern 5.16 fix)
    if code:
        from post_process_code import post_process
        code, fixes = post_process(code, brief)
        if fixes:
            print(f"  🔧 Post-procesamiento: {len(fixes)} fixes aplicados")
            for f in fixes:
                print(f"     ✓ {f}")

    return code


def stage_write_and_build(code: str, route: str = "auto-loop") -> bool:
    """Stage 2.5: Escribe código a archivo + build + restart server."""
    print(f"\n🔨 Stage 2.5: Escribiendo a /{route} + build + restart...")

    route_dir = PROJECT_DIR / "src" / "app" / route
    route_dir.mkdir(parents=True, exist_ok=True)

    # Escribir código
    page_file = route_dir / "page.tsx"
    page_file.write_text(code, encoding="utf-8")
    print(f"  ✓ Escrito: {page_file}")

    # Kill server
    subprocess.run(["pkill", "-9", "-f", "next"], capture_output=True)
    time.sleep(2)

    # Build
    print("  Building...")
    build_result = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(PROJECT_DIR),
        capture_output=True, text=True, timeout=180
    )
    if build_result.returncode != 0:
        print(f"  ✗ Build failed: {build_result.stderr[-300:]}")
        return False
    print("  ✓ Build OK")

    # Start server
    print("  Starting server...")
    log_file = open("/tmp/nextjs-autoloop.log", "w")
    subprocess.Popen(
        ["npm", "run", "start"],
        cwd=str(PROJECT_DIR),
        stdout=log_file, stderr=log_file,
        start_new_session=True
    )
    time.sleep(6)

    # Verificar
    import urllib.request
    try:
        url = f"http://localhost:3000/{route}"
        req = urllib.request.urlopen(url, timeout=10)
        if req.status == 200:
            print(f"  ✓ Server ready at {url}")
            return True
    except Exception:
        pass
    print(f"  ✗ Server not ready")
    return False


def stage_vlm_audit(url: str, hero_name: str) -> dict:
    """Stage 3: VLM Auditor analiza visualmente."""
    print(f"\n🔍 Stage 3: VLM Auditor analizando visualmente...")

    sys.path.insert(0, str(SKILL_DIR / "evals" / "visual"))
    from vlm_auditor import audit_hero

    result = audit_hero(url, hero_name, steps=[0.0, 0.5, 1.0])

    if "error" in result:
        print(f"  ✗ Error: {result['error']}")
        return {"score": 0, "bugs": [], "recomendaciones": []}

    print(f"  ✓ Score VLM: {result['avg_score']}/10, {result['total_bugs']} bugs")
    return {
        "score": result["avg_score"],
        "bugs": [b["bug"] for b in result.get("bugs", [])],
        "recomendaciones": [r["rec"] for r in result.get("recomendaciones", [])],
    }


def stage_correct(brief: str, audit_result: dict, previous_code: str, iteration: int) -> str:
    """Stage 4: Corrector corrige según feedback VLM."""
    print(f"\n🔧 Stage 4: Corrector (iteración {iteration})...")

    corrector_prompt = (PROMPTS_DIR / "corrector.md").read_text(encoding="utf-8")

    audit_str = json.dumps({
        "score": audit_result["score"],
        "bugs": audit_result["bugs"][:3],  # top 3
        "recomendaciones": audit_result["recomendaciones"][:3],
    }, indent=2, ensure_ascii=False)

    user_prompt = f"""BRIEF:
{brief}

CÓDIGO ACTUAL (primeros 4000 chars):
```tsx
{previous_code[:4000]}
```

FEEDBACK DEL VLM AUDITOR (análisis visual):
{audit_str}

Aplica las correcciones para subir el score. Devuelve SOLO el código corregido en:
```tsx
[código corregido completo]
```
"""
    output = llm_complete(corrector_prompt, user_prompt, temperature=0.5)

    code = previous_code
    if "```tsx" in output:
        start = output.find("```tsx") + 6
        end = output.find("```", start)
        if end > start:
            code = output[start:end].strip()

    print(f"  ✓ Código corregido: {len(code)} chars")
    return code


def stage_extract(brief: str, code: str, score: float, memory: MemorySystem, name: str, audit_result: dict = None) -> str:
    """Stage 5: Extrae patrones y guarda en memoria. Incluye bugs del VLM como anti-patterns."""
    print(f"\n💾 Stage 5: Extrayendo a memoria...")
    memory.start_session(
        brief=brief,
        brief_summary=f"{name} — auto-loop-v2",
        vertical="auto",
        archetype="auto",
        stack="auto",
    )
    memory.save_iteration(
        iteration=1,
        code={"auto-loop.tsx": code},
        audit={"score": score, "feedback": "Auto-loop-v2"},
        subjective={"score": score, "feedback": "Loop automático"},
    )
    ep_id = memory.finalize_session(
        outcome="success" if score >= 7 else "needs_work",
        final_score=score,
        final_subjective_score=score,
        user_feedback=f"Auto-loop-v2 score: {score}",
    )

    # Extracción heurística de patrones positivos
    patterns = []
    if "LetterReveal" in code: patterns.append("Letter reveal aplicado")
    if "ConnectedParticles" in code: patterns.append("Partículas con conexiones")
    if "GoldenDust" in code: patterns.append("Golden dust al click")
    if "MouseGlow" in code: patterns.append("Mouse glow con screen")
    if "Preloader" in code: patterns.append("Preloader cinematográfico")
    if "overflow" in code.lower() and "clip" in code.lower(): patterns.append("overflow-x: clip (5.9)")
    if 'as="span"' in code or "as='span'" in code: patterns.append("as='span' en LetterReveal (5.13)")
    if "window.addEventListener" in code: patterns.append("window listener para mouse (5.14)")
    if "setTimeout" in code and "setLoaded" in code: patterns.append("Preloader con timer (5.18)")

    for p in patterns:
        memory.semantic.add(content=f"[{name}] {p}", vertical="auto", category="pattern", importance=7, source_episodes=[ep_id])

    # CERRAR LOOP ANTI-PATTERNS: bugs del VLM → anti_patterns en memoria
    if audit_result and audit_result.get("bugs"):
        print(f"  Escribiendo {len(audit_result['bugs'])} bugs del VLM como anti-patterns...")
        for bug in audit_result["bugs"][:5]:  # top 5 bugs
            existing = memory.anti_patterns.find_similar(bug)
            if existing:
                memory.anti_patterns.record_occurrence(existing["id"], episode_id=ep_id)
                print(f"    ↻ Anti-pattern existente +1 ocurrencia: {bug[:60]}")
            else:
                memory.anti_patterns.add(
                    description=f"[VLM] {bug}",
                    failure_mode="visual",
                    episode_id=ep_id,
                )
                print(f"    ✗ Nuevo anti-pattern: {bug[:60]}")

    print(f"  ✓ Episodio: {ep_id[:8]}..., {len(patterns)} patrones, {len(audit_result.get('bugs',[])) if audit_result else 0} anti-patterns")
    return ep_id


def run_loop(brief: str, max_iter: int = 2, target: float = 8.0, route: str = "auto-loop"):
    print("=" * 70)
    print("AUTO-LOOP V2 — CON VLM INTEGRADO")
    print("=" * 70)
    print(f"Brief: {brief[:80]}...")
    print(f"Max iter: {max_iter}, Target: {target}/10")
    print("=" * 70)

    memory = MemorySystem(db_path=str(DB_PATH), lancedb_path=str(LANCEDB_PATH), embedder=LLMKeywordEmbedder())

    # Stage 1
    ctx = stage_retrieve(brief, memory)

    # Stage 2
    code = stage_create(brief, ctx)
    if not code or len(code) < 200:
        print("\n✗ Creator no generó código válido")
        return {"success": False, "reason": "no code"}

    hero_name = f"AutoLoop-{int(time.time())}"
    url = f"http://localhost:3000/{route}"

    # Iteraciones con circuit-breaker
    history = []
    scores_history = []
    archetype_changed = False

    for i in range(max_iter):
        print(f"\n{'='*40} ITERACIÓN {i+1}/{max_iter} {'='*40}")

        # CIRCUIT-BREAKER: si score no mejora en 2 iters consecutivas, cambiar approach
        if i >= 2 and not archetype_changed:
            if len(scores_history) >= 2 and scores_history[-1] <= scores_history[-2]:
                print(f"\n⚠️  Circuit-breaker: score no mejoró ({scores_history[-2]}→{scores_history[-1]}). Cambiando approach...")
                # Forzar un layout distinto en el código
                code = stage_create(brief, ctx, force_layout="G")  # minimalist corner
                archetype_changed = True
                continue

        # Stage 2.5: build + serve
        if not stage_write_and_build(code, route):
            print("  Build falló, reintentando con código simplificado...")
            # Fallback: generar código más simple
            code = stage_create(brief, ctx, force_simple=True)
            if not stage_write_and_build(code, route):
                print("  ✗ Build falló de nuevo, saltando iteración")
                continue

        # Stage 3: VLM audit
        audit = stage_vlm_audit(url, hero_name)
        history.append(audit)
        scores_history.append(audit["score"])

        if audit["score"] >= target:
            print(f"\n✓ Target alcanzado: {audit['score']}/10")
            break

        if i < max_iter - 1:
            # Stage 4: correct
            code = stage_correct(brief, audit, code, i + 1)

    # Stage 5: extract — pasar audit_result para cerrar loop anti-patterns
    final_score = history[-1]["score"] if history else 0
    final_audit = history[-1] if history else None
    ep_id = stage_extract(brief, code, final_score, memory, hero_name, audit_result=final_audit)
    memory.close()

    result = {
        "success": final_score >= target,
        "hero_name": hero_name,
        "route": f"/{route}",
        "final_score": final_score,
        "iterations": len(history),
        "history": [{"score": h["score"], "bugs": len(h["bugs"])} for h in history],
        "episode_id": ep_id,
    }

    print(f"\n{'='*70}")
    print("RESULTADO FINAL")
    print("=" * 70)
    print(f"Hero: {hero_name}")
    print(f"Ruta: /{route}")
    print(f"Score final: {final_score}/10")
    print(f"Iteraciones: {len(history)}")
    print(f"Éxito: {'✓' if result['success'] else '✗'}")
    print(f"Episodio: {ep_id[:8]}...")

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--brief", required=True)
    parser.add_argument("--max-iter", type=int, default=2)
    parser.add_argument("--target", type=float, default=8.0)
    parser.add_argument("--route", default="auto-loop")
    args = parser.parse_args()
    result = run_loop(args.brief, args.max_iter, args.target, args.route)
    print(json.dumps(result, indent=2, ensure_ascii=False))
