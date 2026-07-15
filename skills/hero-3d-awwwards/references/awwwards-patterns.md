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

### 1.5 Negativo activo (whitespace como elemento)
- **Qué**: 60%+ del hero es espacio vacío. El contenido flota. Comunica lujo.
- **Stack**: Cualquiera.
- **Ejemplos**: Brand sites de lujo, agencias boutique.

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

---

## Cómo usar este catálogo

Antes de empezar un hero:
1. Lee las 5 secciones rápido (10 min).
2. Identifica 1-2 patrones de cada sección que apliquen a tu caso.
3. Combínalos en un moodboard mental o físico.
4. Recién ahí empieza a diseñar el stub visual.

No copies un patrón entero. Toma la estructura y reinterpreta con la identidad
del proyecto.
