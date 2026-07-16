# Awwwards Patterns Catalog

> Catálogo de patrones extraídos de Site of the Day (SOTD) 2022-2024. Cada patrón
> incluye qué lo hace ganar, qué stack usa típicamente, y qué trampa evitar.

## Tabla de contenidos
1. Patrones de composición visual
2. Patrones de movimiento
3. Patrones de interacción
4. Patrones de tipografía
5. Trampas frecuentes que descartan sitios

---

## 1. Patrones de composición visual

### 1.1 Monocromo + 1 accent
- **Qué**: Fondo negro o crema, todo el contenido en blanco/negro, un solo color
  (rojo, amarillo, verde lima, cyan) aparece en 2-3 lugares estratégicos.
- **Stack**: Cualquiera.
- **Ejemplos**: Active Theory, Resn, Anzi.
- **Trampa**: Usar el accent en más de 5 elementos pierde el contraste.

### 1.2 Grid roto asimétrico
- **Qué**: Layout grid de 12 columnas pero elementos cruzan columnas de forma
  impredecible. Crea tensión visual.
- **Stack**: CSS 3D + GSAP (más liviano) o R3F (si el grid es 3D).
- **Trampa**: Si todos los elementos rompen el grid, no hay grid. Solo 1-2
  elementos deben romper.

### 1.3 Ventana cinematográfica (letterbox)
- **Qué**: Hero con barras negras superior/inferior (tipo película 2.35:1) que se
  abren al hacer scroll.
- **Stack**: CSS 3D + GSAP (las barras son divs animados).
- **Ejemplos**: Sitios de estudio de cine, portfolios de directores.

### 1.4 Profundidad por capa (deep stack)
- **Qué**: 5-7 capas PNG con profundidad Z creciente. Mouse parallax revela
  profundidad real percibida.
- **Stack**: CSS 3D + GSAP o R3F.
- **Trampa**: Más de 8 capas = judder. Delta Z > 500px = judder en Safari.

### 1.4b Crossfade por Z (transiciones elegantes intercapa)
- **Qué**: Cuando la cámara hace dolly a través de múltiples capas, cada capa
  calcula su propia visibilidad (alpha) basándose en la **Z de la cámara
  relativa a su propia Z** — no en un fade global sincronizado. La fórmula:
  ```
  layerAlpha = smoothstep(camFar, layerZ + fadeIn, cameraZ) *
               (1 - smoothstep(layerZ - fadeOut, layerZ - fadeOut*2, cameraZ))
  ```
  Cada capa aparece gradualmente cuando la cámara se acerca, alcanza su pico
  de visibilidad justo antes de ser cruzada, y se desvanece suavemente después.
- **Stack**: R3F + GLSL (uniform `uLayerAlpha` calculado en CPU con
  `THREE.MathUtils.smoothstep`, inyectado en el fragment shader).
- **Por qué es elegante**: Cada capa "respira" a su propio ritmo. Las
  transiciones se solapan en vez de ser secuenciales — la capa fondo aún
  es visible (atenuada) cuando la niebla ya apareció, creciendo en paralelo.
- **Trampa**: Si todas las capas usan el mismo `fadeIn`/`fadeOut`, la
  transición se siente mecánica. Usa valores distintos por capa (las capas
  lejanas tienen `fadeIn` más grande para aparecer más temprano).

### 1.4c Niebla volumétrica intercapa
- **Qué**: Un plano con shader de bruma colocado a una Z intermedia entre
  dos capas. Su alpha crece cuando la cámara se acerca y decae después de
  cruzarla. Da la sensación de "atravesar niebla" entre escenas.
- **Stack**: R3F + GLSL (fBm noise de baja frecuencia + `uLayerAlpha` con
  crossfade por Z). `THREE.NormalBlending` (no Additive) para que parezca
  bruma real, no glow.
- **Por qué es elegante**: Sin esto, el cruce entre capas se siente "seco"
  — pasas de estrellas a partículas sin transición material. La niebla
  llena ese vacío con un volumen que se intensifica y se disuelve.
- **Trampa**: Demasiada niebla (>0.5 alpha) tapa las capas que están detrás.
  Mantén `intensity = fog * uLayerAlpha * 0.45` como máximo.

### 1.4d Burst orgánico al cruzar una capa
- **Qué**: Cuando la cámara pasa exactamente por la Z de una capa de
  partículas, estas se expanden brevemente hacia afuera y aumentan su
  brillo — un flash sutil que marca el cruce del plano.
- **Stack**: R3F. Detectar el cruce comparando `prevCameraZ` con `camZ`,
  disparar `burstValue = 1.0`, y decaerlo exponencialmente
  (`burstValue -= 0.018` por frame). Inyectar como `uBurst` en el shader.
- **Por qué es elegante**: Da feedback cinético del progreso. El usuario
  siente "acabo de cruzar algo" en vez de "las partículas simplemente
  desaparecieron".
- **Trampa**: Si el burst es muy intenso o dura mucho, se vuelve distractor.
  Decaimiento de 0.018/frame (~55 frames, ~0.9s a 60fps) es el sweet spot.

### 1.4e Coreografía de color en 4 fases
- **Qué**: La paleta global del hero cambia en 4 fases sincronizadas con
  el progreso del dolly (`uDepth` 0..1):
  1. **Lejano** (0.0-0.30): frío violeta/azul, estrellas activas
  2. **Aproximación** (0.30-0.55): paleta tibia, niebla crece
  3. **Cruce de medio** (0.55-0.80): burst de partículas, paleta cálida
  4. **Llegada** (0.80-1.00): capa frente se materializa, amber/oro pleno
- **Stack**: GLSL con `mix(colorFar, colorNear, uDepth)` en cada fragment
  shader. `uDepth` se inyecta con lerp suave (0.08) para transición fluida.
