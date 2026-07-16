#!/usr/bin/env python3
"""
loop-completo-es.py — Ejecuta el loop completo Creator → Auditor → Corrector
en español con GLM-5.2.

Genera un hero de "causticas submarinas" usando los 48 patrones + 16 anti-patterns
de memoria, lo audita, y aplica correcciones si es necesario.
"""

import importlib.util
import json
import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPTS_DIR))

spec = importlib.util.spec_from_file_location("hero_loop", SCRIPTS_DIR / "hero-loop.py")
hero_loop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hero_loop)

from memory import MemorySystem, FakeEmbedder, clear_cache
from memory.extraction import extract_patterns_from_episode


def main():
    print("=" * 70)
    print("🔄 LOOP COMPLETO EN ESPAÑOL — Creator → Auditor → Corrector")
    print("   Modelo: GLM-5.2")
    print("=" * 70)
    print()

    # Brief del usuario
    brief = """Crea un hero con CAUSTICAS SUBMARINAS — luz que atraviesa agua
y proyecta patrones de luz en el fondo del océano.

Requisitos:
- Shader procedural de causticas (patrones de luz que se mueven como agua real)
- Profundidad: sensación de estar bajo el agua
- Partículas flotando (plancton/Polvo submarino)
- Mouse genera ondas en la superficie del agua
- Paleta: azul profundo + cyan + verde acqua
- Timing cinematográfico (1.5s+, power3.out)
- prefers-reduced-motion fallback
- WebGL fallback (gradient CSS)
- DPR clamp [1, 2]
- IntersectionObserver pause-offscreen (PERF-1)
- React.lazy + Suspense (PERF-5)
- Navegación por teclado (A11Y-3): role=application, tabIndex=0, arrow keys
- focus-visible CSS (C18)
- Contraste WCAG AA 4.5:1 (C15)
- HTML semántico (C16)
- Una idea dominante (C9): las causticas SON el hero
- Paleta ≤ 3 colores (C10)

Stack: Next.js 16 + React Three Fiber + GSAP
TODO el texto debe estar en ESPAÑOL.
Output: código completo y ejecutable."""

    # Setup memoria
    clear_cache()
    db_path = Path("/home/z/my-project/memory-data/memory.db")
    lancedb_path = Path("/home/z/my-project/memory-data/lancedb")
    embedder = FakeEmbedder(dimension=64)
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    memory.start_session(
        brief=brief,
        brief_summary="causticas submarinas luz agua oceanico profundo hero shader",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
    )

    patterns = memory.working.retrieved_patterns
    anti_patterns = memory.working.retrieved_anti_patterns
    stats = memory.stats()

    print(f"📊 Memoria: {stats['episodes']} episodios, {stats['semantic_notes']} patrones, {stats['anti_patterns']} anti-patrones")
    print(f"🎯 Recuperados: {len(patterns)} patrones, {len(anti_patterns)} anti-patrones")
    print()

    memory.close()

    # Construir bloque de memoria
    memory_block = "\n# Contexto de Memoria (de 4 heroes anteriores + estándares 2026)\n"
    if patterns:
        memory_block += "## Patrones Relevantes\n"
        for p in patterns[:5]:
            memory_block += f"- [imp={p.get('importance', 5)}/10] {p.get('content', '')}\n"
        memory_block += "\n"
    if anti_patterns:
        memory_block += "## Anti-patrones a EVITAR\n"
        for ap in anti_patterns[:3]:
            memory_block += f"- [{ap.get('failure_mode', '?')}] {ap.get('description', '')}\n"
        memory_block += "\n"

    memory_block += """## Estándares 2026 Obligatorios
- PERF-1: IntersectionObserver para pausar render cuando no es visible
- PERF-5: React.lazy + Suspense para componentes WebGL
- C15: Text opacity >= 0.95 para WCAG AA 4.5:1
- C18: focus-visible CSS para navegación por teclado
- A11Y-3: Navegación por teclado en escena 3D (role=application, tabIndex=0, arrow keys)
- C7: prefers-reduced-motion fallback
- C12: WebGL fallback (no pantalla en blanco)
"""

    backend = hero_loop.get_backend("zai-direct", "glm-5.2")

    # === STEP 1: CREATOR ===
    print("━" * 70)
    print("STEP 1: CREATOR AGENT (GLM-5.2)")
    print("━" * 70)
    print()

    system_creator = """Eres el Agente Creator para el skill hero-3d-awwwards.
Generas heroes web nivel Awwwards Site of the Day con animación 2.5D y 3D.

IMPORTANTE: Todo el texto del hero debe estar en ESPAÑOL.

Sigue el workflow de 7 pasos del skill estrictamente.
Output: manifiesto, archivos, código completo, comandos de setup, notas.

Reglas críticas:
1. NUNCA uses linear easing en animaciones primarias
2. NUNCA uses más de 3 colores en la paleta
3. NUNCA tengas 2+ efectos compitiendo
4. SIEMPRE incluye prefers-reduced-motion
5. SIEMPRE incluye WebGL fallback
6. SIEMPRE usa IntersectionObserver para pause-offscreen
7. SIEMPRE usa React.lazy + Suspense
8. SIEMPRE incluye navegación por teclado (A11Y-3)
9. TODO el texto visible debe estar en ESPAÑOL
"""

    user_creator = f"""# Petición del Usuario
{brief}
{memory_block}
# Tarea
Genera la iteración 1 del hero. Sigue el workflow de 7 pasos estrictamente.
Output: manifiesto, archivos, código completo, comandos de setup, notas.

Formato:
## Manifiesto
[JSON]

## Archivos Creados
[lista]

## Código
### `path/to/file.tsx`
```tsx
[código]
```

## Notas
[decisiones]
"""

    print("  🧠 Llamando Creator (GLM-5.2)...")
    t0 = time.time()
    creator_output = backend.complete(system_creator, user_creator, temperature=0.7)
    creator_time = time.time() - t0
    print(f"  ⏱️  Completado en {creator_time:.1f}s")
    print(f"  📝 Output: {len(creator_output):,} chars")
    print()

    # Guardar output del Creator
    Path("/home/z/my-project/download/creator-causticas-es.md").write_text(creator_output, encoding="utf-8")
    print(f"  💾 Guardado: download/creator-causticas-es.md")

    # Preview
    print()
    print("  PREVIEW (primeros 2000 chars):")
    print(creator_output[:2000])
    if len(creator_output) > 2000:
        print(f"  ... ({len(creator_output) - 2000} más chars)")
    print()

    # === STEP 2: AUDITOR ===
    print("━" * 70)
    print("STEP 2: AUDITOR AGENT (GLM-5.2)")
    print("━" * 70)
    print()

    system_auditor = """Eres el Agente Auditor (GLM-5.2). Evalúa este hero contra los estándares web 2026.
Responde en español. Output JSON estricto.

Schema:
{
  \"puntaje\": 0-10,
  \"pasa\": boolean,
  \"cumplidos\": int,
  \"fallidos\": int,
  \"criticos\": [\"lista de IDs\"],
  \"fortalezas\": [\"lista\"],
  \"recomendacion\": \"entregar | continuar_loop | rework_mayor\"
}

Verifica: C5,C7,C9,C10,C11,C12,C15,C16,C18,PERF-1,PERF-5,A11Y-1,A11Y-3,CLARITY-1,CLARITY-2,TSL-1
Sé preciso con evidencia.
"""

    user_auditor = f"""# Hero: CAUSTICAS SUBMARINAS (generado por Creator)

# Código
{creator_output[:15000]}

# Tarea
Audita con GLM-5.2. Output JSON en español.
"""

    print("  🧠 Llamando Auditor (GLM-5.2)...")
    t0 = time.time()
    auditor_output = backend.complete(system_auditor, user_auditor, temperature=0.2)
    auditor_time = time.time() - t0
    print(f"  ⏱️  Completado en {auditor_time:.1f}s")
    print()

    # Parse auditor
    auditor_output_clean = auditor_output.strip()
    if auditor_output_clean.startswith("```"):
        lines = auditor_output_clean.split("\n")[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        auditor_output_clean = "\n".join(lines)

    try:
        audit = json.loads(auditor_output_clean)
        score = audit.get("puntaje", 0)
        passed = audit.get("pasa", False)
        cumplidos = audit.get("cumplidos", 0)
        fallidos = audit.get("fallidos", 0)
        criticos = audit.get("criticos", [])
        rec = audit.get("recomendacion", "?")

        print(f"  📊 Puntaje: {score}/10 | Pasa: {'✅' if passed else '❌'}")
        print(f"  Cumplidos: {cumplidos} | Fallidos: {fallidos} | Críticos: {len(criticos)}")
        if criticos:
            print(f"  Críticos: {', '.join(criticos)}")
        print(f"  Recomendación: {rec}")
        print()

        fortalezas = audit.get("fortalezas", [])
        if fortalezas:
            print("  Fortalezas:")
            for s in fortalezas[:3]:
                print(f"    ✅ {s[:100]}")
        print()
    except Exception as e:
        print(f"  ⚠️  Error parseando auditoría: {e}")
        print(f"  Output: {auditor_output[:300]}")
        score = 0
        rec = "error"

    # === STEP 3: CORRECTOR (si es necesario) ===
    if rec == "entregar" or score >= 9:
        print("━" * 70)
        print("STEP 3: CORRECTOR — NO NECESARIO (score >= 9)")
        print("━" * 70)
        print()
        print("  ✅ El hero pasa la auditoría. No se requiere corrección.")
    else:
        print("━" * 70)
        print("STEP 3: CORRECTOR AGENT (GLM-5.2)")
        print("━" * 70)
        print()

        system_corrector = """Eres el Agente Corrector. Aplicas fixes mínimos basados en el feedback del Auditor.
Responde en español. Output: código corregido con changelog.
"""

        user_corrector = f"""# Código del Creator
{creator_output[:15000]}

# Feedback del Auditor
{json.dumps(audit, indent=2, ensure_ascii=False)}

# Tarea
Aplica los fixes mínimos necesarios. Output el código corregido.
"""

        print("  🧠 Llamando Corrector (GLM-5.2)...")
        t0 = time.time()
        corrector_output = backend.complete(system_corrector, user_corrector, temperature=0.5)
        corrector_time = time.time() - t0
        print(f"  ⏱️  Completado en {corrector_time:.1f}s")
        print(f"  📝 Output: {len(corrector_output):,} chars")
        print()

        Path("/home/z/my-project/download/corrector-causticas-es.md").write_text(corrector_output, encoding="utf-8")
        print(f"  💾 Guardado: download/corrector-causticas-es.md")

    # === RESUMEN ===
    print("=" * 70)
    print("📊 RESUMEN DEL LOOP")
    print("=" * 70)
    print(f"  Creator: {creator_time:.1f}s → {len(creator_output):,} chars")
    print(f"  Auditor: {auditor_time:.1f}s → Score {score}/10")
    if rec != "entregar" and score < 9:
        print(f"  Corrector: {corrector_time:.1f}s → {len(corrector_output):,} chars")
    print(f"  Recomendación final: {rec}")
    print(f"  Idioma: Español ✅")
    print()
    print("✅ LOOP COMPLETO FINALIZADO")


if __name__ == "__main__":
    main()
