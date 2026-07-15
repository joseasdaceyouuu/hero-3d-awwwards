---
name: hero-3d-awwwards
description: >
  Diseña e implementa hero sections web con animación 2.5D y 3D nivel Awwwards
  (Site of the Day). Cubre 5 arquetipos — parallax 2.5D por capas, escena 3D con
  modelos GLB, shaders GLSL custom (distortion/fluid), distortion hover con
  displacement maps, y tipografía 3D cinemática. Soporta 3 stacks ruteables:
  React Three Fiber + GSAP, Three.js vanilla, y CSS 3D + GSAP. Incluye plantillas
  GLSL reutilizables, componentes base, scripts de setup, y catálogo de patrones
  extraídos de sitios ganadores. INCLUYE ADEMÁS un sistema de Agent Loop
  autónomo (Creator → Auditor → Corrector) que itera hasta alcanzar calidad
  Awwwards sin intervención humana, con 26 criterios de auditoría objetivos.
  USA ESTE SKILL siempre que el usuario mencione hero section, hero animation,
  3D web, WebGL, Three.js, R3F, GSAP, parallax, shader, distortion, Awwwards,
  SOTD, landing premium, portfolio 3D, o cualquier hero con animación avanzada.
  No lo uses para landing pages simples sin animación.
---

# Hero 3D Awwwards Skill

> **Propósito**: Llevar cualquier hero section al estándar de Awwwards Site of the
> Day — donde la animación NO es decorativa sino que define la identidad del
> sitio. Este skill entrega los principios, los stacks, los arquetipos, y los
> assets para que cada hero sea memorable.

## Filosofía de diseño / Design Philosophy

Un hero nivel Awwwards NO es "una sección con animación". Es una sección donde
**la animación es el mensaje**. Antes de escribir una línea de código, interioriza
estos principios — son lo que separa un hero decorativo de uno premiado:

### 0. Clarity-First (estándar 2026 — ver `references/web-2026-standards.md`)
Cada píxel debe justificar su existencia. Si no guía al usuario o no reduce
el esfuerzo cognitivo, es ruido que drena conversión. El diseño decorativo
está muerto. Métricas clave:
- Contenido interactivo: **93% más efectivo** que estático
- Interfaces intencionales: **+30-40% dwell time**
- 1s de retraso móvil: **-20% conversiones**

Antes de añadir cualquier elemento, responder:
1. ¿Facilita la acción del cliente?
2. ¿Se ajusta a la identidad de marca?
3. ¿Es viable el rendimiento en móvil?

### 1. Una sola idea dominante / One dominant idea
Cada SOTD tiene UN movimiento principal que el ojo sigue inmediatamente. Puede
ser un fluid simulation, una cámara que orbita, una tipografía que morfea, un
parallax que revela capas. El resto del hero está subordinado a esa idea. Si
tienes 3 efectos compitiendo, mata 2.

**Why**: El cerebro humana necesita 200-400ms para "lock on" a un foco visual.
Heroes con múltiples focos se perciben como ruido, no como arte.

### 2. Timing cinematográfico / Cinematic timing
Los Awwwards usan curvas de easing **largas** (1.5–4s para movimientos primarios,
no los 0.3s típicos de UI). La entrada del hero se siente como un plano de
película, no como una transición de app. Usa `power4.out`, `expo.out`,
`circ.inOut` — evita `linear` y `back` (sobran y se ven amateur).

**Why**: La duración comunicada es directamente proporcional al "peso" percibido
del sitio. Timing corto = app; timing largo = experiencia.

### 3. Scroll como cámara / Scroll as camera
En 7 de cada 10 SOTDs, el scroll no desplaza contenido — **mueve la cámara** a
través de una escena 3D o a través de capas parallax. El contenido aparece como
consecuencia del movimiento, no como su causa. Esto reescribe la relación
usuario-página: en lugar de "leer", el usuario "filma".

**Why**: Convierte scroll pasivo en agency activa. El usuario siente que dirige
la película, no que la ve.

