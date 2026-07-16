#!/usr/bin/env python3
"""
loop-creator-v2-completo.py — Loop completo con Creator v2 skill-aware.

Creator recibe:
  1. Registry.json (metadata de skills)
  2. CÓDIGO REAL de los shaders GLSL (no solo descripciones)
  3. Patrones de memoria
  4. Anti-patrones

Luego: Creator → Auditor → Corrector (si es necesario)
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

LIBRARY_DIR = SCRIPTS_DIR.parent / "library"


def load_shader_code(shader_name: str) -> str:
    """Carga el código real de un shader de la librería."""
    path = LIBRARY_DIR / "shaders" / f"{shader_name}.glsl"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"// {shader_name}.glsl not found"


def main():
    print("=" * 70)
    print("🔄 LOOP COMPLETO — Creator v2 (skill-aware + código real)")
    print("=" * 70)
    print()

    brief = """Crea un hero con AURORA BOREAL para una agencia creativa.
Inmersivo, atmosférico, cinematográfico.
La aurora debe tener movimiento visible y elegante.
Texto en español. Paleta: verde aurora + magenta + deep blue."""

    # Cargar registry
    registry = json.loads((LIBRARY_DIR / "registry.json").read_text(encoding="utf-8"))

    # Cargar CÓDIGO REAL de los shaders más relevantes
    shader_code = {}
    for name in ["noise", "aurora", "postprocessing", "caustics", "fresnel"]:
        code = load_shader_code(name)
        if not code.startswith("// "):
            # Truncar si es muy largo (ahorrar tokens)
            if len(code) > 3000:
                code = code[:3000] + "\n// ... (truncado, ver archivo completo)"
            shader_code[name] = code

    print(f"📚 Registry: {len(registry.get('skills', [])) + len(registry.get('tier2_skills', [])) + len(registry.get('tier3_skills', []))} skills")
    print(f"📄 Shaders con código real: {list(shader_code.keys())}")
    print()

    # Memoria
    clear_cache()
    db_path = Path("/home/z/my-project/memory-data/memory.db")
    lancedb_path = Path("/home/z/my-project/memory-data/lancedb")
    embedder = FakeEmbedder(dimension=64)
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    memory.start_session(
        brief=brief,
        brief_summary="aurora boreal agencia creativa inmersivo atmosferico cinematografico",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
    )
    patterns = memory.working.retrieved_patterns
    anti_patterns = memory.working.retrieved_anti_patterns
    memory.close()

    print(f"📊 Memoria: {len(patterns)} patrones, {len(anti_patterns)} anti-patrones recuperados")
    print()

    # === CREATOR v2 ===
    print("━" * 70)
    print("STEP 1: CREATOR v2 (con código GLSL real)")
    print("━" * 70)

    system = (SCRIPTS_DIR / "prompts" / "creator-v2.md").read_text(encoding="utf-8")

    # Añadir instrucción CRÍTICA sobre inlining
    system += """

## CRÍTICO: INLINE DE FUNCIONES GLSL

WebGL NO puede importar archivos .glsl. TODAS las funciones GLSL deben estar
INLINE en el fragment shader. NO escribas placeholders como:
  // Implementation would be here
  return vec3(0.0);

En su lugar, COPIA las funciones reales del código GLSL que se te proporciona
directamente dentro del fragment shader. Si necesitas snoise, fbm, o
auroraCurtain, COPIA su implementación completa del código proporcionado.

El código GLSL real se te dará en el user prompt. Úsalo directamente.
"""

    # Construir prompt con código real
    shader_block = "\n# CÓDIGO GLSL REAL DE LA LIBRERÍA (copia estas funciones en tu shader)\n\n"
    for name, code in shader_code.items():
        shader_block += f"## {name}.glsl\n```glsl\n{code}\n```\n\n"

    patterns_block = "\n# Patrones de Memoria\n"
    for p in patterns[:8]:
        patterns_block += f"- [imp={p.get('importance', 5)}/10] {p.get('content', '')}\n"

    anti_block = "\n# Anti-patrones a EVITAR\n"
    for ap in anti_patterns[:5]:
        anti_block += f"- [{ap.get('failure_mode', '?')}] {ap.get('description', '')}\n"

    registry_block = f"\n# Registry\n```json\n{json.dumps(registry, indent=2, ensure_ascii=False)[:6000]}\n```\n"

    user = f"""# Petición
{brief}
{registry_block}
{shader_block}
{patterns_block}
{anti_block}
# Tarea
Selecciona skills del registry. Compón un hero completo.
INLINE las funciones GLSL reales (NO placeholders).
TODO en español.
"""

    backend = hero_loop.get_backend("zai-direct", "glm-5.2")

    print("  Llamando Creator v2...")
    t0 = time.time()
    creator_output = backend.complete(system, user, temperature=0.7)
    creator_time = time.time() - t0
    print(f"  ✓ Completado en {creator_time:.1f}s ({len(creator_output):,} chars)")

    Path("/home/z/my-project/download/creator-v2-loop-output.md").write_text(creator_output, encoding="utf-8")

    # Verificar si tiene placeholders
    has_placeholders = "Implementation would be here" in creator_output or "return vec3(0.0);" in creator_output.split("void main")[0] if "void main" in creator_output else False
    has_real_noise = "snoise" in creator_output and "mod289" in creator_output
    has_real_aurora = "auroraCurtain" in creator_output and "exp(-dist" in creator_output

    print(f"  Placeholders: {'❌ SÍ (mal)' if has_placeholders else '✅ NO (bien)'}")
    print(f"  Funciones reales (snoise/mod289): {'✅ SÍ' if has_real_noise else '❌ NO'}")
    print(f"  Funciones reales (auroraCurtain): {'✅ SÍ' if has_real_aurora else '❌ NO'}")
    print()

    # === AUDITOR ===
    print("━" * 70)
    print("STEP 2: AUDITOR (GLM-5.2)")
    print("━" * 70)

    system_aud = """Eres GLM-5.2 Auditor. Evalúa este hero. JSON en español.
