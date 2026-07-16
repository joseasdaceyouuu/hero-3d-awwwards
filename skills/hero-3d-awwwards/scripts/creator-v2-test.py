#!/usr/bin/env python3
"""
creator-v2-test.py — Test del Creator agent v2 que usa el registry.json.

El Creator recibe:
  1. Brief del usuario
  2. Registry.json completo (21 skills)
  3. Patrones de memoria (78 patrones)
  4. Anti-patrones (23 anti-patrones)

Y debe:
  - Seleccionar skills del registry
  - Componerlos en un hero
  - Usar código de la librería (no escribir desde cero)
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


def main():
    print("=" * 70)
    print("🧠 CREATOR v2 — SKILL-AWARE (usa registry.json)")
    print("=" * 70)
    print()

    # Brief
    brief = """Crea un hero con AURORA BOREAL para una agencia creativa.
Inmersivo, atmosférico, cinematográfico.
La aurora debe tener movimiento visible y elegante.
Texto en español. Paleta: verde aurora + magenta + deep blue."""

    # Cargar registry
    registry_path = SCRIPTS_DIR.parent / "library" / "registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))

    skills_count = len(registry.get("skills", [])) + len(registry.get("tier2_skills", [])) + len(registry.get("tier3_skills", []))
    print(f"📚 Registry cargado: {skills_count} skills disponibles")
    print()

    # Recuperar patrones de memoria
    clear_cache()
    db_path = Path("/home/z/my-project/memory-data/memory.db")
    lancedb_path = Path("/home/z/my-project/memory-data/lancedb")
    embedder = FakeEmbedder(dimension=64)
    memory = MemorySystem(db_path=db_path, lancedb_path=lancedb_path, embedder=embedder)

    memory.start_session(
        brief=brief,
        brief_summary="aurora boreal agencia creativa inmersivo atmosferico cinematografico hero",
        vertical="agency",
        archetype="Shaders",
        stack="r3f",
    )

    patterns = memory.working.retrieved_patterns
    anti_patterns = memory.working.retrieved_anti_patterns
    stats = memory.stats()
    print(f"📊 Memoria: {stats['semantic_notes']} patrones, {stats['anti_patterns']} anti-patrones")
    print(f"🎯 Recuperados: {len(patterns)} patrones, {len(anti_patterns)} anti-patrones")
    print()
    memory.close()

    # Construir prompt
    system_prompt = (SCRIPTS_DIR / "prompts" / "creator-v2.md").read_text(encoding="utf-8")

    # Formatear registry para el prompt
    registry_block = f"""# Skill Registry ({skills_count} skills disponibles)

```json
{json.dumps(registry, indent=2, ensure_ascii=False)[:8000]}
```
"""

    # Formatear patrones
    patterns_block = "\n# Patrones de Memoria\n"
    if patterns:
        for p in patterns[:8]:
            patterns_block += f"- [imp={p.get('importance', 5)}/10] {p.get('content', '')}\n"

    anti_block = "\n# Anti-patrones a EVITAR\n"
    if anti_patterns:
        for ap in anti_patterns[:5]:
            anti_block += f"- [{ap.get('failure_mode', '?')}] {ap.get('description', '')}\n"

    user_prompt = f"""# Petición del Usuario
{brief}
{registry_block}
{patterns_block}
{anti_block}
# Tarea
Selecciona skills del registry y compón un hero completo.
Output: skills seleccionadas, manifiesto, código completo, shader inline, notas.
TODO en español.
"""

    # Llamar Creator
    backend = hero_loop.get_backend("zai-direct", "glm-5.2")
    print("🧠 Llamando Creator v2 (GLM-5.2)...")
    print("   El Creator debe seleccionar skills del registry y componerlas")
    print()

    t0 = time.time()
    response = backend.complete(system_prompt, user_prompt, temperature=0.7)
    elapsed = time.time() - t0

    print(f"⏱️  Completado en {elapsed:.1f}s")
    print(f"📝 Output: {len(response):,} chars")
    print()

    # Guardar
    output_path = Path("/home/z/my-project/download/creator-v2-output.md")
    output_path.write_text(response, encoding="utf-8")
    print(f"💾 Guardado: {output_path}")
    print()

    # Mostrar skills seleccionadas
    print("=" * 60)
    print("OUTPUT DEL CREATOR v2 (preview)")
    print("=" * 60)
    print()

    # Buscar sección de skills seleccionadas
    if "## Skills Seleccionadas" in response:
        start = response.index("## Skills Seleccionadas")
        end = response.find("##", start + 5)
        if end == -1:
            end = start + 1000
        print(response[start:end])
    else:
        print(response[:3000])

    if len(response) > 3000:
        print(f"\n... ({len(response) - 3000} más chars)")
    print()

    print("=" * 60)
    print("✅ CREATOR v2 COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