### 4. Restricción cromática / Chromatic restraint
La mayoría de SOTDs usan **2–3 colores máximo** (a menudo monocromo + 1 accent).
Los gradients de 5 colores y los neones saturados sin jerarquía son red flags
instantáneos. La tipografía suele ser blanco sobre negro, negro sobre blanco, o
un acento (rojo, amarillo, verde lima) usado con precisión quirúrgica.

**Why**: El color compite con el movimiento por atención. Más color = menos
impacto de animación.

### 5. Audio opcional, nunca obligatorio / Audio optional, never required
Algunos SOTDs tienen audio reactivo al scroll. Es un plus, jamás un requisito.
Si lo implementas, debe activarse con un click explícito ("Enable sound") —
autoplay de audio mata conversiones y penaliza SEO.

### 6. Performance = parte del diseño
Un hero que dropea a 30fps en móvil pierde el 80% del impacto. Las optimizaciones
(LOD, instancing, dpr clamp, lazy-load de GLB) no son un afterthought — son
decisiones de diseño que se toman al inicio, junto con la paleta y la tipografía.

---

## Routing de Stack / Stack Routing

El skill soporta 3 stacks. **Decide el stack ANTES de escribir código**, basándote
en el caso de uso. Rutar mal = refactor completo.

| Caso de uso | Stack | Por qué |
|---|---|---|
| Next.js / React app, hero interactivo, cámara orbit, modelos 3D | **R3F + drei + GSAP** | Declarativo, hooks de React, ecosistema maduro, code-splitting fácil |
| Vanilla JS, sin framework, máximo control de render loop, shaders custom pesados | **Three.js vanilla** | Sin overhead de reconciler, acceso directo a WebGLRenderer |
| Marketing site liviano, parallax 2.5D puro, sin WebGL, SEO crítico | **CSS 3D + GSAP ScrollTrigger** | Carga <30KB JS, indexable, 60fps fácil en móvil |

**Regla práctica**: Si el usuario menciona React/Next.js → R3F. Si menciona
"vanilla" o "sin framework" → Three.js. Si menciona "landing page simple" o
"SEO" o "rápido" → CSS 3D.

Para detalles de implementación de cada stack, lee el archivo correspondiente:
- `references/r3f-gsap.md` — Setup completo, patrones declarativos, integración con Next.js App Router, Suspense y loader
- `references/threejs-vanilla.md` — Render loop manual, gestión de escena, dispose patterns, sin framework
- `references/css-3d-gsap.md` — Transforms CSS 3D, ScrollTrigger, perspective, layering

---

## Los 5 Arquetipos / The 5 Archetypes

Todo hero animado nivel Awwwards cae en uno de 5 arquetipos. Identifica el
arquetipo antes de diseñar — cada uno tiene reglas, assets, y trampas propias.

### Arquetipo 1: 2.5D Parallax por capas
**Cuándo**: Storytelling visual, "scroll para revelar", hero con producto
fotografiado en capas (fondo, sujeto, frente).

**Estructura**: 3–7 capas PNG con transparencia, cada una a distinta profundidad
Z. Mouse parallax + scroll parallax combinados. GSAP ScrollTrigger controla
posiciones; lerp suaviza el movimiento del mouse.

**Assets clave**: `assets/components/Parallax2D.tsx` (componente base con mouse +
scroll parallax listo), `references/css-3d-gsap.md` (versión sin WebGL).

**Trampa común**: Demasiadas capas (>8) se ven caóticas. Demasiado delta Z
(>500px) causa judder en Safari. Limpia los PNGs de halo antes de exportar.

### Arquetipo 2: 3D Scene con GLB
**Cuándo**: Producto 3D (zapatilla, botella, auto), escena abstracta con cámara
orbit, portfolio de diseñador 3D.

**Estructura**: `<Canvas>` con `<PerspectiveCamera>`, `<OrbitControls>` (si
interactivo) o camera animada con `useFrame`. Modelo GLB cargado con `useGLTF` +
`Suspense`. Iluminación de 3 puntos (key, fill, rim) con `<Environment preset>`
para IBL. Sombra suave con `<ContactShadows>`.

