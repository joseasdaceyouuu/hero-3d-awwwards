# Loop Protocol — Sistema Autónomo de Diseño Hero Awwwards

> Arquitectura de Agent Loop Engineering aplicada al skill `hero-3d-awwwards`.
> Convierte una petición estática ("diseña un hero") en un sistema autónomo
> que itera hasta alcanzar un resultado pulido nivel Awwwards.

## Tabla de contenidos
1. Por qué un loop
2. Los 3 roles del ciclo
3. Flujo del ciclo
4. Criterios de salida
5. Cuándo activar el loop vs ejecución directa
6. Modos de operación

---

## 1. Por qué un loop

Sin loop, el skill `hero-3d-awwwards` funciona así:
```
Usuario pide hero → GLM lee skill → GLM genera código → Usuario revisa
                  → Usuario encuentra fallos → Usuario vuelve a pedir → ...
```
Cada iteración requiere intervención humana. Lento. El humano se convierte
en cuello de botella.

Con loop:
```
Usuario pide hero (una vez) → Loop autónomo:
   Creator genera → Auditor evalúa → Corrector ajusta → repite
   hasta pasar el checklist Awwwards → Entrega resultado pulido
```
El humano solo interviene al inicio (definir objetivo) y al final (validar).
Cada iteración toma 30-90s. Una sesión típica: 3-5 iteraciones.

---

## 2. Los 4 roles del ciclo

> **Actualización v3**: el sistema ahora tiene 4 roles, no 3. El User Simulator
> (Rol 4) se añadió para capturar dimensiones subjetivas que el Auditor objetivo
> no puede medir: wow factor, narrativa, alma creativa, competitividad SOTD.

### Rol 1: Agente Creador (Creator)

**Responsabilidad**: Generar la primera versión del hero y cada versión
revisada tras el feedback del auditor.

**Input**:
- Petición original del usuario
- SKILL.md completo (filosofía + arquetipos + stacks)
- Reference files relevantes según el arquetipo elegido
- Asset inventory (componentes y shaders disponibles)
- (Iteración 2+) Feedback del auditor de la iteración anterior

**Output**:
- Código completo del hero (componentes, shaders, estilos)
- Manifiesto de decisiones: arquetipo elegido, stack, paleta, timing
- Lista de archivos generados con paths

**Prompt del Creator** (en `scripts/prompts/creator.md`):
Sigue estrictamente el workflow de 7 pasos del SKILL.md. Nunca saltes el
paso 1 (Brief técnico). Justifica cada decisión con un principio del skill.

### Rol 2: Agente Auditor (Auditor)

**Responsabilidad**: Evaluar objetivamente la salida del Creator contra un
checklist medible. NO redesigna — solo detecta fallos y los documenta.

**Input**:
- Código generado por el Creator
- Manifiesto de decisiones
- `references/audit-checklist.md` (criterios objetivos)

**Output** (JSON estructurado):
```json
{
  "iteration": 2,
  "overall_pass": false,
  "score": 7.5,
  "criteria": [
    {
      "id": "C1",
      "name": "Una idea dominante",
      "passed": true,
      "evidence": "El shader de fluid es el foco único. Tipografía y CTA están subordinados."
    },
    {
      "id": "C2",
      "name": "Paleta ≤ 3 colores",
      "passed": true,
      "evidence": "Negro (#0a0a0f), blanco (#ffffff), accent magenta (#ff0040)."
    },
    {
      "id": "C7",
      "name": "prefers-reduced-motion respetado",
      "passed": false,
      "evidence": "No se detecta MediaQuery para prefers-reduced-motion en el código.",
      "fix_hint": "Añadir hook useReducedMotion y renderizar versión estática cuando true."
    }
  ],
  "summary": "3 fallos críticos detectados. Pasar feedback al Corrector.",
  "blockers": ["C7", "C9", "C12"]
}
```

**Prompt del Auditor** (en `scripts/prompts/auditor.md`):
Sé específico y citar código. Cero subjetividad. Si dices "se ve bien" sin
evidencia, fallaste.

### Rol 3: Agente Corrector (Corrector)

**Responsabilidad**: Tomar el código del Creator + feedback del Auditor y
producir una versión revisada. Mínimos cambios posibles — no rediseña desde
cero, solo corrige.

**Input**:
- Código de la iteración anterior
- JSON de auditoría (criteria + blockers + fix_hints)
- SKILL.md (para referencia de patrones correctos)

**Output**:
- Código revisado (solo archivos modificados)
- Resumen de cambios: "Fixed C7: added useReducedMotion hook", etc.

**Prompt del Corrector** (en `scripts/prompts/corrector.md`):
No inventes soluciones nuevas. Aplica los patrones del skill. Cada cambio
debe mapear a un criterion fallido.

### Rol 4: Agente Simulador de Usuario (User Simulator)

**Responsabilidad**: Evaluar subjetivamente el hero. Captura dimensiones que
el Auditor objetivo no puede medir — wow factor, narrativa, alma creativa,
competitividad SOTD, emoción.

