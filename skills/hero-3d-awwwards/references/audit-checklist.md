# Audit Checklist — Criterios Objetivos del Auditor

> Lista de criterios medibles que el agente Auditor evalúa en cada iteración
> del loop. Cada criterio debe ser **objetivamente verificable** — si requiere
> subjetividad, no pertenece aquí.

## Estructura de cada criterio

```
ID: C[N]
Nombre: descripción corta
Categoría: skill-compliance | performance | awwwards-principle | accessibility | code-quality | asset-optimization
Severidad: blocker | major | minor
Cómo verificar: instrucciones específicas para el auditor
Mensaje de fallo: template del fix_hint
```

---

## Categoría 1: Skill Compliance (¿sigue el skill?)

### C1 — Arquetipo correcto identificado
- **Severidad**: major
- **Cómo verificar**: El manifiesto del Creator declara uno de los 5 arquetipos (2.5D Parallax, 3D Scene, Shaders, Distortion, Text 3D). El código generado implementa efectivamente ese arquetipo.
- **Mensaje de fallo**: "Arquetipo declarado: X. Código implementa: Y. Reconciliar."

### C2 — Stack correcto según routing
- **Severidad**: blocker
- **Cómo verificar**: Si la petición menciona React/Next.js → debe usar R3F. Si menciona "vanilla" o "sin framework" → Three.js vanilla. Si menciona "SEO" o "liviano" → CSS 3D.
- **Mensaje de fallo**: "Petición sugiere stack X pero código usa Y. Justificar o cambiar."

### C3 — Brief técnico documentado
- **Severidad**: minor
- **Cómo verificar**: El manifiesto incluye: arquetipo, stack, asset list, paleta, timing, CTA. Los 6 campos presentes.
- **Mensaje de fallo**: "Falta documentar: [campo]."

### C4 — Setup script usado o justificado
- **Severidad**: minor
- **Cómo verificar**: Dependencies en package.json coinciden con las versiones del script de setup, O se justifica por qué se desviaron.

---

## Categoría 2: Performance (¿corre rápido?)

### C5 — DPR clamp implementado
- **Severidad**: blocker
- **Cómo verificar**: En R3F: `<Canvas dpr={[1, 2]}>`. En vanilla: `setPixelRatio(Math.min(dpr, 2))`. En CSS 3D: N/A.
- **Mensaje de fallo**: "DPR no está clamped a máximo 2. En dispositivos retina alta, esto quema GPU sin ganancia visual."

### C6 — GLB comprimido con Draco
- **Severidad**: major (si Arquetipo 2)
- **Cómo verificar**: Si hay modelos GLB, verificar que el loader usa DRACOLoader, O que el archivo .glb está optimizado. Tamaño del GLB < 2MB.
- **Mensaje de fallo**: "GLB de [tamaño]MB sin Draco compression. Aplicar: `npx gltf-transform optimize input.glb output.glb --simplify`."

### C7 — prefers-reduced-motion respetado
- **Severidad**: blocker
- **Cómo verificar**: Existe check de `window.matchMedia('(prefers-reduced-motion: reduce)')`. Cuando true, renderiza versión estática sin animación.
- **Mensaje de fallo**: "No se respeta prefers-reduced-motion. Awwwards descalifica. Añadir hook useReducedMotion + fallback estático."

### C8 — Pause render offscreen
- **Severidad**: major
- **Cómo verificar**: Existe IntersectionObserver que pausa el render loop cuando el canvas sale del viewport.
- **Mensaje de fallo**: "Canvas renderiza continuamente aunque esté offscreen. Añadir IntersectionObserver para pausar."

---

## Categoría 3: Awwwards Principles (¿es nivel SOTD?)

### C9 — Una sola idea dominante
- **Severidad**: major
- **Cómo verificar**: Identificar el movimiento principal del hero. Si hay 2+ efectos compitiendo por atención (ej: parallax + shader + partículas + texto animado), fallar.
- **Mensaje de fallo**: "Detectados N efectos primarios compitiendo. Reducir a 1 idea dominante; los demás subordinar o eliminar."