- **Por qué es elegante**: Crea una narrativa visual. El usuario siente que
  viaja no solo en Z sino también en temperatura/emoción.
- **Trampa**: Si todas las capas usan exactamente los mismos colores de
  inicio y fin, la transición se siente plana. Da a cada capa su propia
  interpretación de la paleta (el fondo va de azul→amber, las partículas
  van de blanco-azul→blanco-amber, la niebla va de violeta→cobre).

### 1.4f Letter reveal secuencial (por letra)
- **Qué**: El título del hero aparece letra por letra, cada una con un
  pequeño retraso (`0.08s` típico). Cada letra entra con `translateY(60px)
  rotateX(-40deg)` → `translateY(0) rotateX(0)` con cubic-bezier suave.
- **Stack**: CSS + JS. El JS parte el texto en `<span class="letter">` y
  asigna `animation-delay = baseDelay + i * 0.08s` por letra.
- **Por qué es elegante**: Es la forma más pura de "tipografía como
  protagonista". Sin WebGL, sin partículas, solo el texto cobrando vida.
  Comunicación inmediata + pulido alto.
- **Ejemplo**: ARAGAL — "ARAGAL" con 6 letras, delays 0.8s/0.88s/0.96s/...
- **Trampa**: Si el delay por letra es muy largo (>0.15s) se siente lento.
  Si muy corto (<0.04s) se siente simultáneo, pierde el efecto. 0.08s es
  el sweet spot.

### 1.4g Golden dust al click (micro-reward)
- **Qué**: Al hacer click en cualquier parte del hero, spawnan 12 partículas
  doradas que se expanden radialmente con `cubic-bezier(0.16, 1, 0.3, 1)`.
  Cada partícula tiene un ángulo fijo (360°/12) y velocidad aleatoria.
  Duración ~800-1200ms, desaparecen con `scale(0)`.
- **Stack**: Vanilla JS + Web Animations API (`element.animate()`). Sin
  librerías. 12 partículas × 60fps = impacto perf mínimo.
- **Por qué es elegante**: Convierte cada click en un momento de delight.
  Comunicación: "esta página es mágica". Refuerzo positivo de la
  interacción sin ser intrusivo.
- **Ejemplo**: ARAGAL — golden dust en todo el document.
- **Trampa**: Si spawn más de 20 partículas por click, puede jank en
  mobile. 12 es el sweet spot. Usar `pointer-events: none` en las
  partículas para no bloquear clicks subyacentes.

### 1.4h Mouse glow con mix-blend-mode: screen
- **Qué**: Un círculo grande (400px) que sigue al mouse con
  `radial-gradient(circle, rgba(accent, 0.04) 0%, transparent 70%)` y
  `mix-blend-mode: screen`. Suma luz suave donde está el cursor.
- **Stack**: CSS + JS. `position: fixed`, `transform: translate(-50%, -50%)`,
  `transition: opacity 0.3s` para fade-in/out al entrar/salir del viewport.
- **Por qué es elegante**: Da sensación de "luz que sigue al cursor" sin
  la intrusión de un cursor custom completo. Sutil, premium.
- **Ejemplo**: ARAGAL — mouse-glow dorado suave.
- **Trampa**: `mix-blend-mode: screen` no funciona en Safari iOS < 13.
  Fallback: `opacity: 0.5` sin blend. Tamaño > 600px se siente como
  spotlight invasivo.

### 1.4i Partículas con conexiones (constelación)
- **Qué**: 150 partículas en Canvas 2D que se mueven libremente. Cuando
  dos partículas están a <100px de distancia, se dibuja una línea entre
  ellas con `opacity = (1 - dist/100) * 0.08`. Resultado: red de
  constelaciones dinámica.
- **Stack**: Canvas 2D + requestAnimationFrame. Sin librerías. O(n²) con
  n=150 = 11K comparaciones/frame, viable a 60fps.
- **Por qué es elegante**: Crea sensación de "red viva" sin la complejidad
  de WebGL. Las conexiones aparecen y desaparecen orgánicamente.
- **Ejemplo**: ARAGAL — connections doradas sutiles.
- **Trampa**: > 200 partículas con conexiones = jank. Para más, usar
  spatial hashing o WebGL. Sin `globalCompositeOperation = 'lighter'`
  los puntos se ven planos.

### 1.4j Deco-line con gradient expansión
- **Qué**: Una línea horizontal corta (60px) con gradient
  `linear-gradient(90deg, transparent, accent, transparent)` que se
  expande desde `scaleX(0)` a `scaleX(1)` con cubic-bezier suave.
  Típicamente entre título y subtítulo.
- **Stack**: CSS puro con `@keyframes` y `transform-origin: center`.
- **Por qué es elegante**: Elemento divisor tipográfico que comunica
  "separación jerárquica" sin ser una línea sólida. El gradient lo
  hace sentir etéreo, no estructural.
- **Ejemplo**: ARAGAL — deco-line entre nombre y roles.
- **Trampa**: Línea > 120px pierde proporción. Línea sin gradient se ve
  como divider HTML corriente.

### 1.4k Loader 0% cinematográfico
- **Qué**: Pantalla de carga con contador `0% → 100%` tipográfico,
  tipografía enorme, fondo monocromo. Al llegar a 100% se desvanece
  hacia el hero. La tipografía del loader suele ser la misma del hero
  para continuidad visual.
- **Stack**: CSS + JS (counter) o WebGL (shader de progreso).
- **Por qué es elegante**: Convierte el tiempo de carga en parte de la
  experiencia. El usuario siente "esto se está preparando con cuidado".
- **Ejemplos**: Vero New-York, SSTR, Kenichi Aikawa, Artem Shcherbakov.
- **Trampa**: Si el sitio carga en <500ms, el loader se siente artificial.
  Solo usar cuando hay assets pesados (WebGL, video, GLB).