**Por qué existe**: Un hero puede pasar todos los 26 criterios objetivos del
Auditor y aun así sentirse genérico, aburrido, o sin alma. El User Simulator
simula lo que un juez de Awwwards sentiría al aterrizar en el sitio por
primera vez. Es la diferencia entre "técnicamente correcto" y "premio SOTD".

**Input**:
- Código generado por el Creator (misma entrada que el Auditor)
- Auditor JSON (para no repetir trabajo objetivo)
- SKILL.md + awwwards-patterns.md (contexto de diseño)
- Petición original del usuario

**Output** (JSON estructurado, complementario al del Auditor):
```json
{
  "subjective_score": 7.2,
  "first_impression": {
    "hook_clarity": 7,
    "wow_factor": 8,
    "memorability": 6,
    "premium_feel": 8
  },
  "emotional_resonance": { ... },
  "competitive_comparison": {
    "comparable_awwwards_sites": ["Active Theory", "Locomotive"],
    "sotd_worthy": false,
    "sotd_gap": "..."
  },
  "soul_analysis": {
    "soul_description": "A restrained statement of creative identity through fluid motion",
    "soul_clarity": 7
  },
  "subjective_blockers": [
    {
      "id": "S1",
      "name": "No narrative arc",
      "severity": "major",
      "fix_hint": "Add scroll-triggered state where fluid transforms..."
    }
  ]
}
```

**Prompt del User Simulator** (en `scripts/prompts/user-simulator.md`):
Nunca repitas el trabajo del Auditor. Sé específico (cita colores, timing,
layout). Calibra estrictamente — un 9+ significa "ganaría SOTD este mes".

### Combinación Auditor + User Simulator

El orquestador combina ambos signals:

```
overall_pass = auditor.overall_pass AND user_simulator.subjective_score >= 7.5
combined_score = (auditor.score * 0.6) + (user_simulator.subjective_score * 0.4)
```

Los blockers vienen de AMBOS agentes:
- `auditor.blockers`: criterios técnicos (C7, C12, etc.)
- `user_simulator.subjective_blockers`: gaps creativos (S1, S2, etc.)

El Corrector recibe ambos y prioriza: blockers técnicos primero, luego
blockers subjetivos major, luego minor.

---

## 3. Flujo del ciclo

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario: "Diseña un hero 3D para mi portfolio"             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  INIT: Parsear petición, cargar skill, preparar contexto    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ITERATION 1                                                │
│  ┌────────────────┐                                         │
│  │   CREATOR      │  → Genera hero v1                       │
│  └────────────────┘                                         │
│            │                                                │
│            ▼                                                │
│  ┌────────────────┐    ┌────────────────┐                   │
│  │   AUDITOR      │    │ USER SIMULATOR │  (paralelo)       │
│  │ (objetivo)     │    │ (subjetivo)    │                   │
│  └────────────────┘    └────────────────┘                   │
│            │                    │                           │
│            └─────────┬──────────┘                           │
│                      ▼                                      │
│      ¿Pasan ambos? ─── SÍ ──→ ENTREGAR v1                   │
│            │ NO                                             │
│            ▼                                                │
│  ┌────────────────┐                                         │
│  │   CORRECTOR    │  → Aplica fixes de AMBOS → v2           │
│  └────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ITERATION 2 (mismo flujo, input = v2)                      │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  EXIT: max_iterations alcanzado O ambos pasan               │
│  → Entregar versión final + reporte de iteraciones          │
└─────────────────────────────────────────────────────────────┘
```

**Optimización clave**: Auditor y User Simulator se ejecutan **en paralelo**
porque no dependen el uno del otro. Esto reduce el tiempo de iteración
~40% comparado con ejecución secuencial.

### Variables del loop

| Variable | Default | Ajustable |
|---|---|---|
| `max_iterations` | 5 | Subir a 7 para heroes muy complejos |
| `min_score_to_pass` | 9.0 / 10 (combined) | Bajar a 8.0 para iteración rápida |
| `min_subjective_score` | 7.5 | Subir a 8.0 para exigir SOTD-quality |
| `blockers_required` | true | Si false, pasa con score alto aunque haya blockers menores |
| `enable_user_simulator` | true | Desactivar para loop más rápido pero menos riguroso |
| `parallel_audit_subjective` | true | Auditor y User Simulator corren en paralelo |

---

## 4. Criterios de salida

El loop termina cuando se cumple **alguno** de estos:

1. **Éxito**: Auditor pasa todos los criteria AND User Simulator score ≥ `min_subjective_score`.
2. **Score suficiente**: Combined score ≥ `min_score_to_pass` Y no hay blockers críticos de ningún agente.
3. **Max iterations**: Llegó a `max_iterations` sin éxito. Entrega la mejor versión + reporte de qué falló.
4. **Estancamiento**: Dos iteraciones consecutivas con el mismo score y mismos blockers (en cualquiera de los dos agentes). Salir para evitar loop infinito.
5. **Usuario aborta**: Si el usuario detiene el loop manualmente.
6. **Divergencia**: Si el Auditor mejora pero el User Simulator empeora (o viceversa) por 2 iteraciones, escalar al usuario — hay un conflicto entre corrección técnica y dirección creativa.

### Criterios críticos (blockers automáticos)

Estos criteria, si fallan, marcan `overall_pass = false` sin importar el score:

**Del Auditor (técnicos):**
- C7: `prefers-reduced-motion` respetado
- C9: Sin errores de sintaxis/runtime en el código
- C12: WebGL fallback presente
- C15: Paleta respeta accesibilidad WCAG AA

**Del User Simulator (creativos):**
- S-major: Cualquier subjective_blocker con severity major
- Si `sotd_worthy = false` Y `subjective_score < 7.0`, marcar como blocker creativo

---

## 5. Cuándo activar el loop vs ejecución directa

### Activa el loop cuando el usuario pida:
- "Diseña un hero completo" (implica múltiples archivos)
- "Quiero un hero nivel Awwwards" (calidad alta esperada)
- "Hero profesional / premium / wow" (calidad alta esperada)
- Cualquier hero donde mencione 2+ arquetipos
- Cualquier hero donde la complejidad sugiera que una pasada no basta

### Ejecución directa (sin loop) cuando el usuario pida:
- "Dame un snippet de parallax para una capa" (una sola pieza)
- "¿Cómo se usa DistortionImage?" (explicación, no generación)
- "Modifica el color del hero" (cambio trivial)
- "Explícame el arquetipo 3" (educación, no producción)

### Heurística rápida
```
¿La petición requiere generar 3+ archivos de código nuevo?
  → SÍ: Activar loop
  → NO: Ejecución directa