### C10 — Paleta ≤ 3 colores
- **Severidad**: major
- **Cómo verificar**: Extraer todos los colores hex del código. Contar colores únicos con saturación > 0.2. Deben ser ≤ 3 (excluyendo blancos/negros/grises neutros).
- **Mensaje de fallo**: "Paleta tiene N colores saturados. Awwwards usa 2-3 máximo. Reducir."

### C11 — Timing cinematográfico
- **Severidad**: major
- **Cómo verificar**: Buscar `duration: 0.3` o menos en animaciones primarias (no micro-interactions). Animaciones primarias deben ser 1.2s+. Easing debe ser `power3.out`, `power4.out`, `expo.out`, o `circ.inOut` — no `linear` ni `back`.
- **Mensaje de fallo**: "Animación primaria con duration [X]s y easing [Y]. Usar 1.2s+ con power4.out o expo.out."

### C12 — WebGL fallback presente
- **Severidad**: blocker
- **Cómo verificar**: Existe detección de WebGL (`WebGLRenderingContext` o try/catch con `getContext('webgl')`). Cuando WebGL no disponible, renderiza versión CSS fallback.
- **Mensaje de fallo**: "Sin fallback para navegadores sin WebGL. Añadir detección + versión estática."

### C13 — Cursor custom (opcional, mejora SOTD)
- **Severidad**: minor
- **Cómo verificar**: Existe cursor custom (círculo o forma que sigue al mouse con lerp).
- **Mensaje de fallo**: "Considerar añadir cursor custom para look Awwwards."

### C14 — Loading screen custom (no spinner)
- **Severidad**: major (si hay Suspense o load async)
- **Cómo verificar**: Si el hero usa Suspense o loaders async, el fallback NO es un spinner genérico. Debe ser tipografía o animación acorde al hero.
- **Mensaje de fallo**: "Loading screen es spinner genérico. Reemplazar con animación temática."

---

## Categoría 4: Accessibility

### C15 — Contraste WCAG AA
- **Severidad**: blocker
- **Cómo verificar**: Calcular ratio de contraste entre texto y fondo. Para texto normal: ≥ 4.5:1. Para texto grande (>24px): ≥ 3:1. Usar fórmula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance.
- **Mensaje de fallo**: "Contraste texto/fondo = X:1. Mínimo WCAG AA: 4.5:1 (normal) o 3:1 (grande)."

### C16 — Texto semántico (no solo canvas)
- **Severidad**: major
- **Cómo verificar**: Headline y CTA están en HTML semántico (`<h1>`, `<p>`, `<a>`), no solo textura dentro del canvas. Permite SEO y screen readers.
- **Mensaje de fallo**: "Texto del hero está dentro del canvas 3D. Mover a HTML overlay para SEO y accesibilidad."

### C17 — ARIA labels en elementos interactivos
- **Severidad**: minor
- **Cómo verificar**: Botones y links tienen `aria-label` descriptivo si no tienen texto visible claro.
- **Mensaje de fallo**: "Botón de CTA sin aria-label. Añadir `aria-label='[descripción]'`."

### C18 — Keyboard navigation
- **Severidad**: major
- **Cómo verificar**: CTA y elementos interactivos son focusables con Tab. Hay `:focus-visible` style.
- **Mensaje de fallo**: "CTA no focusable. Añadir tabIndex y :focus-visible style."

---

## Categoría 5: Code Quality

### C19 — Sin errores de sintaxis
- **Severidad**: blocker
- **Cómo verificar**: Código parsea sin errores. TypeScript: sin `any` implícitos no justificados. Imports resueltos.
- **Mensaje de fallo**: "Error de sintaxis en [archivo:línea]: [descripción]."

### C20 — Sin console.log en producción
- **Severidad**: minor
- **Cómo verificar**: Buscar `console.log`, `console.debug`, `console.warn` (excepto en catch blocks legítimos).
- **Mensaje de fallo**: "N console.log encontrados. Remover o envolver en if (process.env.NODE_ENV === 'development')."