**Assets clave**: `assets/components/Hero3DScene.tsx` (escena base con cámara,
luces, ContactShadows), `references/r3f-gsap.md` (setup de Loader y Suspense).

**Trampa común**: GLBs de +5MB matan el load. Usa Draco compression (`npx
gltf-transform optimize input.glb output.glb --texture-compress webp`). Capa dpr
a `[1, 2]` — pixel ratio >2 en retina solo quema GPU sin ganancia visible.

### Arquetipo 3: Shaders GLSL custom
**Cuándo**: Branding abstracto, hero de agencia, "wow factor" puro, simulaciones
(fluid, smoke, displacement).

**Estructura**: `<shaderMaterial>` en R3F o `THREE.ShaderMaterial` en vanilla.
Vertex shader desplaza geometría (plane subdividido 256x256 mínimo). Fragment
shader pinta color. Uniforms conectados a mouse/scroll via `useFrame` o render
loop. Post-processing con `@react-three/postprocessing` (Bloom, ChromaticAberration,
Noise).

**Assets clave**: `assets/glsl/noise.frag` (Simplex noise reutilizable),
`assets/glsl/distortion.vert` (vertex displacement), `assets/glsl/fluid.frag`
(simulación de fluidos), `assets/glsl/postprocessing.frag` (bloom + aberration
combinados), `assets/components/ShaderPlane.tsx` (componente R3F base).

**Trampa común**: Shaders que se ven increíbles a 60fps pero consumen 90% GPU.
Perf-budget: si el shader no corre a 60fps en un MacBook Air M1, simplifícalo.
Reduce subdivisiones del plane, usa half-float en vez de full-float para
simulaciones.

### Arquetipo 4: Distortion hover en imágenes
**Cuándo**: Portfolio de fotografía, e-commerce de moda, brand site con hero
image como protagonista.

**Estructura**: Imagen en un plane con displacement map. Mouse position empuja
el displacement. Al hover, intensidad aumenta. Tres variantes comunes: (a)
displacement por textura (mapa de ruido), (b) displacement procedural (shader de
noise), (c) RGB shift + blur direccional.

**Assets clave**: `assets/components/DistortionImage.tsx` (componente con hover
state y displacement), `assets/glsl/distortion.vert`.

**Trampa común**: Hover "tembloroso" cuando el mouse entra/sale rápido. Usa
`gsap.to()` con `power3.out` y duración 0.6s para suavizar transiciones de
intensity uniform.

### Arquetipo 5: Tipografía 3D cinemática
**Cuándo**: Agencia creativa, marca personal, site de estudio de diseño, SaaS
con nombre fuerte.

**Estructura**: Texto 3D como `Text3D` de drei (necesita fuente JSON) o
extruded geometry con `troika-three-text`. Animación de entrada: caracteres
montan desde profundidad Z con stagger (cada char 50ms después del anterior).
Posible morph entre palabras (geometry interpolation) o disolución por shaders.

**Assets clave**: `assets/components/Cinematic3DText.tsx` (stagger de entrada,
glow opcional, soporta troika + Text3D).

**Trampa común**: Text3D con fuentes pesadas (+200KB JSON) mata load. Prefiere
troika-three-text (usa SDF, renderiza crisp a cualquier tamaño). Si usas Text3D,
comprime la fuente JSON con `gltf-transform` o usa fuentes sans-serif livianas.

---

## Workflow: de concepto a hero premiado

Sigue este orden. Saltarte pasos = retrabajo.

### Paso 1: Brief técnico (5 min)
Antes de código, define en texto:
- **Arquetipo**: ¿cuál de los 5?
- **Stack**: R3F / vanilla / CSS 3D (usa la tabla de routing)
- **Asset list**: ¿qué necesitas del usuario? (GLB, imágenes PNG en capas, fuentes)
- **Paleta**: 2–3 colores máximo, define cuál es el accent
- **Timing**: duración de entrada del hero (target 2–3s)
- **CTA**: ¿el hero lleva CTA visible o es "puro arte" con scroll como invitación?