### 1.5 Negativo activo (whitespace como elemento)
- **Qué**: 60%+ del hero es espacio vacío. El contenido flota. Comunica lujo.
- **Stack**: Cualquiera.
- **Ejemplos**: Brand sites de lujo, agencias boutique.

### 1.6 VLM Auditor visual (auditoría con ojos)
- **Qué**: El Auditor del loop agent usa un Vision Language Model (VLM) para
  analizar screenshots del hero en distintos momentos del scroll. Recibe
  feedback cualitativo que las métricas numéricas no capturan:
  - Zonas negras muertas (no solo "luminancia < threshold")
  - Composición desbalanceada
  - Contraste percibido (no solo WCAG ratio)
  - Sensación de motion (comparando frames)
  - Elegancia premium (subjetivo pero útil)
- **Stack**: z-ai CLI (`z-ai vision -p "..." -i screenshot.png`) + Playwright
  para capturar screenshots en 3-5 posiciones de scroll.
- **Por qué es elegante**: El loop se vuelve verdaderamente autónomo. Sin VLM,
  el Auditor solo lee código y juzga teóricamente. Con VLM, "ve" el resultado
  y detecta bugs que un humano detectaría (zona muerta, contraste bajo,
  scroll indicator invisible, composición rota).
- **Prompt estructurado**: pedir al VLM que devuelva JSON con scores por área
  (visual, contraste, profundidad, motion, elegancia) + bugs detectados +
  fortalezas + recomendaciones. Esto permite parsear y actuar automáticamente.
- **Trampa**: el VLM tarda ~30s por screenshot. Para 4 heroes × 3 steps = 12
  screenshots = ~6min. Usar 3 steps (0%, 50%, 100%) en CI, no 5. Si el VLM
  devuelve texto en vez de JSON, usar parser que extrae el primer `{...}`.

### 1.7 Sistema orbital 3D (órbitas + planetas)
- **Qué**: Centro del hero con sistema solar miniatura: 3 órbitas concéntricas
  rotando a distintas velocidades (30s, 20s, 15s) + 10 planetas SVG + esfera
  central con glow. Parallax 3D con `perspective(1000px) rotateY/X` sigue
  el mouse.
- **Stack**: CSS puro (`@keyframes orbitRotate`) + SVG para planetas + JS
  para parallax 3D del sistema orbital.
- **Por qué es elegante**: Crea un punto focal magnético que comunica
  "sistema complejo orbitando alrededor del sujeto". Ideal para portfolios
  de atletas, marcas deportivas, productos técnicos.
- **Ejemplo**: Geremías Samuel Street Workout — esfera central con silueta
  de atleta en planche + 10 planetas en 3 órbitas.
- **Trampa**: más de 12 planetas = ruido visual. Las órbitas muy juntas
  (<40px de diferencia) se confunden. Velocidades muy distintas (>2x)
  rompen la armonía.

### 1.8 Multi-layer parallax con data-speed
- **Qué**: 4-7 capas de fondo (radial gradients) que se desplazan a distintas
  velocidades con el mouse. Cada capa tiene `data-speed="0.01"` a `"0.1"`
  y el JS aplica `translate(cx * speed * 80, cy * speed * 40)`.
- **Stack**: CSS (capas con `position: absolute; inset: 0`) + JS
  (`requestAnimationFrame` con lerp suave 0.04 para naturalidad).
- **Por qué es elegante**: Profundidad real percibida. Las capas lejanas se
  mueven poco, las cercanas mucho. Sin WebGL, solo CSS + JS.
- **Ejemplo**: Geremías Samuel — 4 capas de nebulosa roja + vignette + canvas
  particles + noise, cada una con speed distinto.
- **Trampa**: más de 7 capas = jank en mobile. Speed > 0.15 = disonancia.
  Usar `requestAnimationFrame` con lerp (0.04), no `mousemove` directo.

### 1.9 Counter animation (stats que cuentan)
- **Qué**: Stats con `data-count="10"` que animan de 0 a N en 2 segundos
  con `requestAnimationFrame`. Empiezan tras un delay (800ms típico).
- **Stack**: JS puro. `increment = target / (duration / 16)`, loop con
  `requestAnimationFrame` hasta llegar al target.
- **Por qué es elegante**: Comunicación instantánea de logros ("10 años",
  "6 estáticos dominados"). El counter dirige la atención y da peso a los
  números.
- **Ejemplo**: Geremías Samuel — 3 stats con iconos SVG que cuentan al cargar.
- **Trampa**: más de 4 stats = ruido. Duration > 3s = aburre. Sin iconos
  se ven desnudos. Usar `Math.floor()` durante la animación, no `toFixed`.

### 1.10 Esfera central con SVG custom
- **Qué**: Esfera circular con ilusión 3D via `radialGradient` + `box-shadow`
  + `inset` shadows. Contiene SVG custom dibujado a mano (silueta, icono,
  forma) + overlay de glow + estrellas pulsantes.
- **Stack**: CSS (`border-radius: 50%`, `box-shadow` con glow rojo, `inset`
  para profundidad) + SVG inline para el contenido + `::before`/`::after`
  para gradientes de iluminación.
- **Por qué es elegante**: Punto focal con peso visual. El SVG custom lo
  hace único (no es una foto stock). Las estrellas pulsantes dan vida.
- **Ejemplo**: Geremías Samuel — esfera 220px con silueta de planche + 6
  estrellas pulsantes.
- **Trampa**: tamaño > 300px domina demasiado. Sin `box-shadow` se ve plano.
  Las estrellas > 8 = ruido. Usar `saturate(0.85) contrast(1.15)` en imgs.