Verifica ESPECIALMENTE:
1. ¿El shader tiene funciones reales (snoise, fbm, auroraCurtain) o placeholders?
2. ¿Compilaría el shader? (no debe haber funciones undefined)
3. ¿Usa skills de la librería (ShaderBackground, SplitText, MagneticButton, etc.)?
4. Cumplimiento: C5,C7,C9,C10,C11,C12,C15,C16,C18,PERF-1,PERF-5,A11Y-3
Output: {"puntaje": 0-10, "pasa": bool, "shader_compila": bool, "usa_skills": bool, "problemas": ["lista"], "mejoras": ["lista"], "recomendacion": "entregar|continuar|rework"}
"""

    user_aud = f"# Hero generado por Creator v2\n\n{creator_output[:12000]}\n\n# Tarea\nAudita. ¿El shader compila? ¿Usa skills reales?"

    print("  Llamando Auditor...")
    t0 = time.time()
    auditor_output = backend.complete(system_aud, user_aud, temperature=0.2)
    auditor_time = time.time() - t0
    print(f"  ✓ Completado en {auditor_time:.1f}s")

    # Parse
    aud_clean = auditor_output.strip()
    if aud_clean.startswith("```"):
        lines = aud_clean.split("\n")[1:]
        if lines and lines[-1].startswith("```"): lines = lines[:-1]
        aud_clean = "\n".join(lines)

    try:
        audit = json.loads(aud_clean)
        score = audit.get("puntaje", 0)
        pasa = audit.get("pasa", False)
        compila = audit.get("shader_compila", False)
        usa_skills = audit.get("usa_skills", False)
        rec = audit.get("recomendacion", "?")

        print(f"  Puntaje: {score}/10 | Pasa: {'✅' if pasa else '❌'}")
        print(f"  Shader compila: {'✅' if compila else '❌'}")
        print(f"  Usa skills: {'✅' if usa_skills else '❌'}")
        print(f"  Recomendación: {rec}")

        if audit.get("problemas"):
            print("  Problemas:")
            for p in audit["problemas"][:5]:
                print(f"    ❌ {p[:100]}")
        print()
    except:
        print(f"  ⚠️ Error parseando: {auditor_output[:200]}")
        score = 0
        rec = "rework"

    # === CORRECTOR (si es necesario) ===
    if rec == "entregar" or score >= 9:
        print("━" * 70)
        print("STEP 3: CORRECTOR — NO NECESARIO (score >= 9)")
        print("━" * 70)
    else:
        print("━" * 70)
        print("STEP 3: CORRECTOR (GLM-5.2)")
        print("━" * 70)

        system_corr = """Eres el Corrector. Arregla los problemas detectados por el Auditor.
CRÍTICO: Si el shader tiene funciones placeholder, reemplázalas con funciones reales.
Las funciones reales son: snoise (simplex noise), fbm (fractal brownian motion), auroraCurtain.
NO escribas '// Implementation would be here'. Escribe el código real.
Output: código corregido completo.
"""

        user_corr = f"# Código del Creator\n{creator_output[:12000]}\n\n# Feedback del Auditor\n{json.dumps(audit, indent=2, ensure_ascii=False)}\n\n# Tarea\nArregla. Asegúrate de que el shader compile (sin funciones undefined)."

        print("  Llamando Corrector...")
        t0 = time.time()
        corrector_output = backend.complete(system_corr, user_corr, temperature=0.5)
        corrector_time = time.time() - t0
        print(f"  ✓ Completado en {corrector_time:.1f}s ({len(corrector_output):,} chars)")

        # Verificar si el Corrector arregló los placeholders
        has_placeholders_after = "Implementation would be here" in corrector_output
        has_real_noise_after = "snoise" in corrector_output and "mod289" in corrector_output

        print(f"  Placeholders después: {'❌ aún hay' if has_placeholders_after else '✅ eliminados'}")
        print(f"  Funciones reales: {'✅ SÍ' if has_real_noise_after else '❌ NO'}")

        Path("/home/z/my-project/download/corrector-v2-loop-output.md").write_text(corrector_output, encoding="utf-8")

    # === RESUMEN ===
    print()
    print("=" * 70)
    print("📊 RESUMEN DEL LOOP")
    print("=" * 70)
    print(f"  Creator: {creator_time:.1f}s → {len(creator_output):,} chars")
    print(f"    Placeholders: {'❌' if has_placeholders else '✅'}")
    print(f"    Funciones reales: {'✅' if has_real_noise else '❌'}")
    print(f"  Auditor: {auditor_time:.1f}s → Score {score}/10")
    if rec != "entregar" and score < 9:
        print(f"  Corrector: {corrector_time:.1f}s → {len(corrector_output):,} chars")
        print(f"    Placeholders corregidos: {'✅' if not has_placeholders_after else '❌'}")
    print(f"  Recomendación: {rec}")
    print()
    print("✅ LOOP COMPLETO FINALIZADO")


if __name__ == "__main__":
    main()
