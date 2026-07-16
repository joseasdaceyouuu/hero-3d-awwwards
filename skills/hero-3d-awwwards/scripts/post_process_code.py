#!/usr/bin/env python3
"""
post-process-code.py — Post-procesa código generado por el Creator v2.

VALIDA Y CORRIGE automáticamente:
  1. Imports no disponibles → los remueve o reemplaza
  2. framer-motion → GSAP o CSS
  3. @/lib/library/shaders/* → inline comment
  4. WebGL components cuando brief dice "sin WebGL" → los remueve
  5. Añade useEffect con setTimeout si hay preloader sin timer (5.18)
  6. Añade as="span" a LetterReveal dentro de <h1> (5.13)

Uso:
  python post-process-code.py --input /tmp/generated.tsx --output src/app/hero/page.tsx
  python post-process-code.py --code "$CODE" --brief "sin WebGL"
"""

import re
import argparse
import sys
from pathlib import Path

# Imports permitidos (whitelist)
ALLOWED_IMPORTS = {
    "react",
    "next",
    "gsap",
    "gsap/ScrollTrigger",
    "lenis",
    "@react-three/fiber",
    "@react-three/drei",
    "three",
    "@/lib/library/components/LetterReveal",
    "@/lib/library/components/ConnectedParticles",
    "@/lib/library/components/GoldenDust",
    "@/lib/library/components/MouseGlow",
    "@/lib/library/components/Preloader",
    "@/lib/library/components/ShaderBackground",
    "@/lib/library/components/SplitText",
    "@/lib/library/components/MagneticButton",
    "@/lib/library/components/BlendCursor",
    "@/lib/library/components/ScrollCamera",
    "@/lib/library/components/Text3DCinematic",
    "@/lib/library/components/TextToParticles",
    "@/lib/library/components/MagneticElement",
    "@/lib/library/components/SplitScreen",
}

# Imports prohibidos
FORBIDDEN_IMPORTS = {
    "framer-motion": "// framer-motion no instalado — usa GSAP o CSS animations",
    "@/lib/library/shaders/": "// shaders .glsl no son módulos TS — inlinea las funciones GLSL",
}

# Componentes que requieren WebGL
WEBGL_COMPONENTS = {"ShaderBackground", "Text3DCinematic", "Canvas"}


def validate_and_fix_imports(code: str, brief: str = "") -> tuple[str, list[str]]:
    """Valida y corrige imports del código generado."""
    fixes = []
    lines = code.split("\n")
    fixed_lines = []
    has_webgl = "sin WebGL" in brief.lower() or "sin webgl" in brief.lower()
    has_no_animations = "sin animaciones" in brief.lower()

    for line in lines:
        # Detectar import statements
        if line.strip().startswith("import "):
            # Extraer el módulo del import
            match = re.search(r'from\s+["\']([^"\']+)["\']', line)
            if match:
                module = match.group(1)

                # Check imports prohibidos
                is_forbidden = False
                for forbidden, replacement in FORBIDDEN_IMPORTS.items():
                    if forbidden in module:
                        fixed_lines.append(f"// {replacement}")
                        fixes.append(f"Removed forbidden import: {module}")
                        is_forbidden = True
                        break

                if is_forbidden:
                    continue

                # Check si es WebGL y el brief dice "sin WebGL"
                if has_webgl:
                    is_webgl_import = any(
                        comp in line for comp in WEBGL_COMPONENTS
                    ) or module in {"@react-three/fiber", "@react-three/drei", "three"}
                    if is_webgl_import:
                        fixed_lines.append(f"// REMOVED (brief says 'sin WebGL'): {line.strip()}")
                        fixes.append(f"Removed WebGL import (brief restriction): {module}")
                        continue

                # Check si está en whitelist
                is_allowed = False
                for allowed in ALLOWED_IMPORTS:
                    if module == allowed or module.startswith(allowed + "/"):
                        is_allowed = True
                        break

                if not is_allowed and not module.startswith("."):
                    # Import de paquete externo no conocido — lo dejamos pero advertimos
                    # (podría ser un paquete válido que no conocemos)
                    fixed_lines.append(line)
                else:
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)

    return "\n".join(fixed_lines), fixes