### 1.11 Layout C: Grid asimétrico 3 columnas
- **Qué**: Hero dividido en 3 columnas con proporciones asimétricas
  (`grid-template-columns: 1fr 1.2fr 1fr`). Izquierda: nombre + stats.
  Centro: visual principal (orbital, esfera, canvas). Derecha: traits/icons.
- **Stack**: CSS Grid + Flexbox para alineación vertical.
- **Por qué es elegante**: Rombpe la simetría aburrida del centrado. Comunicación
  rica: izquierda dice quién, centro dice qué, derecha dice cómo. Ideal para
  portfolios, marcas deportivas, productos con múltiples facetas.
- **Ejemplo**: Geremías Samuel — 3 cols con nombre/stats | orbital | traits.
- **Trampa**: en mobile colapsar a 1 col centrada. Columnas muy desiguales
  (>2x) rompen balance. Centro debe ser el más ancho (1.2-1.5x).

### 1.12 Núcleo 3D con shader de deformación (simplex noise)
- **Qué**: Esfera 3D (IcosahedronGeometry alta resolución) con ShaderMaterial
  que deforma los vértices usando `snoise(pos * scale + uTime * speed)`. El
  mouse aumenta la intensidad de deformación via uniform `uMouseForce`.
- **Stack**: Three.js + ShaderMaterial + simplex noise GLSL inline.
  Vertex shader: `pos += normal * noise * (0.3 + uMouseForce * 0.5)`.
  Mouse force crece al mover (+0.05) y decae con `*= 0.95` cada frame.
- **Por qué es elegante**: El núcleo "respira" y reacciona al mouse. Sin
  contacto se mueve orgánicamente (simplex noise). Con contacto se deforma
  más violentamente. Comunicación: "esto está vivo".
- **Ejemplo**: AETHER Quantum Core — icosaedro radio 1.2, subdiv 40,
  deformación 0.3 base + 0.5 mouse.
- **Trampa**: subdiv < 20 = deformación facetada visible. noiseScale > 3
  = deformación caótica. Mouse force sin decaer = deformación permanente.

### 1.13 Fresnel en mesh 3D (brillo de bordes)
- **Qué**: En el fragment shader del mesh 3D, calcular `fresnel = pow(1.0 -
  dot(viewDir, vNormal), 2.0)` y sumar al color final. Crea halo luminoso
  en los bordes del mesh visto desde la cámara.
- **Stack**: GLSL en fragment shader de ShaderMaterial. `viewDir = normalize(
  cameraPosition - vPosition)`.
- **Por qué es elegante**: Da sensación de "energía contenida" — el borde
  brilla como si el objeto estuviera emitiendo luz. Sin Fresnel el mesh se
  ve opaco y muerto.
- **Ejemplo**: AETHER — `finalColor = baseColor + fresnel * uColorA * 1.5`.
- **Trampa**: power < 1.5 = brillo muy extendido. Sin normalizar viewDir =
  artefactos. Si la geometría no tiene normales suaves, Fresnel no funciona.

### 1.14 Partículas esféricas (5000+ con vertexColors)
- **Qué**: Sistema de partículas con distribución esférica (radius/theta/phi)
  en vez de cuadrante plano. 5000+ partículas con `vertexColors: true` y
  `AdditiveBlending` para glow orgánico.
- **Stack**: Three.js Points + BufferGeometry + PointsMaterial.
  ```js
  const radius = 2 + Math.random() * 3;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  pos = [r*sin(phi)*cos(theta), r*sin(phi)*sin(theta), r*cos(phi)];
  ```
- **Por qué es elegante**: Envuelve el objeto central en una nube 3D real.
  Las partículas no son planas — están distribuidas en una esfera. Con
  rotación lenta (0.05/frame) crean sensación de campo magnético.
- **Ejemplo**: AETHER — 5000 partículas cyan/magenta en radio 2-5.
- **Trampa**: > 10000 partículas = jank en mobile. Sin AdditiveBlending se
  ven planas. Sin vertexColors se ven monocromas aburridas.

### 1.15 Drag para rotar + auto-rotación híbrida
- **Qué**: Mesh rotable con drag del mouse. Cuando no hay drag, auto-rotación
  lenta (`targetRotY += 0.002`). Lerp suave entre target y current (0.05).
- **Stack**: Three.js + JS. `mousedown` → `isDragging=true`, `mousemove` →
  `targetRotY += deltaX * 0.005`, `mouseup` → `isDragging=false`. En loop:
  `if(!isDragging) targetRotY += 0.002`.
- **Por qué es elegante**: El objeto se siente "vivo" — siempre se mueve
  pero el usuario puede tomar control. Sin drag = contemplativo. Con drag
  = interactivo.
- **Ejemplo**: AETHER — `core.rotation.x/y` con lerp 0.05.
- **Trampa**: Sin auto-rotación, el objeto se ve muerto cuando no hay drag.
  Sin lerp, el drag se siente brusco. Lerp > 0.1 = respuesta instantánea
  perdiendo elegancia.

### 1.16 Telemetría HUD dinámica (fake data que cambia)
- **Qué**: HUD con valores que se actualizan cada 1-2s con números fake
  realistas (frecuencia 140-150Hz, GPU 60-80%, estabilidad 98-99.9%).
- **Stack**: `setInterval(() => { el.innerText = ... }, 1500)` con
  `Math.random()` para variación.
- **Por qué es elegante**: Da sensación de "sistema vivo monitoreándose".
  Comunicación: "esto es real, está siendo medido ahora". Sin valores
  dinámicos el HUD se ve estático y falso.
- **Ejemplo**: AETHER — 3 tel-items (frecuencia, GPU, estabilidad) que
  cambian cada 1.5s.
- **Trampa**: actualizar cada < 1s = distracción. Valores sin rango realista
  (ej: GPU 500%) = rompe inmersión. Sin colores diferenciados (warning vs
  active) = aburrido.

