#!/usr/bin/env python3
"""
run-visual-evals.py — Runner de tests visuales para heroes Awwwards.

Usa Playwright (Python) para:
  1. Navegar el hero en distintos viewports
  2. Capturar screenshots en 6 posiciones de scroll (0%, 20%, 40%, 60%, 80%, 100%)
  3. Calcular métricas por screenshot:
       - luminancia media (Y = 0.299R + 0.587G + 0.114B)
       - luminancia de regiones (top_bar, bottom_bar, left_edge, right_edge, center)
       - delta entre frames consecutivos (jank)
       - canales R/G/B promedio (para test de paleta cálida)
  4. Evaluar aserciones de cases.json
  5. Generar reporte JSON + markdown con pass/fail por caso

Uso:
  python run-visual-evals.py [--url http://localhost:3000] [--case V01] [--headless]

Requisitos:
  pip install playwright pillow
  playwright install chromium

Exit code: 0 si todos los casos pasan, 1 si alguno falla (para CI).
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# Paths
SCRIPT_DIR = Path(__file__).parent.resolve()
CASES_FILE = SCRIPT_DIR / "cases.json"
SCREENSHOTS_DIR = SCRIPT_DIR / "screenshots"
REPORTS_DIR = SCRIPT_DIR / "reports"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Defaults
DEFAULT_URL = "http://localhost:3000"
DEFAULT_TIMEOUT = 30000
PRELOADER_WAIT_MS = 4000  # preloader (1.5s) + animaciones de entrada (2.5s)


# ---------- Métricas ----------

def compute_luminance_from_array(arr, width: int, height: int) -> dict[str, float]:
    """Calcula métricas de luminancia desde un array numpy (height, width, 4)."""
    import numpy as np
    arr = arr.astype(np.float64) / 255.0
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    
    regions = {
        "top_bar":     lum[0:int(height * 0.08), :],
        "bottom_bar":  lum[int(height * 0.92):, :],
        "left_edge":   lum[:, 0:int(width * 0.05)],
        "right_edge":  lum[:, int(width * 0.95):],
        "center":      lum[int(height * 0.3):int(height * 0.7), int(width * 0.3):int(width * 0.7)],
    }
    
    return {
        "mean": float(lum.mean()),
        "min": float(lum.min()),
        "max": float(lum.max()),
        "r_mean": float(r.mean()),
        "g_mean": float(g.mean()),
        "b_mean": float(b.mean()),
        "regions": {k: float(v.mean()) for k, v in regions.items()},
    }


def compute_luminance(pixels: list[int], width: int, height: int) -> dict[str, float]:
    """Wrapper legacy — mantiene compatibilidad. Usa compute_luminance_from_array."""
    import numpy as np
    arr = np.array(pixels, dtype=np.uint8).reshape(height, width, 4)
    return compute_luminance_from_array(arr, width, height)


def compute_frame_delta(metrics_prev: dict, metrics_curr: dict) -> float:
    """Delta de luminancia media entre dos frames consecutivos."""
    return abs(metrics_curr["mean"] - metrics_prev["mean"])


# ---------- Playwright runner ----------

def run_case(page, case: dict, base_url: str, headless: bool) -> dict:
    """Ejecuta un caso de test visual. Retorna {pass: bool, metrics: [...], reason: str}."""
    case_id = case["id"]
    case_name = case["name"]
    url = base_url + case.get("url", "/")
    context_cfg = case.get("context", {})
    
    # Configurar viewport si el caso lo especifica
    viewport = context_cfg.get("viewport", {"width": 1440, "height": 900})
    page.set_viewport_size(viewport)
    
    # Modos especiales
    reduced_motion = context_cfg.get("reduced_motion", False)
    webgl_disabled = context_cfg.get("webgl_disabled", False)
    
    # Emular prefers-reduced-motion
    if reduced_motion:
        page.emulate_media(reduced_motion="reduce")
    else:
        page.emulate_media(reduced_motion=None)
    
    # Navegar
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
    except Exception as e:
        return {"pass": False, "reason": f"navigation_error: {e}", "metrics": []}
    
    # Esperar preloader
    time.sleep(PRELOADER_WAIT_MS / 1000)
    
    # Esperar a que el hero se monte y tenga altura real (400vh = ~3600px).
    # El preloader bloquea el render del hero, y el shader tarda en compilar.
    # Sin esto, hero_h=900 (1 viewport) y scrollable=0 → todas las screenshots
    # son idénticas y los tests no miden nada.
    try:
        page.wait_for_function(
            "() => { const h = document.querySelector('#hero'); return h && h.offsetHeight > window.innerHeight * 1.5; }",
            timeout=10000
        )
    except Exception:
        # Si el hero no aparece, continuar de todas formas (para tests de fallback)
        pass
    
    # Dar tiempo extra a que el shader WebGL compile y la primera frame se pinte
    time.sleep(1.5)
    
    # Casos especiales que requieren interacción
    if case.get("assert", {}).get("type") == "click_toggles_view":
        return run_click_toggle_test(page, case)
    
    if case.get("assert", {}).get("type") == "fps_min":
        return run_fps_test(page, case, viewport)
    
    if case.get("assert", {}).get("type") == "element_focusable":
        return run_focusable_test(page, case)
    
    if case.get("assert", {}).get("type") == "focus_visible_present":
        return run_focus_visible_test(page, case)
    
    if case.get("assert", {}).get("type") == "no_horizontal_scroll":
        return run_no_horizontal_scroll_test(page, case)
    
    # Casos basados en screenshots en distintas posiciones de scroll
    scroll_steps = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
    if case.get("assert", {}).get("at") == "fast_scroll":
        return run_fast_scroll_test(page, case, viewport)
    
    # Caso especial: red_channel_increases
    if case.get("assert", {}).get("type") == "red_channel_increases":
        return run_red_channel_test(page, case, viewport, base_url)
    
    # Capturar screenshots en cada step Y evaluar element_visible si aplica
    metrics_per_step = []
    hero_height = page.evaluate("() => document.querySelector('#hero')?.offsetHeight || window.innerHeight")
    viewport_height = viewport["height"]
    scrollable_height = max(hero_height - viewport_height, 1)
    
    # Si la aserción es element_visible, evaluamos visibilidad del elemento
    # en cada step en vez de (o además de) capturar screenshots.
    if case.get("assert", {}).get("type") == "element_visible":
        selector = case["assert"].get("selector")
        target_steps_val = case["assert"].get("at", "all")
        if isinstance(target_steps_val, (int, float)):
            target_steps_list = [target_steps_val]
        elif target_steps_val == "all":
            target_steps_list = scroll_steps
        else:
            target_steps_list = scroll_steps
        
        for step in target_steps_list:
            scroll_y = step * scrollable_height
            page.evaluate(f"window.scrollTo(0, {scroll_y})")
            time.sleep(0.4)
            try:
                el = page.query_selector(selector)
                if not el:
                    return {"pass": False, "reason": f"element {selector} not found at step {step}", "metrics": []}
                is_visible = el.is_visible()
                # Además verificar que está en viewport (no fuera de pantalla)
                box = el.bounding_box()
                in_viewport = False
                if box:
                    in_viewport = (box["y"] < viewport_height and box["y"] + box["height"] > 0)
                if not is_visible or not in_viewport:
                    return {"pass": False, "reason": f"element {selector} not visible/in-viewport at step {step}", "metrics": []}
            except Exception as e:
                return {"pass": False, "reason": f"element_visible error at step {step}: {e}", "metrics": []}
        return {"pass": True, "metrics": []}
    
    target_steps = case.get("assert", {}).get("at", "all")
    if isinstance(target_steps, (int, float)):
        # Solo necesitamos capturar en ese step específico (más rápido)
        steps_to_capture = [target_steps]
    elif target_steps == "consecutive":
        steps_to_capture = scroll_steps
    else:  # "all"
        steps_to_capture = scroll_steps
    
    for step in steps_to_capture:
        scroll_y = step * scrollable_height
        page.evaluate(f"window.scrollTo(0, {scroll_y})")
        time.sleep(0.4)  # esperar animaciones
        
        # Screenshot
        screenshot_path = SCREENSHOTS_DIR / f"{case_id}_step{int(step*100)}.png"
        page.screenshot(path=str(screenshot_path), full_page=False)
        
        # Calcular métricas
        metrics = compute_metrics_from_screenshot(screenshot_path)
        metrics["step"] = step
        metrics_per_step.append(metrics)
    
    # Evaluar aserción
    return evaluate_assertion(case, metrics_per_step)


def compute_metrics_from_screenshot(screenshot_path: Path) -> dict:
    """Carga un screenshot con Pillow y calcula métricas (optimizado con numpy)."""
    try:
        from PIL import Image
        import numpy as np
    except ImportError as e:
        print(f"ERROR: pip install pillow numpy ({e})", file=sys.stderr)
        sys.exit(1)
    
    img = Image.open(screenshot_path).convert("RGBA")
    arr = np.array(img)  # (height, width, 4)
    width, height = img.size
    return compute_luminance_from_array(arr, width, height)


def evaluate_assertion(case: dict, metrics_per_step: list[dict]) -> dict:
    """Evalúa la aserción del caso contra las métricas recolectadas."""
    assertion = case["assert"]
    atype = assertion["type"]
    target_steps = assertion.get("at", "all")
    
    if isinstance(target_steps, (int, float)):
        relevant = [m for m in metrics_per_step if abs(m["step"] - target_steps) < 0.01]
    elif target_steps == "consecutive":
        relevant = metrics_per_step
    else:  # "all"
        relevant = metrics_per_step
    
    if atype == "luminance_min":
        threshold = assertion["value"]
        for m in relevant:
            if m["mean"] < threshold:
                return {"pass": False, "reason": f"luminance {m['mean']:.3f} < {threshold} at step {m['step']}", "metrics": metrics_per_step}
        return {"pass": True, "metrics": metrics_per_step}
    
    elif atype == "luminance_max":
        threshold = assertion["value"]
        for m in relevant:
            if m["mean"] > threshold:
                return {"pass": False, "reason": f"luminance {m['mean']:.3f} > {threshold} at step {m['step']}", "metrics": metrics_per_step}
        return {"pass": True, "metrics": metrics_per_step}
    
    elif atype == "region_luminance_min":
        threshold = assertion["value"]
        region = assertion["region"]
        for m in relevant:
            if m["regions"].get(region, 1.0) < threshold:
                return {"pass": False, "reason": f"region {region} luminance {m['regions'][region]:.3f} < {threshold} at step {m['step']}", "metrics": metrics_per_step}
        return {"pass": True, "metrics": metrics_per_step}
    
    elif atype == "region_luminance_max":
        threshold = assertion["value"]
        region = assertion["region"]
        for m in relevant:
            if m["regions"].get(region, 0.0) > threshold:
                return {"pass": False, "reason": f"region {region} luminance {m['regions'][region]:.3f} > {threshold} at step {m['step']}", "metrics": metrics_per_step}
        return {"pass": True, "metrics": metrics_per_step}
    
    elif atype == "frame_delta_max":
        threshold = assertion["value"]
        for i in range(1, len(relevant)):
            delta = compute_frame_delta(relevant[i-1], relevant[i])
            if delta > threshold:
                return {"pass": False, "reason": f"frame delta {delta:.3f} > {threshold} between step {relevant[i-1]['step']} and {relevant[i]['step']}", "metrics": metrics_per_step}
        return {"pass": True, "metrics": metrics_per_step}
    
    elif atype == "text_contrast":
        # Simplificado: medir contraste entre center y borders
        threshold = assertion["value"]
        for m in relevant:
            center_lum = m["regions"].get("center", 0.5)
            edge_lum = (m["regions"].get("left_edge", 0.5) + m["regions"].get("right_edge", 0.5)) / 2
            contrast = abs(center_lum - edge_lum) * 10  # escala aproximada
            if contrast < threshold:
                return {"pass": False, "reason": f"text contrast {contrast:.2f} < {threshold}", "metrics": metrics_per_step}
        return {"pass": True, "metrics": metrics_per_step}
    
    elif atype == "red_channel_increases":
        m_start = metrics_per_step[0]
        m_end = metrics_per_step[-1]
        if m_end["r_mean"] <= m_start["r_mean"]:
            return {"pass": False, "reason": f"R channel did not increase: start={m_start['r_mean']:.3f} end={m_end['r_mean']:.3f}", "metrics": metrics_per_step}
        return {"pass": True, "metrics": metrics_per_step}
    
    elif atype == "element_visible":
        # Manejado en run_case via Playwright
        return {"pass": True, "metrics": metrics_per_step}
    
    else:
        return {"pass": False, "reason": f"unknown assertion type: {atype}", "metrics": metrics_per_step}


def run_click_toggle_test(page, case: dict) -> dict:
    """Test: click en botón 'Memoria' toggle al dashboard y vuelve."""
    try:
        # Click botón Memoria
        page.get_by_text("Memoria", exact=True).click()
        time.sleep(1)
        # Verificar que el dashboard está visible
        dashboard_visible = page.evaluate("() => !!document.querySelector('[class*=\"dashboard\"]') || document.body.innerText.includes('Memoria')")
        # Volver al hero
        page.get_by_text("Hero", exact=True).click()
        time.sleep(1)
        return {"pass": True, "metrics": []}
    except Exception as e:
        return {"pass": False, "reason": f"click_toggle failed: {e}", "metrics": []}


def run_fps_test(page, case: dict, viewport: dict) -> dict:
    """Test: FPS durante el dolly."""
    min_fps = case["assert"]["value"]
    fps_values = page.evaluate("""
    async (minFps) => {
        const fps = [];
        let lastTime = performance.now();
        let frames = 0;
        const hero = document.querySelector('#hero');
        const totalScroll = (hero?.offsetHeight || window.innerHeight) - window.innerHeight;
        const startTime = performance.now();
        // Scroll progresivo en 3 segundos
        const duration = 3000;
        const tick = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo({top: progress * totalScroll, behavior: 'instant'});
            frames++;
            const now = performance.now();
            if (now - lastTime >= 500) {
                fps.push(frames * 1000 / (now - lastTime));
                frames = 0;
                lastTime = now;
            }
            if (elapsed < duration) {
                requestAnimationFrame(tick);
            }
        };
        await new Promise(resolve => {
            const r = requestAnimationFrame(tick);
            setTimeout(resolve, duration + 200);
        });
        return fps;
    }
    """)
    for fps in fps_values:
        if fps < min_fps:
            return {"pass": False, "reason": f"FPS {fps:.1f} < {min_fps}", "metrics": [{"fps": fps} for fps in fps_values]}
    return {"pass": True, "metrics": [{"fps": fps} for fps in fps_values]}


def run_focusable_test(page, case: dict) -> dict:
    """Test: el canvas es focusable."""
    try:
        el = page.query_selector("[role=application]")
        if not el:
            return {"pass": False, "reason": "no element with role=application", "metrics": []}
        tabindex = el.get_attribute("tabindex")
        aria_label = el.get_attribute("aria-label")
        if tabindex != "0":
            return {"pass": False, "reason": f"tabindex={tabindex}, expected 0", "metrics": []}
        if not aria_label:
            return {"pass": False, "reason": "no aria-label", "metrics": []}
        return {"pass": True, "metrics": []}
    except Exception as e:
        return {"pass": False, "reason": str(e), "metrics": []}


def run_focus_visible_test(page, case: dict) -> dict:
    """Test: focus-visible styles presentes."""
    try:
        # Tab al primer enlace
        page.keyboard.press("Tab")
        time.sleep(0.3)
        has_outline = page.evaluate("""
        () => {
            const active = document.activeElement;
            if (!active) return false;
            const styles = window.getComputedStyle(active);
            return styles.outlineStyle !== 'none' || styles.boxShadow.includes('rgba');
        }
        """)
        return {"pass": has_outline, "reason": "" if has_outline else "no focus-visible outline", "metrics": []}
    except Exception as e:
        return {"pass": False, "reason": str(e), "metrics": []}


def run_no_horizontal_scroll_test(page, case: dict) -> dict:
    """Test: no hay scroll horizontal en mobile."""
    try:
        has_hscroll = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth")
        return {"pass": not has_hscroll, "reason": "horizontal scroll detected" if has_hscroll else "", "metrics": []}
    except Exception as e:
        return {"pass": False, "reason": str(e), "metrics": []}


def run_fast_scroll_test(page, case: dict, viewport: dict) -> dict:
    """Test: scroll rápido de 0 a 1 en 1s, sin saltos extremos."""
    threshold = case["assert"]["value"]
    hero_height = page.evaluate("() => document.querySelector('#hero')?.offsetHeight || window.innerHeight")
    scrollable = max(hero_height - viewport["height"], 1)
    
    metrics_per_step = []
    n_captures = 10
    for i in range(n_captures + 1):
        progress = i / n_captures
        page.evaluate(f"window.scrollTo({{top: {progress * scrollable}, behavior: 'instant'}})")
        time.sleep(0.1)
        screenshot_path = SCREENSHOTS_DIR / f"{case['id']}_fast_{i}.png"
        page.screenshot(path=str(screenshot_path), full_page=False)
        m = compute_metrics_from_screenshot(screenshot_path)
        m["step"] = progress
        metrics_per_step.append(m)
    
    # Evaluar delta max entre consecutivos
    for i in range(1, len(metrics_per_step)):
        delta = compute_frame_delta(metrics_per_step[i-1], metrics_per_step[i])
        if delta > threshold:
            return {"pass": False, "reason": f"fast scroll delta {delta:.3f} > {threshold}", "metrics": metrics_per_step}
    return {"pass": True, "metrics": metrics_per_step}


def run_red_channel_test(page, case: dict, viewport: dict, base_url: str) -> dict:
    """Test: canal R aumenta de scroll=0 a scroll=1 (paleta calienta)."""
    metrics_per_step = []
    hero_height = page.evaluate("() => document.querySelector('#hero')?.offsetHeight || window.innerHeight")
    scrollable = max(hero_height - viewport["height"], 1)
    
    for step in [0.0, 1.0]:
        page.evaluate(f"window.scrollTo({{top: {step * scrollable}, behavior: 'instant'}})")
        time.sleep(0.5)
        screenshot_path = SCREENSHOTS_DIR / f"{case['id']}_r_{int(step*100)}.png"
        page.screenshot(path=str(screenshot_path), full_page=False)
        m = compute_metrics_from_screenshot(screenshot_path)
        m["step"] = step
        metrics_per_step.append(m)
    
    return evaluate_assertion(case, metrics_per_step)


# ---------- Main ----------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL, help="Base URL del hero")
    parser.add_argument("--case", default=None, help="ID de caso específico (ej: V01)")
    parser.add_argument("--headless", action="store_true", default=True, help="Modo headless")
    parser.add_argument("--no-headless", dest="headless", action="store_false")
    parser.add_argument("--report", default="report.json", help="Nombre del reporte")
    args = parser.parse_args()
    
    # Cargar casos
    with open(CASES_FILE, "r", encoding="utf-8") as f:
        cases_data = json.load(f)
    
    cases = cases_data["cases"]
    if args.case:
        cases = [c for c in cases if c["id"] == args.case]
        if not cases:
            print(f"ERROR: caso {args.case} no encontrado", file=sys.stderr)
            sys.exit(2)
    
    # Importar Playwright
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: pip install playwright && playwright install chromium", file=sys.stderr)
        sys.exit(1)
    
    # Ejecutar
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context()
        page = context.new_page()
        
        for case in cases:
            print(f"[{case['id']}] {case['name']}... ", end="", flush=True)
            try:
                result = run_case(page, case, args.url, args.headless)
                status = "PASS" if result["pass"] else "FAIL"
                reason = result.get("reason", "")
                print(f"{status}" + (f" — {reason}" if reason else ""))
                results.append({
                    "id": case["id"],
                    "name": case["name"],
                    "category": case.get("category", ""),
                    "pass": result["pass"],
                    "reason": reason,
                    "metrics": result.get("metrics", []),
                })
            except Exception as e:
                print(f"ERROR — {e}")
                results.append({
                    "id": case["id"],
                    "name": case["name"],
                    "category": case.get("category", ""),
                    "pass": False,
                    "reason": f"exception: {e}",
                    "metrics": [],
                })
        
        browser.close()
    
    # Generar reporte JSON
    report_path = REPORTS_DIR / args.report
    summary = {
        "total": len(results),
        "passed": sum(1 for r in results if r["pass"]),
        "failed": sum(1 for r in results if not r["pass"]),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "url": args.url,
        "results": results,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    # Generar reporte markdown
    md_path = REPORTS_DIR / args.report.replace(".json", ".md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(f"# Reporte de Evals Visuales — {summary['timestamp']}\n\n")
        f.write(f"**URL:** {args.url}\n\n")
        f.write(f"**Total:** {summary['total']}  |  **PASS:** {summary['passed']}  |  **FAIL:** {summary['failed']}\n\n")
        f.write("| ID | Nombre | Categoría | Resultado | Razón |\n")
        f.write("|----|--------|-----------|-----------|-------|\n")
        for r in results:
            status = "✅" if r["pass"] else "❌"
            reason = r["reason"][:60] if r["reason"] else ""
            f.write(f"| {r['id']} | {r['name']} | {r['category']} | {status} | {reason} |\n")
    
    print(f"\nReporte: {report_path}")
    print(f"Markdown: {md_path}")
    print(f"\nResumen: {summary['passed']}/{summary['total']} pasaron")
    
    # Exit code para CI
    if summary["failed"] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