### C21 — Cleanup de event listeners y observers
- **Severidad**: major
- **Cómo verificar**: Todo `addEventListener` tiene su `removeEventListener` en cleanup de useEffect. IntersectionObservers tienen `.disconnect()`.
- **Mensaje de fallo**: "EventListener para [evento] sin cleanup. Memory leak potencial."

### C22 — Dispose de geometrías/materiales (Three.js)
- **Severidad**: major (si Three.js)
- **Cómo verificar**: En unmount, se llama `.dispose()` en geometrías, materiales y texturas.
- **Mensaje de fallo**: "Geometría/material sin dispose en cleanup. Memory leak en SPA."

---

## Categoría 6: Asset Optimization

### C23 — Imágenes en WebP
- **Severidad**: major
- **Cómo verificar**: Imágenes referenciadas son `.webp` (no `.png` o `.jpg`), excepto logos/favicon.
- **Mensaje de fallo**: "N imágenes en PNG/JPG. Convertir a WebP: `cwebp input.png -q 80 -o output.webp`."

### C24 — Texturas ≤ 2048px
- **Severidad**: major
- **Cómo verificar**: Tamaño de texturas en el código (o metadata) ≤ 2048px en desktop, ≤ 1024px en mobile.
- **Mensaje de fallo**: "Textura de [tamaño]px. Reducir a 2048 max (desktop) o 1024 (mobile)."

### C25 — Tree-shaking de imports
- **Severidad**: minor
- **Cómo verificar**: No hay `import * as` en imports de drei o three. Imports nominales.
- **Mensaje de fallo**: "Import wildcard de [lib]. Usar imports nominales: `import { X } from 'lib'`."

### C26 — Bundle size estimado
- **Severidad**: major
- **Cómo verificar**: Estimar tamaño del bundle JS gzipped. Target: < 200KB. Si Three.js + R3F + drei + GSAP, ~150KB es normal.
- **Mensaje de fallo**: "Bundle estimado en [X]KB. Target < 200KB gzip."

---

## Scoring

Cada criterio se evalúa como `passed: true | false`.

```
Score = (criteria_passed / total_criteria_aplicable) * 10
```

**Criterios aplicables**: No todos aplican a todos los heroes. Por ejemplo,
C6 (Draco) no aplica si no hay GLB. C22 (dispose) no aplica si es CSS 3D puro.

### Niveles de score

| Score | Significado | Acción |
|---|---|---|
| 9.5 - 10 | Awwwards ready | Entregar |
| 8.5 - 9.4 | Casi listo | Una iteración más |
| 7.0 - 8.4 | Buen progreso | 2 iteraciones más |
| 5.0 - 6.9 | Problemas serios | Revisar enfoque con usuario |
| < 5.0 | Reset | Volver al brief, posible stack equivocado |

### Blockers automáticos

Sin importar el score, estos criteria causan `overall_pass: false`:
- C2 (stack correcto)
- C5 (DPR clamp)
- C7 (prefers-reduced-motion)
- C9 (una idea dominante) — auto-revisar si dudas
- C12 (WebGL fallback)
- C15 (contraste WCAG AA)
- C19 (sintaxis)

---

## Output JSON del Auditor

```json
{
  "iteration": 2,
  "overall_pass": false,
  "score": 7.8,
  "total_criteria": 22,
  "criteria_passed": 18,
  "criteria_failed": 4,
  "criteria": [
    {
      "id": "C7",
      "name": "prefers-reduced-motion respetado",
      "category": "performance",
      "severity": "blocker",
      "passed": false,
      "evidence": "No se encontró matchMedia('(prefers-reduced-motion: reduce)') en el código.",
      "fix_hint": "Añadir useReducedMotion hook (ver references/r3f-gsap.md sección 6) y renderizar versión CSS-only cuando true.",
      "fix_superficial": false
    }
  ],
  "blockers": ["C7"],
  "summary": "1 blocker crítico (C7) impide entrega. 3 minors adicionales.",
  "recommendation": "continue_loop",
  "next_action": "Pasar feedback al Corrector. Priorizar C7 primero."
}
```