### 1.17 Túnel 3D infinito (scroll hijacking con Z)
- **Qué**: Túnel de 50+ capas `.ring` con `translateZ` de 0 a -4900. El
  scroll del mouse controla la Z de la "cámara" via `wheel` event. Loop
  infinito: `z = ((z + 4900) % 5000) - 4900`.
- **Stack**: CSS 3D (`perspective: 800px`, `transform-style: preserve-3d`)
  + JS (`wheel` event → `cameraTargetZ -= deltaY * 1.5`, lerp 0.08).
- **Por qué es elegante**: Sensación de "viajar a través del espacio".
  Scroll vertical = movimiento Z. Loop infinito = nunca termina. Fade out
  de capas al cruzar la cámara (`opacity = 1 - (z + 100) / 300`).
- **Ejemplo**: Void Tunnel — 50 anillos cyan/magenta, scroll infinito.
- **Trampa**: < 30 capas = se ven huecos. Sin fade out al cruzar cámara =
  pop visual. Sin lerp = movimiento brusco. `wheel` event sin `preventDefault`
  = scroll de página también.

### 1.18 Film grain + scan line (estética cinematográfica)
- **Qué**: Overlay de grano de película (SVG turbulence) con animación de
  translate aleatorio cada 0.2s. Línea de scan horizontal que baja de 8vh
  a 92vh en 4s linear.
- **Stack**: CSS `background-image: url("data:image/svg+xml,...feTurbulence...")`
  + `@keyframes grain 0.2s steps(2) infinite` + `@keyframes scan 4s linear`.
- **Por qué es elegante**: Da sensación de "film grabado" — comunica
  realismo, urgencia, misterio. El grano rompe la perfección digital. La
  scan line refuerza el motif tecnológico.
- **Ejemplo**: Void Tunnel — grano opacity 0.05 + scan line cyan.
- **Trampa**: grano opacity > 0.1 = distracción. Scan line > 3px = invade.
  Sin `steps(2)` el grano se ve suave (no crispy). Sin `linear` la scan
  line acelera/decelera.

---

## 2. Patrones de movimiento

### 2.1 Scroll como dolly de cámara
- **Qué**: El scroll mueve la cámara Z hacia adelante en una escena 3D. Los
  objetos pasan de lejos a cerca.
- **Stack**: R3F (`useFrame` + `camera.position.z = scroll.progress * 10`) o
  Three.js vanilla.
- **Ejemplos**: Locomotive scroll demos, portfolios 3D.
- **Trampa**: Si el rango de Z es muy amplio (>15 unidades), los objetos aparecen
  de la nada. Usa fog para fade-in.

### 2.2 Morph de tipografía
- **Qué**: Una palabra morfea a otra (geometry interpolation) o se disuelve en
  partículas y se reforma.
- **Stack**: R3F con troika-three-text + custom shader, o Text3D de drei con
  BufferGeometry manipulation.
- **Ejemplos**: Sitios de estudio de diseño, brand films.

### 2.3 Camera orbit reactivo al mouse
- **Qué**: La cámara orbita ligeramente alrededor del objeto cuando el mouse se
  mueve, sin OrbitControls invasivo. Lerp suave.
- **Stack**: R3F (`useThree` + lerp camera position) o Three.js vanilla.
- **Trampa**: Si el ángulo es > 20°, se siente como "drag". Mantén < 8°.

### 2.4 Stagger de entrada por palabra
- **Qué**: Cada palabra del headline monta desde abajo con 80-120ms de delay
  entre cada una. Easing `power4.out` con duración 1.2s por palabra.
- **Stack**: GSAP con SplitText (de pago) o split manual + gsap.to con stagger.
- **Ejemplos**: 90% de SOTDs usan algún stagger de entrada.

### 2.5 Pausa dramática (negative timing)
- **Qué**: Entre dos animaciones, hay 300-600ms de "nada". El ojo descansa.
  Comunican confianza.
- **Stack**: GSAP timeline con `position` parameter negativo o gap explícito.
- **Trampa**: Pausa > 1s se siente como bug. Pausa < 200ms no se nota.

### 2.6 Loop breathing
- **Qué**: Un elemento sutil (humo, fluido, partículas) anima en loop infinito
  con amplitud mínima. Genera "vida" sin demandar atención.
- **Stack**: Shaders (noise.frag), partículas con useFrame, o lottie loop.

---

## 3. Patrones de interacción

### 3.1 Cursor morfólogo
- **Qué**: El cursor default se oculta. Un círculo (o forma custom) sigue al
  mouse con lerp 0.15. Al hover sobre links/elementos, crece o cambia de forma.
- **Stack**: CSS + JS vanilla, o Lenis + R3F.
- **Trampa**: Si el lerp es muy fuerte (>0.3), se siente laggy. Si es muy bajo
  (<0.05), se siente pegajoso.

### 3.2 Magnetic buttons
- **Qué**: Botones que se atraen al cursor cuando éste está cerca (radio 100px).
  Easing suave de regreso cuando el cursor sale del radio.
- **Stack**: GSAP QuickTo + mousemove listener.

### 3.3 Hover reveals depth
- **Qué**: Al hover sobre un elemento 2D, se aplica perspective + rotateX/Y
  ligero (5-10°) simulando 3D. El contenido "se levanta".
- **Stack**: CSS 3D + GSAP, o R3F.

### 3.4 Scroll progress indicator sutil
- **Qué**: Una línea vertical o barra muy fina (1-2px) que crece con el scroll.
  Color accent. No intrusiva.
- **Stack**: CSS + JS vanilla o ScrollTrigger.

### 3.5 Click-and-drag para explorar
- **Qué**: En heroes 3D, el usuario puede drag para orbitar (con cursor de "grab"
  → "grabbing"). Instrucción sutil ("drag to explore").
- **Stack**: R3F con OrbitControls (enableZoom: false, enablePan: false).