### Paso 2: Setup del proyecto
Ejecuta el script de setup correspondiente al stack:
- `bash scripts/setup-r3f.sh` — Next.js + R3F + drei + GSAP + postprocessing
- `bash scripts/setup-threejs.sh` — Vite + Three.js + GSAP
- `bash scripts/setup-css3d.sh` — Vite + GSAP + ScrollTrigger

Estos scripts instalan deps con versiones pinneadas y crean estructura de
carpetas. NO instales manualmente — las versiones pinneadas evitan breakages.

### Paso 3: Stub visual primero
Antes de animar, monta el hero **estático**. Imágenes, texto, layout. Esto
valida composición y jerarquía antes de invertir tiempo en animación. Si el hero
estático no se ve bien, animarlo no lo salvará.

### Paso 4: Animación primaria
Implementa la "idea dominante" del Paso 1. Una sola animación, perfeccionada.
Itera timing, easing, intensidad. **No agregues nada más hasta que esta se
sienta correcta** — prueba en mobile y desktop.

### Paso 5: Capas secundarias
Solo después del paso 4: añade mouse parallax, scroll triggers secundarios,
micro-interacciones de hover. Cada capa nueva debe **servir** a la idea
dominante, no competir con ella.

### Paso 6: Performance pass
Ejecuta Lighthouse + Chrome Performance en móvil. Targets:
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- 60fps sostenido en scroll (Chrome perf tab, main thread <50%)
- Lighthouse Performance > 85

Si no pasas, lee `references/performance-budget.md` y aplica las optimizaciones
por orden de impacto.

### Paso 7: Polish Awwwards
Detalles que separan "bueno" de "premiado":
- Cursor custom (un círculo que crece al hover de elementos interactivos)
- Smooth scroll (Lenis, no native smooth)
- Loading screen con transición al hero (no un spinner feo)
- prefers-reduced-motion respetado SIEMPRE
- Fallback estático para usuarios sin WebGL (detected con `WebGLRenderingContext`)

---

## Performance Budget (Balance wow + fps)

Lee `references/performance-budget.md` para el detalle completo. Reglas de oro:

1. **DPR clamp**: `dpr={[1, 2]}` nunca más. Pixel ratio 3 en iPhone Pro quema GPU
   por cero ganancia visual percibida.
2. **Lazy-load GLB**: `useGLTF.preload()` + `Suspense` con fallback elegante.
3. **LOD si modelo > 500KB**: `<Detailed distances={[0, 5, 15]}>` con 3 versiones.
4. **Frame loop**: `frameloop="demand"` si la escena no anima por sí sola.
5. **Pause on offscreen**: si el hero sale del viewport, pausa el render loop.
6. **Mobile fallback**: detecta `navigator.hardwareConcurrency < 4` y ofrece
   versión CSS-only.
7. **Bundle**: Tree-shakea drei (`import { OrbitControls } from '@react-three/drei'`
   no `import * from`).
8. **Textrue compression**: WebP en vez de PNG, Basis Universal para 3D, max 1024px
   en mobile, 2048px en desktop.

---

## Anti-patrones / Anti-patterns (lo que NUNCA haces)

- **Tween de 0.3s con `linear`**: se ve como app, no como Awwwards. Mínimo 1.2s
  con `power3.out` o `expo.out`.
- **3+ shaders compitiendo**: mata todos menos uno.
- **Background gradient de 5 colores**: usa monocromo o 2 max.
- **Cámara que se mueve sin propósito**: cada movimiento de cámara debe revelar
  algo, no solo "dar la vuelta".
- **Hover scale 1.1 sin contexto**: aburrido. Usa distortion, displacement, o
  chromatic shift en su lugar.
- **Modal de "click to enter" sin transición**: si necesitas preload, la
  transición DEBE ser parte del hero (morph del loader al hero).
