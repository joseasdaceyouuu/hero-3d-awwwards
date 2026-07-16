#!/usr/bin/env python3
"""
vlm-auditor.py — Auditor visual con VLM (Vision Language Model).

Toma screenshots del hero en distintas posiciones de scroll, los envía
al VLM (z-ai CLI) con un prompt estructurado, y recibe análisis:

  - Bugs visuales detectados (pantalla negra, contraste, composición)
  - Score por área (visual, motion, accessibility)
  - Recomendaciones específicas

Esto cierra el último gap del loop autónomo: el Auditor ahora "ve" el
resultado, no solo lee el código.

Uso:
  python vlm-auditor.py --url http://localhost:3000/merida
  python vlm-auditor.py --url http://localhost:3000/vervain --steps 4
  python vlm-auditor.py --screenshot /path/to/screenshot.png --prompt custom

Requisitos:
  - z-ai CLI instalado (npm install -g z-ai-web-dev-sdk)
  - Playwright (pip install playwright && playwright install chromium)
"""

import argparse
import json
import os
import subprocess
import sys
import time
import base64
from pathlib import Path
from typing import Optional

# Paths
SCRIPT_DIR = Path(__file__).parent.resolve()
SCREENSHOTS_DIR = SCRIPT_DIR / "screenshots"
REPORTS_DIR = SCRIPT_DIR / "reports"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Default scroll positions
DEFAULT_STEPS = [0.0, 0.25, 0.5, 0.75, 1.0]


# ============================================================
# SCREENSHOT CAPTURE (Playwright)
# ============================================================

def capture_screenshots(url: str, steps: list[float], output_prefix: str, wait_ms: int = 4000) -> list[Path]:
    """Captura screenshots en distintas posiciones de scroll."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: pip install playwright && playwright install chromium", file=sys.stderr)
        sys.exit(1)

    screenshots = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1440, "height": 900})

        print(f"  Navigating to {url}...", flush=True)
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        time.sleep(wait_ms / 1000)

        # Esperar a que el hero tenga altura real
        try:
            page.wait_for_function(
                "() => { const h = document.querySelector('#hero, section'); return h && h.offsetHeight > window.innerHeight * 0.8; }",
                timeout=8000
            )
        except Exception:
            pass
        time.sleep(1.5)

        hero_height = page.evaluate("() => document.querySelector('#hero, section')?.offsetHeight || window.innerHeight")
        scrollable = max(hero_height - 900, 1)
        print(f"  Hero height: {hero_height}px, scrollable: {scrollable}px", flush=True)

        for step in steps:
            scroll_y = step * scrollable
            page.evaluate(f"window.scrollTo(0, {scroll_y})")
            time.sleep(0.5)

            path = SCREENSHOTS_DIR / f"{output_prefix}_step{int(step*100)}.png"
            page.screenshot(path=str(path), full_page=False)
            screenshots.append(path)
            print(f"  ✓ {path.name}", flush=True)

        browser.close()

    return screenshots


# ============================================================
# VLM ANALYSIS (z-ai CLI)
# ============================================================

VLM_AUDIT_PROMPT = """Eres un auditor visual experto en heroes web nivel Awwwards. Analiza este screenshot de un hero web y proporciona una auditoría estructurada.

Evalúa las siguientes áreas (score 1-10 cada una):

1. **VISUAL** (composición, jerarquía, equilibrio, uso del espacio)
2. **CONTRASTE** (legibilidad del texto contra el fondo, WCAG)
3. **PROFUNDIDAD** (sensación de capas, Z-depth, parallax si aplica)
4. **MOTION** (si se perciben animaciones, fluides, no estático)
5. **ELEGANCIA** (pulido, atención al detalle, premium feel)

Detecta PROBLEMAS específicos:
- ¿Hay zonas negras muertas o pantallas en negro?
- ¿El texto es legible contra el fondo?
- ¿La composición está balanceada o hay elementos mal posicionados?
- ¿Se ven bordes negros o artefactos?
- ¿Hay elementos solapados incorrectamente?
- ¿El scroll indicator / CTAs / HUD están bien posicionados?