---

## 4. Patrones de tipografía

### 4.1 Display serif gigante (200-400px)
- **Qué**: Una sola palabra o frase corta en serif display (Playfair, Bodoni,
  Fraunces) a tamaño masivo. Color de alto contraste.
- **Stack**: CSS plano (text-rendering: optimizeLegibility).
- **Ejemplos**: Brand sites de moda, portfolios de fotografía.

### 4.2 Sans-serif grotesk + tracking amplio
- **Qué**: Headline en Helvetica Now, Inter, o Neue Haas Grotesk con
  letter-spacing 0.05-0.1em. Comunican tech/precisión.
- **Stack**: CSS plano.
- **Ejemplos**: SaaS premium, agencias tech.

### 4.3 Variable font + scroll
- **Qué**: Variable font anima su weight (wght) o width (wdth) según scroll.
  La tipografía "respira" con el usuario.
- **Stack**: CSS + JS (fontVariationSettings).

### 4.4 Texto 3D extruded con metalness
- **Qué**: Texto 3D con material metalness=0.9 roughness=0.1, IBL environment.
  Cámara orbit sutil. Glow opcional con postprocessing.
- **Stack**: R3F + drei Text3D + @react-three/postprocessing Bloom.

### 4.5 Outline + fill on scroll
- **Qué**: Texto comienza como outline (stroke), al hacer scroll se llena
  (fill). Transición con CSS background-clip o SVG stroke-dasharray.
- **Stack**: CSS + ScrollTrigger.

---

## 5. Trampas frecuentes que DESCALIFICAN sitios

Estos errores hacen que un sitio NO gane SOTD, por bueno que sea el resto:

### 5.1 Loading screen genérico
Spinner girando o barra de progreso sin carácter. El loader DEBE ser parte de la
experiencia — tipografía que monta, formas que se transforman en el hero.

### 5.2 Scroll jank en mobile
Cualquier judder < 30fps en scroll móvil es instantáneo reject. Test en iPhone
SE y Android低端.

### 5.3 Audio autoplay sin opt-in
Awwwards descalifica. Audio SIEMPRE requiere click explícito.

### 5.4 WebGL crash en Safari
Safari tiene issues específicos con WebGL2 y ciertas extensiones. Test siempre
en Safari 17+. Usa `WebGL1` fallback si tu shader usa features experimentales.

### 5.5 Sin prefers-reduced-motion
Awwwards exige accesibilidad. Sin esto, no hay SOTD.

### 5.6 Contraste insuficiente
Texto blanco sobre gradient pastel = fail WCAG AA. Test con
https://webaim.org/resources/contrastchecker/.

### 5.7 Hero sin hook claro
Si en 2 segundos el usuario no entiende "qué es este sitio", perdiste. El hero
debe comunicar categoría (producto, agencia, portfolio, e-commerce) en su
composición, no solo en el copy.

### 5.8 Demasiados efectos compitiendo
3+ animaciones primarias simultáneas = ruido. Una idea dominante, siempre.

### 5.9 `overflow-x: hidden` rompe `position: sticky` (CRÍTICO)
Por especificación CSS, cuando un ancestro tiene `overflow-x: hidden` y
`overflow-y: visible`, el navegador computa `overflow-y: auto` (no se puede
tener visible en un eje y no-visible en otro). Esto CONVIERTE al ancestro
en un contenedor de scroll — y `position: sticky` solo se "pega" dentro de
su contenedor de scroll más cercano, NO al viewport.

**Síntoma**: El sticky div del hero se despega apenas haces scroll. Pareciera
que el sticky "no funciona" o que ScrollTrigger está mal configurado, pero el
bug es de CSS puro.

**Fix**: Reemplazar `overflow-x: hidden` con `overflow-x: clip` en TODOS los
ancestros del sticky (html, body, main, section). `clip` no crea contenedor
de scroll y por tanto no rompe sticky.

```css
/* ❌ MAL — rompe sticky en descendientes */
html, body { overflow-x: hidden; }

/* ✅ BIEN — sticky sigue funcionando */
html, body { overflow-x: clip; }
```

Añadir además `will-change: transform; transform: translateZ(0);` al sticky
div para ayudar al compositor a pintar el sticky sin reflow por frame.

### 5.10 Hero sticky sin altura suficiente (CRÍTICO)
Si quieres un "pinned scroll" (canvas fijo mientras haces scroll a través
del dolly), el hero outer debe medir MÚLTIPLES viewport-heights, no 100vh.
Con `100vh` el sticky se despega al primer px de scroll.

```jsx
// ✅ Hero outer = N * 100vh, hero inner = sticky top-0 h-screen
<section style={{ height: "400vh" }}>
  <div className="sticky top-0 h-screen">{/* canvas + overlay */}</div>
</section>
```

Y el ScrollTrigger debe usar `start: "top top", end: "bottom bottom"` para
que el rango del dolly cubra los 400vh completos.

### 5.11 Lenis + ScrollTrigger sin sincronizar
Lenis hace smooth scroll pero GSAP ScrollTrigger por defecto lee
`window.scrollY` nativo, que se queda atrás del smooth scroll de Lenis.
Resultado: los triggers se disparan con progreso equivocado.

**Fix** en el LenisProvider:
```js
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
// + ScrollTrigger.refresh() tras 300ms (cuando el layout dinámico ya pintó)
```

### 5.12 Layout absoluto invertido (hero con iconos + scroll indicator)
Cuando un hero tiene elementos posicionados absolute al bottom (iconos
sociales, scroll indicator), el orden Z correcto es:

- `social-bar` → `bottom: 40px` (al ras, más cerca del borde)
- `scroll-indicator` → `bottom: 100px` (encima de los iconos)

Si se invierte (scroll-indicator abajo, social-bar arriba), el scroll
indicator queda oculto detrás de los iconos y la composición se rompe.