- **Ignorar `prefers-reduced-motion`**: no es opcional. Awwwards descalifica.
- **Embed de video de 20MB como "hero"**: no es 3D, es pereza. Si quieres video,
  comprímelo a <3MB con `ffmpeg -crf 28 -preset slow -movflags +faststart`.

---

## Asset Inventory / Inventario de Assets

### Shaders GLSL (`assets/glsl/`)
| Archivo | Uso | Cuándo leerlo |
|---|---|---|
| `noise.frag` | Simplex/Perlin noise 2D y 3D | Arquetipo 3 (Shaders) y 4 (Distortion) |
| `distortion.vert` | Vertex displacement por noise | Arquetipo 4 (Distortion hover) |
| `fluid.frag` | Fluid simulation ping-pong | Arquetipo 3 cuando necesitas fluid |
| `postprocessing.frag` | Bloom + chromatic aberration + grain | Cualquier escena 3D para look cinemático |

### Componentes base (`assets/components/`)
| Archivo | Stack | Para qué |
|---|---|---|
| `Hero3DScene.tsx` | R3F | Escena base: Canvas, cámara, luces, ContactShadows |
| `Parallax2D.tsx` | R3F o CSS 3D | Capas 2.5D con mouse + scroll parallax |
| `ShaderPlane.tsx` | R3F | Plane con shaderMaterial, uniforms listos |
| `DistortionImage.tsx` | R3F | Imagen con displacement al hover |
| `Cinematic3DText.tsx` | R3F | Texto 3D con stagger de entrada (troika) |

Copia estos archivos al proyecto como punto de partida. **No los importes
directamente del skill** — edítalos in-place para tu caso.

### Setup scripts (`scripts/`)
| Script | Qué instala |
|---|---|
| `setup-r3f.sh` | Next.js 14 + R3F 8 + drei 9 + GSAP 3 + @react-three/postprocessing + lenis |
| `setup-threejs.sh` | Vite + three 0.160 + gsap 3 + lenis |
| `setup-css3d.sh` | Vite + gsap 3 + ScrollTrigger + lenis |

### References (`references/`)
| Archivo | Cuándo leerlo |
|---|---|
| `awwwards-patterns.md` | Al inicio del proyecto — catálogo de patrones SOTD con análisis |
| `web-2026-standards.md` | **LECTURA OBLIGATORIA** — estándares 2026: Clarity-First, WebGPU/TSL, Draco+KTX2, accesibilidad, cuándo usar 3D vs video |
| `r3f-gsap.md` | Si elegiste stack R3F |
| `threejs-vanilla.md` | Si elegiste Three.js vanilla |
| `css-3d-gsap.md` | Si elegiste CSS 3D + GSAP |
| `performance-budget.md` | Siempre, antes del perf pass (paso 6) |
| `loop-protocol.md` | Cuando el usuario pida un hero "completo" o "nivel Awwwards" — activa el agent loop de 4 agentes |
| `audit-checklist.md` | Siempre que se use el loop — es el criterio del Auditor (objetivo) y referencia cruzada con User Simulator (subjetivo) |

---

## Agent Loop System (Loop Engineering)

Este skill incluye un **sistema de agent loop autónomo** que itera hasta
alcanzar calidad Awwwards sin intervención humana en cada paso.

### Cuándo activar el loop

**ACTIVA el loop** cuando el usuario pida:
- "Diseña un hero completo" (implica múltiples archivos)
- "Quiero un hero nivel Awwwards" (calidad alta esperada)
- "Hero profesional / premium / wow" (calidad alta esperada)
- Cualquier hero donde mencione 2+ arquetipos
- Cualquier hero donde la complejidad sugiera que una pasada no basta

**Ejecución directa (sin loop)** cuando el usuario pida:
- "Dame un snippet de parallax para una capa"
- "¿Cómo se usa DistortionImage?" (explicación)
- "Modifica el color del hero" (cambio trivial)
- "Explícame el arquetipo 3" (educación)

### Cómo funciona el loop