---

## Cómo el Auditor debe razonar

1. **Lee el código completo** generado por el Creator.
2. **Para cada criterio aplicable**, ejecuta la verificación objetiva.
3. **Si falla**: cita la línea específica, describe qué falta, sugiere fix concreto.
4. **Si pasa**: breve evidencia de por qué.
5. **Calcula score** y `overall_pass`.
6. **Recomendación**: `continue_loop` si hay blockers, `deliver` si pasa.

### Trampas del Auditor a evitar

- **Aprobar sin evidencia**: "Se ve bien" no es evidencia. Citar código.
- **Fix_hint vago**: "Mejorar la animación" no es actionable. "Cambiar duration de 0.3 a 1.2s y easing de linear a power4.out" sí.
- **Falsos positivos**: Si no estás seguro si un criterio pasa, márcalo como `uncertain` y pide al Corrector que lo verifique.
- **Over-engineering**: Si el código es correcto pero feo estéticamente, NO fallar criterios técnicos por gusto personal.

### Trampas del Creator a detectar

- **Mock compliance**: Añadir `if (reducedMotion) return null` vacío solo para pasar C7. El Auditor debe ejecutar mentalmente: ¿qué se renderiza cuando `reducedMotion === true`? Si nada, fallar.
- **Placebo fixes**: Cambiar nombres de variables sin cambiar comportamiento. Auditar comportamiento, no código.
- **Scope creep**: Añadir features no pedidas para pasar criterios opcionales. Rechazar.

---

## Evolución del checklist

Este checklist debe actualizarse cuando:
- Se detectan patrones de fallo recurrentes en loops reales
- Awwwards cambia sus criterios (revisar anualmente)
- Se añaden nuevos arquetipos al skill
- Performance budgets cambian (ej: WebGPU madura)

Mantener un changelog al final del archivo con fecha y razón de cada cambio.

---

## Límites del checklist objetivo — complemento con User Simulator

Este checklist mide **criterios verificables objetivamente** (presencia de
código, valores numéricos, ratios calculables). Pero hay dimensiones críticas
para Awwwards que NO se pueden medir así:

| Dimensión subjetiva | Por qué importa | Cómo se evalúa |
|---|---|---|
| Wow factor | Sin sorpresa, no hay SOTD | User Simulator (S-prompts) |
| Alma creativa | Sin alma, el hero es genérico | User Simulator: `soul_analysis` |
| Narrative arc | SOTD cuenta historia, no solo decora | User Simulator: S1 blocker |
| Premium feel | $50k agency vs $500 Upwork se siente | User Simulator: `first_impression.premium_feel` |
| Memorable elements | Si no recuerdas nada, falló | User Simulator: `first_impression.memorability` |
| SOTD competitiveness | ¿Competiría con sites reales? | User Simulator: `competitive_comparison.sotd_worthy` |

**Regla**: si un criterio requiere respuesta a "¿se ve bien?" o "¿se siente
premium?", NO pertenece a este checklist objetivo — pertenece al User
Simulator (ver `scripts/prompts/user-simulator.md`).

### Sistema de IDs coordinado

| Prefix | Agente | Tipo |
|---|---|---|
| C1 - C26 | Auditor | Objetivo, técnico |
| S1, S2, S3... | User Simulator | Subjetivo, creativo |

El Corrector recibe ambos prefijos y debe mapear cada fix al ID correcto.
Cambios que tocan C[N] son técnicos; cambios que tocan S[N] son creativos.

### Cuándo un criterio objetivo "borra" uno subjetivo

A veces el Auditor detecta un fallo técnico cuya solución elimina la
preocupación subjetiva. Ejemplo:
- Auditor falla C9 (una idea dominante: hay 3 efectos compitiendo)
- Solución: eliminar 2 efectos
- User Simulator había marcado S2 (falta de foco creativo)
- Tras el fix del Corrector, S2 probablemente también se resuelve

En estos casos, el Corrector solo aplica el fix C9. El User Simulator
re-evaluará S2 en la próxima iteración y confirmará si se resolvió.