**Síntoma**: los iconos sociales se ven "debajo" o pegados a los botones
del CTA central, en vez de estar claramente al ras del borde inferior.

**Fix**: verificar siempre el orden en el CSS del hero de referencia.
Para ARAGAL:
```css
.social-bar { bottom: 40px; }
.scroll-indicator { bottom: 100px; }
```

**Trampa**: NO posicionar el social-bar con `bottom: 110px` o más — siempre
al ras (40px). El scroll-indicator es el que se mueve encima.

### 5.13 `<h1>` anidado en `<h1>` (hydration error)
Cuando se usa un componente de tipografía (como `LetterReveal`) que
renderiza su propio `<h1>` por defecto, envolverlo en otro `<h1>` produce
error de hidratación: "In HTML, <h1> cannot be a child of <h1>".

**Fix**: pasar `as="span"` (o `as="div"`) al componente tipográfico,
mantener el `<h1>` semántico en el wrapper externo:
```jsx
<h1>
  <LetterReveal as="span" text="TÍTULO" />
</h1>
```

### 5.14 Mouse listeners en canvas con pointer-events: none
Si un `<canvas>` tiene `pointer-events: none` (típico en heroes para no
bloquear clicks del CTA subyacente), los `mousemove` listeners en el
canvas NUNCA disparan. El mouse interaction parece "no funcionar".

**Fix**: listeners en `window`, posición computada con
`getBoundingClientRect()` del canvas:
```js
// ❌ MAL — canvas tiene pointer-events: none
canvas.addEventListener("mousemove", onMouseMove);

// ✅ BIEN — window recibe el evento, calculamos posición relativa
window.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});
```

### 5.15 WebGL crudo: atributos y precision faltantes (CRÍTICO)
Cuando se escribe un shader WebGL **sin Three.js** (canvas + `getContext("webgl")`
directo), Three.js NO inyecta automáticamente las declaraciones que normalmente
sí añade. Esto produce errores de compilación crípticos:

**Error típico 1** (vertex shader):
```
ERROR: 0:4: 'uv' : undeclared identifier
ERROR: 0:5: 'projectionMatrix' : undeclared identifier
ERROR: 0:5: 'modelViewMatrix' : undeclared identifier
ERROR: 0:5: 'position' : undeclared identifier
```

**Causa**: Three.js auto-inyecta `attribute vec3 position; attribute vec2 uv;
uniform mat4 modelViewMatrix, projectionMatrix;` al inicio del vertex shader.
En WebGL crudo hay que declararlos manualmente.

