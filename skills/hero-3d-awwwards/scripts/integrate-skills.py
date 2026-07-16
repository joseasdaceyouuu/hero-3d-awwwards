#!/usr/bin/env python3
"""
integrate-skills.py — Integra skills del ecosistema z-ai en hero-3d-awwwards.

Skills integradas:
  1. image-generation → generar backgrounds/texturas para heroes
  2. web-search → investigación SOTD automática en el loop
  3. VLM → auditoría visual (ya integrada, ampliar)
  4. charts → data visualization en heroes
  5. ui-ux-pro-max → principios de diseño al audit-checklist
  6. design → sistemas de diseño
  7. skill-creator → meta-mejora de la skill misma

Uso:
  python integrate-skills.py --list        # lista skills integrables
  python integrate-skills.py --generate-bg "abstract iridescent gold"  # genera background
  python integrate-skills.py --search-sotd  # busca SOTD recientes
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
SKILL_DIR = SCRIPT_DIR.parent

# Skills del ecosistema integrables
INTEGRABLE_SKILLS = {
    "image-generation": {
        "description": "Generar backgrounds, texturas y assets visuales para heroes",
        "cli": "z-ai image -p '{prompt}' -o {output} -s {size}",
        "use_cases": [
            "Background iridiscente para hero",
            "Textura de displacement map",
            "Logo/monograma generado",
            "Poster art para hero cinematográfico",
        ],
    },
    "web-search": {
        "description": "Investigar SOTD recientes, tendencias, técnicas nuevas",
        "cli": "z-ai function -n web_search -a '{{\"query\": \"{query}\", \"num\": {num}}}'",
        "use_cases": [
            "Buscar Awwwards SOTD recientes para inspiración",
            "Investigar técnicas de animación emergentes",
            "Encontrar referencias de implementación",
            "Verificar compatibilidad de APIs web",
        ],
    },
    "VLM": {
        "description": "Auditoría visual de heroes con Vision Language Model",
        "cli": "z-ai vision -p '{prompt}' -i {image}",
        "use_cases": [
            "Auditar composición visual del hero",
            "Detectar zonas negras muertas",
            "Verificar contraste WCAG",
            "Evaluar elegancia y pulido",
        ],
        "status": "INTEGRADO en vlm_auditor.py",
    },
    "charts": {
        "description": "Data visualization para heroes con stats/métricas animadas",
        "use_cases": [
            "Hero con gráfico de barras animado",
            "Stats con counter animation + mini chart",
            "Data viz interactiva como hero centerpiece",
        ],
    },
    "ui-ux-pro-max": {
        "description": "Principios de diseño UI/UX profesional",
        "use_cases": [
            "Validar jerarquía visual del hero",
            "Verificar spacing y proporciones",
            "Auditar accesibilidad cognitiva",
        ],
    },
    "design": {
        "description": "Sistemas de diseño y design tokens",
        "use_cases": [
            "Generar design tokens del hero (paleta, tipografía, spacing)",
            "Sistema de componentes consistente",
            "Dark/light mode tokens",
        ],
    },
    "skill-creator": {
        "description": "Meta-mejora: crear y optimizar la skill misma",
        "use_cases": [
            "Optimizar prompts del Creator v2",
            "Crear nuevas skills derivadas",
            "Medir y benchmark performance de la skill",
        ],
    },
}


def list_skills():
    """Lista todas las skills integrables."""
    print("=" * 60)
    print("SKILLS DEL ECOSISTEMA INTEGRABLES EN HERO-3D-AWWWARDS")
    print("=" * 60)
    for name, info in INTEGRABLE_SKILLS.items():
        status = info.get("status", "DISPONIBLE")
        print(f"\n📦 {name}")
        print(f"   {info['description']}")
        print(f"   Estado: {status}")
        if "cli" in info:
            print(f"   CLI: {info['cli']}")
        print(f"   Usos:")
        for use in info["use_cases"]:
            print(f"     • {use}")


def generate_background(prompt: str, output: str = "public/hero-bg-generated.png", size: str = "1440x720"):
    """Genera un background usando image-generation skill."""
    print(f"Generando background: '{prompt}' → {output}")
    result = subprocess.run(
        ["z-ai", "image", "-p", prompt, "-o", output, "-s", size],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode == 0:
        print(f"✓ Background generado: {output}")
        return output
    else:
        print(f"✗ Error: {result.stderr[:200]}")
        return None


def search_sotd():
    """Busca Awwwards SOTD recientes usando web-search skill."""
    queries = [
        "Awwwards Site of the Day 2026 hero section design",
        "best web hero animation techniques 2026",
        "WebGL hero section award winning 2026",
    ]
    print("=" * 60)
    print("BÚSQUEDA DE SOTD RECIENTES")
    print("=" * 60)

    for query in queries:
        print(f"\n🔍 {query}")
        result = subprocess.run(
            ["z-ai", "function", "-n", "web_search",
             "-a", json.dumps({"query": query, "num": 5})],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                if isinstance(data, list):
                    for item in data[:3]:
                        print(f"  • {item.get('name', '?')[:70]}")
                        print(f"    {item.get('url', '')}")
                        print(f"    {item.get('snippet', '')[:100]}")
            except json.JSONDecodeError:
                print(f"  (parse error)")
        else:
            print(f"  ✗ Error: {result.stderr[:100]}")


def main():
    parser = argparse.ArgumentParser(description="Integración de skills del ecosistema")
    parser.add_argument("--list", action="store_true", help="Lista skills integrables")
    parser.add_argument("--generate-bg", help="Generar background con prompt")
    parser.add_argument("--search-sotd", action="store_true", help="Buscar SOTD recientes")
    args = parser.parse_args()

    if args.list:
        list_skills()
    elif args.generate_bg:
        generate_background(args.generate_bg)
    elif args.search_sotd:
        search_sotd()
    else:
        list_skills()


if __name__ == "__main__":
    main()