Lee `references/loop-protocol.md` para el detalle completo. Resumen:

```
Usuario pide hero → 
  Loop autónomo de 4 agentes:
    Creator genera v1 →
    [Auditor (objetivo) + User Simulator (subjetivo)] evalúan en paralelo →
    si falla: Corrector aplica fixes de AMBOS → v2 →
    repite hasta que ambos pasen o max_iterations →
  Entrega resultado + reporte
```

**4 roles**:
1. **Creator** — genera el hero siguiendo el skill
2. **Auditor** — evalúa 26 criterios objetivos (DPR, contrast, syntax, etc.)
3. **User Simulator** — evalúa subjetivamente (wow factor, alma, SOTD-worthy)
4. **Corrector** — aplica fixes mínimos mapeados a C-IDs o S-IDs

El éxito requiere que **ambos** evaluadores pasen:
```
overall_pass = auditor.overall_pass AND user_simulator.subjective_score >= 7.5
combined_score = (auditor.score * 0.6) + (user_simulator.subjective_score * 0.4)
```

El User Simulator puede desactivarse con `--no-user-simulator` para loops más
rápidos donde solo importa la corrección técnica.

### 3 modos de ejecución

**Modo 1 (nativo)**: El agente GLM principal orquesta el loop spawnando
subagentes Creator/Auditor/Corrector. Requiere entorno con subagentes.

**Modo 2 (script Python autónomo)**:
```bash
python scripts/hero-loop.py \
  --prompt "Diseña un hero 3D para portfolio de fotógrafo" \
  --max-iterations 5 \
  --output-dir ./hero-output
```
Funciona en cualquier entorno con Python + acceso a GLM API. Ver
`scripts/hero-loop.py` para opciones.

**Modo 3 (híbrido)**: El agente principal ejecuta la iteración 1 y el
script Python corre las iteraciones 2-N en background.

### Criterios de éxito

El loop termina cuando:
1. Todos los criteria del checklist pasan (`overall_pass: true`)
2. Score ≥ 9.0 sin blockers
3. Max iterations alcanzado (default 5)
4. Estancamiento detectado (delta < 0.5 en 3 iteraciones)
5. Usuario aborta

El checklist (`references/audit-checklist.md`) tiene 26 criterios en 6
categorías: skill-compliance, performance, Awwwards principles,
accessibility, code quality, asset optimization.

### Output del loop

```
hero-output/
├── iteration-1/
│   ├── manifest.json       (decisiones tomadas)
│   ├── code/               (archivos generados)
│   ├── audit.json          (evaluación del auditor)
│   └── raw_output.md       (output completo del creator)
├── iteration-2/
│   └── ...
├── final/                  (mejor versión)
└── report.md               (resumen del loop)
```

---

## Triggering context / Cuándo activarse

Este skill DEBE activarse cuando el usuario mencione cualquiera de estos patrones:
- "hero section" + cualquier adjetivo (animado, 3D, premium, moderno)
- "Awwwards" o "Site of the Day" o "SOTD"
- "Three.js" o "R3F" o "React Three Fiber" o "WebGL"
- "parallax" + "scroll" o "mouse"
- "shader" + "hero" o "background"
- "3D" + "web" o "landing" o "hero"
- "GSAP" + "scroll" o "animation"
- "distortion" + "image" o "hover"
- Cualquier pedido de "hero con wow" o "landing premium"

NO activarse para:
- Landing pages estáticas sin animación
- Hero con solo video de fondo (es video, no 3D)
- Hero con solo imagen estática + texto
- Dashboards o apps internas

---

## Notas finales

Este skill está pensado para iterarse. Si después de usarlo sientes que falta un
arquetipo (ej: hero con partículas, hero con audio reactive, hero con
WebRTC/cámara), agrégalo siguiendo la estructura existente. Los Awwwards evolucionan
cada año — este skill también debe.

Si el usuario quiere referencias visuales concretas antes de empezar, deriva a
búsquedas web de `site:awwwards.com/sites-of-the-day` filtrando por año actual.