**Fix**:
```glsl
// ❌ MAL (funciona en Three.js, falla en WebGL crudo)
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// ✅ BIEN (WebGL crudo)
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**Error típico 2** (fragment shader):
```
ERROR: 0:2: '' : No precision specified for (float)
ERROR: 0:3: '' : No precision specified for (float)
... (repetido para cada línea con float)
```

**Causa**: WebGL1 GLSL ES 1.00 requiere `precision` explícito para `float`.
Three.js lo añade automáticamente (`precision highp float;`), pero WebGL crudo no.

**Fix**: añadir `precision highp float;` al inicio del fragment shader:
```glsl
// ✅ BIEN (WebGL crudo)
precision highp float;
uniform float uTime;
// ... resto del shader
```

**Error típico 3** (atributos del buffer):
Si declaras `attribute vec3 position` pero pasas `vertexAttribPointer(loc, 2, ...)`
(2 componentes), el shader recibe `position.z = 0` por defecto pero puede causar
warnings o comportamientos inesperados. Debes pasar los 3 componentes.

**Fix**: usar interleaved buffer con position (vec3) + uv (vec2):
```js
const vertexData = new Float32Array([
  // pos (xyz)    uv
  -1, -1, 0,    0, 0,
   1, -1, 0,    1, 0,
  -1,  1, 0,    0, 1,
   1,  1, 0,    1, 1,
]);
const stride = 5 * 4; // 5 floats × 4 bytes
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 3 * 4);
```

**Trampa**: Si migras un shader de un proyecto Three.js a WebGL crudo, SIEMPRE
añade `precision highp float;` al fragment y declara los attributes/uniforms
del vertex. Three.js los inyecta silenciosamente — no copies el shader literal.

### 5.16 Creator genera imports no existentes (CRÍTICO)
Cuando el Creator v2 genera código, puede incluir imports que no existen en
el proyecto:

**Errores típicos:**
- `import { motion } from 'framer-motion'` — framer-motion no instalado
- `import { causticsFragment } from '@/lib/library/shaders/caustics'` — path incorrecto (los shaders son .glsl, no módulos .ts)
- `import { Text3DCinematic } from '...'` cuando el brief pide "sin WebGL"

**Causa**: El Creator v2 conoce los componentes del registry pero no verifica
qué está instalado ni respeta restricciones del brief (sin WebGL, sin 3D).

**Fix 1 — Post-procesamiento del código generado**:
Después de generar, validar imports contra los disponibles:
```python
AVAILABLE_IMPORTS = [
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
]
# Remover imports no disponibles del código generado
```

**Fix 2 — Prompt del Creator más estricto**:
Añadir al system prompt del Creator:
```
REGLA CRÍTICA: SOLO importa de estos paths disponibles:
- @/lib/library/components/LetterReveal
- @/lib/library/components/ConnectedParticles
- @/lib/library/components/GoldenDust
- @/lib/library/components/MouseGlow
- @/lib/library/components/Preloader
NO uses framer-motion. NO uses @/lib/library/shaders/*. Usa solo React + CSS.
Si el brief dice 'sin WebGL', NO uses ShaderBackground ni Text3DCinematic.
```

**Fix 3 — Respetar restricciones del brief**:
Si el brief dice "sin WebGL", el Creator NO debe incluir:
- ShaderBackground
- Text3DCinematic
- cualquier componente con WebGL/canvas WebGL
- imports de shaders .glsl

**Trampa**: El Creator v2 por defecto incluye todas las skills que conoce.
Hay que decirle explícitamente qué excluir según el brief.

### 5.17 Generar layouts repetidos (falta de diversidad estructural)
El Creator v2 tiende a generar siempre el mismo layout: título centrado +
subtítulo + deco-line + quote + CTAs + HUD en esquinas. Esto produce heroes
visualmente similares a pesar de briefs distintos.

**Síntoma**: todos los heroes generados se ven como variaciones del mismo
template (centrado vertical, contenido al medio, HUD esquinas).

**Fix**: el Creator debe elegir un layout distinto cada vez. 8 layouts
disponibles:
- A: Centrado (default, evitar si el último lo usó)
- B: Split izquierda/derecha (título + contenido izq, visual der)
- C: Grid asimétrico (título top-left, contenido bottom-right)
- D: Full-bleed visual (visual llena todo, texto overlay con backdrop-blur)
- E: Scroll horizontal (contenido revela horizontalmente)
- F: Split diagonal (divider diagonal entre visual y contenido)
- G: Minimalist corner (contenido pequeño en una esquina, mucho negativo)
- H: Tipográfico full (tipografía llena 80%, otros elementos mínimos)

**Reglas adicionales**:
- Variar CTA: centrado / dos lado a lado / bottom-right / inline / como scroll indicator
- Variar HUD: terminal-style / editorial / minimalist / ninguno
- Consultar heroes anteriores en memoria para no repetir layout

**Trampa**: Si se elige layout aleatorio sin considerar el brief, puede
quedar desbalanceado. El layout debe servir al brief (ej: "minimalista"
→ layout G o H; "inmersivo" → layout D o E).

### 5.18 Preloader sin timer (hero se queda en carga)
Si el hero usa un `useState(false)` para `loaded` y muestra un preloader
div cuando `!loaded`, PERO nunca llama a `setLoaded(true)`, el hero se
queda pegado en el preloader para siempre.

**Síntoma**: el usuario ve solo "CRONOS" (o el brand text) centrado en
pantalla, el resto del hero nunca aparece. `document.body.children.length`
es bajo, `main.innerHTML.length` es ~250 chars (solo el preloader div).

**Causa**: cuando se usa un preloader custom (div simple) en vez del
componente `Preloader` del registry (que tiene `onComplete` callback), es
fácil olvidar el `setTimeout` que dispara `setLoaded(true)`.

**Fix**: SIEMPRE añadir un timer en un `useEffect` separado:
```jsx
const [loaded, setLoaded] = useState(false);

// Preloader timer — simular carga de 1.8s
useEffect(() => {
  if (loaded) return;
  const t = setTimeout(() => setLoaded(true), 1800);
  return () => clearTimeout(t);
}, [loaded]);
```

**Trampa**: Si el timer está dentro del mismo useEffect que depende de
`loaded`, puede no dispararse correctamente. Usar un useEffect separado
que solo dependa de `[loaded]`. Si se usa el componente `Preloader` del
registry, su `onComplete` callback maneja esto automáticamente.

### 5.19 lazy() con componente definido después (undefined)
`const Component = lazy(() => Promise.resolve({ default: OtherComponent }))`
Si `OtherComponent` se define DESPUÉS del lazy statement, es `undefined`
en el momento del import. El componente se monta vacío sin error.

**Síntoma**: el Canvas existe pero no muestra nada. `main.innerHTML.length`
es bajo. No hay errores en consola.

**Fix**: NO usar lazy con componentes del mismo archivo. Usar import directo.
Si se necesita lazy, mover el componente a un archivo separado.

### 5.20 EffectComposer causa parpadeo negro inestable (CRÍTICO)
`@react-three/postprocessing` `EffectComposer` con múltiples passes
(Bloom + CA + Noise + Vignette) causa parpadeo negro intermitente en
navegador real. El WebGL context se pierde/resetea bajo carga.

**Síntoma**: la escena aparece y desaparece, destellos negros. NO se
detecta en Playwright headless (single-frame) — solo en navegador real.

**Fix**: eliminar EffectComposer y reemplazar con:
1. HDR + Reinhard tonemap en fragment shader: `color / (color + 1.0)` (emula bloom)
2. CSS radial-gradient overlay (emula vignette, 100% estable)
3. CSS SVG noise overlay (emula grain, 100% estable)

**Trampa**: si se necesita bloom real, usar SOLO Bloom (sin otros passes)
y testear estabilidad en navegador real. El parpadeo no se detecta en
testing automatizado — requiere testeo manual.

### 5.21 Mesh sin rotación visible (shader noise no se percibe)
El `useFrame` actualiza `uTime` que alimenta el shader noise, pero si
el mesh no rota, el noise es demasiado sutil para percibirse como
movimiento. La escena parece estática.

**Fix**: siempre añadir rotación al mesh en useFrame:
```js
useFrame((state, delta) => {
  uniforms.current.uTime.value = state.clock.elapsedTime;
  if (meshRef.current) {
    meshRef.current.rotation.y += delta * 0.3;
    meshRef.current.rotation.x += delta * 0.1;
  }
});
```

**Trampa**: rotación > 0.5 rad/s se siente frenética. 0.1-0.3 es el
sweet spot para rotación orgánica contemplativa.

---

## Cómo usar este catálogo

Antes de empezar un hero:
1. Lee las 5 secciones rápido (10 min).
2. Identifica 1-2 patrones de cada sección que apliquen a tu caso.
3. Combínalos en un moodboard mental o físico.
4. Recién ahí empieza a diseñar el stub visual.

No copies un patrón entero. Toma la estructura y reinterpreta con la identidad
del proyecto.