Devuelve EXACTAMENTE este formato JSON (sin markdown, sin texto extra):
{
  "scores": {
    "visual": <1-10>,
    "contraste": <1-10>,
    "profundidad": <1-10>,
    "motion": <1-10>,
    "elegancia": <1-10>
  },
  "overall_score": <promedio 1-10>,
  "bugs_detectados": [
    "descripción del bug 1",
    "descripción del bug 2"
  ],
  "fortalezas": [
    "fortaleza 1",
    "fortaleza 2"
  ],
  "recomendaciones": [
    "recomendación específica 1",
    "recomendación específica 2"
  ]
}"""


def analyze_screenshot_with_vlm(screenshot_path: Path, prompt: str = VLM_AUDIT_PROMPT) -> Optional[dict]:
    """Envía screenshot al VLM via z-ai CLI y parsea la respuesta JSON."""
    output_file = f"/tmp/vlm-audit-{screenshot_path.stem}.json"
    try:
        result = subprocess.run(
            [
                "z-ai", "vision",
                "-p", prompt,
                "-i", str(screenshot_path),
                "-o", output_file
            ],
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            print(f"  ✗ z-ai CLI error: {result.stderr[:200]}", file=sys.stderr)
            return None

        # El CLI devuelve JSON con estructura de chat completion
        output_path = Path(output_file)
        if not output_path.exists():
            return _parse_vlm_response(result.stdout)

        try:
            data = json.loads(output_path.read_text(encoding="utf-8"))
            # Estructura: {choices: [{message: {content: "..."}}]}
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if content:
                return _parse_vlm_response(content)
            return None
        except Exception as e:
            print(f"  ✗ Parse error: {e}", file=sys.stderr)
            return None

    except subprocess.TimeoutExpired:
        print(f"  ✗ VLM timeout", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  ✗ VLM error: {e}", file=sys.stderr)
        return None


def _parse_vlm_response(text: str) -> Optional[dict]:
    """Extrae JSON de la respuesta del VLM (puede tener texto alrededor)."""
    # Buscar el primer { y el último }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None

    json_str = text[start:end+1]
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Intentar limpiar comillas simples, etc.
        try:
            # Remover markdown code fences si existen
            json_str = json_str.replace("```json", "").replace("```", "").strip()
            return json.loads(json_str)
        except Exception:
            return None


# ============================================================
# MULTI-STEP ANALYSIS
# ============================================================

def audit_hero(url: str, hero_name: str, steps: list[float]) -> dict:
    """Audita un hero completo: captura screenshots en varios pasos y los analiza."""
    print(f"\n{'='*60}")
    print(f"AUDITANDO: {hero_name}")
    print(f"URL: {url}")
    print(f"Steps: {steps}")
    print(f"{'='*60}")

    # Capturar screenshots
    print(f"\n📸 Capturando screenshots...")
    prefix = hero_name.lower().replace(" ", "-")
    screenshots = capture_screenshots(url, steps, prefix)
    if not screenshots:
        return {"hero": hero_name, "error": "No se pudieron capturar screenshots"}

    # Analizar cada screenshot
    print(f"\n🔍 Analizando con VLM...")
    analyses = []
    for i, ss in enumerate(screenshots):
        step = steps[i] if i < len(steps) else 0
        print(f"\n  Step {int(step*100)}% — {ss.name}")
        analysis = analyze_screenshot_with_vlm(ss)
        if analysis:
            analysis["step"] = step
            analysis["screenshot"] = str(ss)
            analyses.append(analysis)
            scores = analysis.get("scores", {})
            overall = analysis.get("overall_score", 0)
            bugs = len(analysis.get("bugs_detectados", []))
            print(f"    Overall: {overall}/10, Bugs: {bugs}")
        else:
            print(f"    ✗ No se pudo analizar")

    # Agregar scores
    if not analyses:
        return {"hero": hero_name, "error": "No se pudo analizar ningún screenshot", "analyses": []}

    all_scores = [a.get("overall_score", 0) for a in analyses]
    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

    all_bugs = []
    for a in analyses:
        for bug in a.get("bugs_detectados", []):
            all_bugs.append({"step": a.get("step", 0), "bug": bug})

    all_recs = []
    for a in analyses:
        for rec in a.get("recomendaciones", []):
            all_recs.append({"step": a.get("step", 0), "rec": rec})

    result = {
        "hero": hero_name,
        "url": url,
        "avg_score": round(avg_score, 1),
        "total_bugs": len(all_bugs),
        "total_recomendaciones": len(all_recs),
        "bugs": all_bugs,
        "recomendaciones": all_recs,
        "analyses_per_step": analyses,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    return result


# ============================================================
# REPORT GENERATION
# ============================================================

def generate_report(results: list[dict], output_path: Path):
    """Genera reporte JSON + markdown."""
    # JSON
    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    # Markdown
    md_path = output_path.with_suffix(".md")
    lines = [
        f"# VLM Audit Report — {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        f"**Heroes auditados:** {len(results)}",
        "",
        "| Hero | Score promedio | Bugs | Recomendaciones |",
        "|------|----------------|------|-----------------|",
    ]
    for r in results:
        if "error" in r:
            lines.append(f"| {r['hero']} | ERROR | - | - |")
        else:
            lines.append(f"| {r['hero']} | {r['avg_score']}/10 | {r['total_bugs']} | {r['total_recomendaciones']} |")

    lines.append("")

    for r in results:
        if "error" in r:
            continue
        lines.append(f"## {r['hero']} — Score: {r['avg_score']}/10")
        lines.append("")

        if r["bugs"]:
            lines.append("### 🐛 Bugs detectados")
            for b in r["bugs"]:
                lines.append(f"- **Step {int(b['step']*100)}%**: {b['bug']}")
            lines.append("")

        if r["recomendaciones"]:
            lines.append("### 💡 Recomendaciones")
            for rec in r["recomendaciones"][:5]:  # top 5
                lines.append(f"- **Step {int(rec['step']*100)}%**: {rec['rec']}")
            lines.append("")

        # Scores por step
        lines.append("### 📊 Scores por step")
        lines.append("| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |")
        lines.append("|------|--------|-----------|-------------|--------|-----------|---------|")
        for a in r["analyses_per_step"]:
            s = a.get("scores", {})
            lines.append(
                f"| {int(a.get('step', 0)*100)}% | {s.get('visual', '-')} | {s.get('contraste', '-')} | "
                f"{s.get('profundidad', '-')} | {s.get('motion', '-')} | {s.get('elegancia', '-')} | "
                f"{a.get('overall_score', '-')} |"
            )
        lines.append("")

    md_path.write_text("\n".join(lines), encoding="utf-8")
    return md_path


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="VLM Auditor para heroes Awwwards")
    parser.add_argument("--url", default="http://localhost:3000", help="URL del hero")
    parser.add_argument("--name", default="hero", help="Nombre del hero para el reporte")
    parser.add_argument("--steps", nargs="+", type=float, default=DEFAULT_STEPS, help="Posiciones de scroll (0-1)")
    parser.add_argument("--all", action="store_true", help="Auditar los 4 heroes conocidos")
    parser.add_argument("--report", default="vlm-audit-report.json", help="Archivo de reporte")
    args = parser.parse_args()

    if args.all:
        # Auditar los 4 heroes
        heroes = [
            ("PROFUNDIDAD", "http://localhost:3000/"),
            ("VERVAIN", "http://localhost:3000/vervain"),
            ("PIXELVOID", "http://localhost:3000/pixelvoid"),
            ("MÉRIDA", "http://localhost:3000/merida"),
        ]
        results = []
        for name, url in heroes:
            result = audit_hero(url, name, args.steps)
            results.append(result)

        # Generar reporte
        report_path = REPORTS_DIR / args.report
        md_path = generate_report(results, report_path)

        print(f"\n{'='*60}")
        print("REPORTE GENERADO")
        print(f"{'='*60}")
        print(f"JSON: {report_path}")
        print(f"Markdown: {md_path}")
        print(f"\nResumen:")
        for r in results:
            if "error" in r:
                print(f"  {r['hero']}: ERROR — {r['error']}")
            else:
                print(f"  {r['hero']}: {r['avg_score']}/10, {r['total_bugs']} bugs, {r['total_recomendaciones']} recs")
    else:
        # Auditar un solo hero
        result = audit_hero(args.url, args.name, args.steps)
        report_path = REPORTS_DIR / args.report
        generate_report([result], report_path)
        print(f"\nReporte: {report_path}")


if __name__ == "__main__":
    main()