def fix_h1_nested_letterreveal(code: str) -> tuple[str, list[str]]:
    """Añade as='span' a LetterReveal dentro de <h1> (anti-pattern 5.13)."""
    fixes = []
    # Buscar <h1> que contiene <LetterReveal> sin as="span"
    pattern = r'(<h1[^>]*>)\s*(<LetterReveal)(?![^>]*as=)'
    match = re.search(pattern, code)
    if match:
        code = re.sub(
            pattern,
            r'\1\n      \2 as="span"',
            code,
            count=1
        )
        fixes.append("Added as='span' to LetterReveal inside <h1> (anti-pattern 5.13)")
    return code, fixes


def fix_preloader_timer(code: str) -> tuple[str, list[str]]:
    """Añade useEffect con setTimeout si hay preloader sin timer (anti-pattern 5.18)."""
    fixes = []
    # Si hay useState(false) para loaded pero NO hay setTimeout que lo ponga en true
    has_loaded_state = "const [loaded, setLoaded] = useState(false)" in code
    has_timer = "setLoaded(true)" in code and "setTimeout" in code

    if has_loaded_state and not has_timer:
        # Insertar useEffect con timer después del useState
        timer_code = '''
  // Preloader timer (anti-pattern 5.18 — auto-fixed)
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);
'''
        # Insertar después de la línea con useState(false)
        code = re.sub(
            r'(const \[loaded, setLoaded\] = useState\(false\);)',
            r'\1' + timer_code,
            code,
            count=1
        )
        fixes.append("Added preloader timer useEffect (anti-pattern 5.18 — auto-fixed)")
    return code, fixes


def fix_overflow_hidden(code: str) -> tuple[str, list[str]]:
    """Reemplaza overflow-x: hidden con overflow-x: clip (anti-pattern 5.9)."""
    fixes = []
    if "overflow-x: hidden" in code or "overflowX: 'hidden'" in code or 'overflowX: "hidden"' in code:
        code = code.replace("overflow-x: hidden", "overflow-x: clip")
        code = code.replace("overflowX: 'hidden'", "overflowX: 'clip'")
        code = code.replace('overflowX: "hidden"', 'overflowX: "clip"')
        code = code.replace("overflow-x-hidden", "")  # Tailwind class
        fixes.append("Replaced overflow-x: hidden → clip (anti-pattern 5.9 — auto-fixed)")
    return code, fixes


def post_process(code: str, brief: str = "") -> tuple[str, list[str]]:
    """Ejecuta todos los fixes de post-procesamiento."""
    all_fixes = []

    code, fixes = validate_and_fix_imports(code, brief)
    all_fixes.extend(fixes)

    code, fixes = fix_h1_nested_letterreveal(code)
    all_fixes.extend(fixes)

    code, fixes = fix_preloader_timer(code)
    all_fixes.extend(fixes)

    code, fixes = fix_overflow_hidden(code)
    all_fixes.extend(fixes)

    return code, all_fixes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", help="Archivo de entrada")
    parser.add_argument("--output", help="Archivo de salida")
    parser.add_argument("--code", help="Código directo (string)")
    parser.add_argument("--brief", default="", help="Brief del hero")
    args = parser.parse_args()

    if args.input:
        code = Path(args.input).read_text(encoding="utf-8")
    elif args.code:
        code = args.code
    else:
        print("ERROR: --input o --code requerido", file=sys.stderr)
        sys.exit(1)

    processed, fixes = post_process(code, args.brief)

    print(f"Post-procesamiento: {len(fixes)} fixes aplicados")
    for f in fixes:
        print(f"  ✓ {f}")

    if args.output:
        Path(args.output).write_text(processed, encoding="utf-8")
        print(f"\nEscrito: {args.output}")
    else:
        print(processed)


if __name__ == "__main__":
    main()