```

---

## 6. Modos de operación

El loop puede ejecutarse en 3 modos según el contexto:

### Modo 1: Loop nativo (dentro del agente GLM principal)

El agente GLM principal orquesta el loop llamándose a sí mismo en roles
distintos. Requiere subagentes (disponible en Cowork / GLM Code).

```
[Main agent] → spawn [Creator subagent]
            → wait for output
            → spawn [Auditor subagent]
            → wait for output
            → if fail: spawn [Corrector subagent]
            → loop
```

**Cuándo usar**: Sesiones interactivas en GLM Code/Cowork. Más natural.

### Modo 2: Script Python autónomo (`scripts/hero-loop.py`)

Un script Python que ejecuta el loop llamando a la API de GLM vía CLI
(`glm -p`) o vía z-ai-web-dev-sdk. No requiere subagentes.

```bash
python scripts/hero-loop.py \
  --prompt "Diseña un hero 3D para portfolio de fotógrafo" \
  --max-iterations 5 \
  --output-dir ./hero-output
```

**Cuándo usar**: Automatización, CI/CD, batch processing.

### Modo 3: Híbrido (recomendado para heroes complejos)

El agente principal ejecuta la iteración 1 (Creator) y pasa el resultado
al script Python para que corra las iteraciones 2-N en background.

**Cuándo usar**: Cuando el usuario quiere ver la primera versión rápido y
deja que el loop refine en background.

---

## Persistencia de contexto entre iteraciones

Cada iteración guarda su estado en `hero-output/iteration-N/`:
- `code/` — archivos generados
- `audit.json` — resultado del auditor
- `changes.md` — diff vs iteración anterior
- `manifest.json` — decisiones tomadas

Esto permite:
- Reanudar un loop interrumpido
- Comparar visualmente entre iteraciones
- Auditar el proceso completo

---

## Anti-patrones del loop

### Loop infinito por misma corrección
Si el Corrector aplica el mismo fix 3 veces sin éxito, el Auditor debe
marcarlo como `blocker_unfixable` y el loop debe salir.

### Overfitting al checklist
El Corrector no debe "gaming the checklist" (ej: añadir un `prefers-reduced-motion`
vacío solo para pasar C7). El Auditor debe detectar fixes superficiales y
rechazarlos con `fix_superficial: true`.

### Drift de scope
El Corrector puede expandir el scope (añadir features que el usuario no pidió).
El Auditor debe detectar scope creep y rechazarlo.

### Loop sin progreso
Si iteración N tiene score menor que iteración N-1, pausar y notificar al
usuario. Algo se rompió en el Corrector.

---

## Métricas para optimizar el loop

Tras varias ejecuciones, mide:

| Métrica | Target | Qué significa si falla |
|---|---|---|
| Iteraciones promedio hasta éxito | 2.5 | Si >4, el Creator está fallando en v1 |
| % de loops que terminan en éxito | >85% | Si <70%, el checklist es muy estricto o el skill tiene gaps |
| Tiempo total promedio | <5 min | Si >10 min, paralelizar auditor con creator |
| % de fallos recurrentes | <15% | Si alto, añadir patrones al skill para prevenir |

Estas métricas alimentan iteraciones del propio skill — el skill se mejora
con el tiempo basado en lo que el loop aprende.

---

## Cuándo NO usar el loop

- Hero trivial (solo CSS, sin animación compleja)
- Usuario tiene prisa y prefiere una versión rápida para iterar manualmente
- Usuario quiere aprender el proceso (mejor hacerlo transparente paso a paso)
- Budget de tokens ajustado (cada iteración consume tokens)

En esos casos, ejecución directa. El loop es una herramienta, no una obligación.
