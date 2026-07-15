# CSS 3D + GSAP Stack Guide

> Stack liviano para heroes 2.5D sin WebGL. SEO-friendly, indexable, 60fps
> fácil en móvil. Para parallax por capas, tipografía animada, y heroes donde
> WebGL sería overkill.

## Tabla de contenidos
1. Setup completo
2. Estructura de archivos
3. CSS 3D fundamentals
4. GSAP ScrollTrigger patterns
5. Mouse parallax sin librerías pesadas
6. Lenis smooth scroll integration
7. Cuando migrar a WebGL

---

## 1. Setup completo

Ejecuta `bash scripts/setup-css3d.sh`. Instala:

```json
{
  "dependencies": {
    "gsap": "^3.12.5",
    "lenis": "^1.1.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0"
  }
}
```

**Por qué tan poco**: CSS 3D + GSAP = ~60KB minified. Para heroes 2.5D no
necesitas más.

---

## 2. Estructura de archivos recomendada

```
src/
├── main.ts                    # Entry, init GSAP + Lenis
├── hero/
│   ├── Hero.ts                # Class del hero
│   ├── ParallaxLayers.ts      # Capas 2.5D
│   └── HeroText.ts            # Tipografía animada
├── utils/
│   ├── mouseTracker.ts
│   └── reducedMotion.ts
└── styles/
    ├── main.css
    └── hero.css               # Transform-style: preserve-3d
public/
└── layers/                    # PNGs por capa
    ├── bg.png
    ├── mid.png
    ├── subject.png
    └── fg.png
```

---

## 3. CSS 3D fundamentals

### Container con perspective

```css
.hero-scene {
  position: relative;
  height: 100vh;
  perspective: 1000px;
  perspective-origin: 50% 50%;
  overflow: hidden;
}

.hero-layers {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
```

**Por qué `perspective: 1000px`**: Es el sweet spot. <500px = distorsión
extrema (fisheye). >2000px = sin profundidad perceptible.

### Capas con translateZ

```css
.layer {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  will-change: transform;
}

.layer-bg      { transform: translateZ(-300px) scale(1.3); }
.layer-mid     { transform: translateZ(-100px) scale(1.1); }
.layer-subject { transform: translateZ(0); }
.layer-fg      { transform: translateZ(100px) scale(0.9); }
```

**Por qué scale**: Cuando haces translateZ negativo, el elemento se ve más
pequeño. Hay que compensar con scale up para que llene el viewport. Fórmula:
`scale = 1 + |Z| / perspective`. Para Z=-300 y perspective=1000: scale=1.3.

### will-change

```css
.layer {
  will-change: transform;
}
```

**Cuándo usarlo**: Solo en elementos que van a animar. Dejarlo en todos los
elementos causa memory pressure. Quítalo cuando la animación termine si es
one-shot.

---

## 4. GSAP ScrollTrigger patterns

### Setup básico

```typescript
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
```

### Parallax por scroll (una capa)

```typescript
gsap.to('.layer-bg', {
  yPercent: 30,           // Se mueve 30% de su altura al hacer scroll
  ease: 'none',
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,              // Smooth, no instantáneo
  },
})

gsap.to('.layer-fg', {
  yPercent: -20,           // Opuesto al bg, genera profundidad
  ease: 'none',
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
  },
})
```

### Stagger de entrada de tipografía

```typescript
// Split text en palabras (sin SplitText de pago)
const splitWords = (el: HTMLElement) => {
  const text = el.textContent || ''
  el.innerHTML = text
    .split(' ')
    .map((word) => `<span class="word"><span class="word-inner">${word}</span></span>`)
    .join(' ')
  return el.querySelectorAll('.word-inner')
}

const words = splitWords(document.querySelector('.hero-title')!)

gsap.from(words, {
  yPercent: 120,
  opacity: 0,
  duration: 1.2,
  ease: 'power4.out',
  stagger: 0.08,
  delay: 0.3,
})
```

### CSS para overflow hidden por palabra

```css
.word {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
}

.word-inner {
  display: inline-block;
  will-change: transform;
}
```

**Por qué overflow hidden**: Las palabras "montan" desde abajo sin que se vean
antes de tiempo. Comunican intención cinematográfica.

### Camera dolly fake con scale

```typescript
gsap.to('.hero-layers', {
  scale: 1.15,
  z: 100,
  ease: 'none',
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1.5,
  },
})
```

---

## 5. Mouse parallax sin librerías pesadas

```typescript
class MouseParallax {
  private target = { x: 0, y: 0 }
  private current = { x: 0, y: 0 }
  private layers: HTMLElement[]

  constructor(layers: HTMLElement[]) {
    this.layers = layers
    window.addEventListener('mousemove', this.onMouseMove)
    this.tick()
  }

  private onMouseMove = (e: MouseEvent) => {
    this.target.x = (e.clientX / window.innerWidth - 0.5) * 2
    this.target.y = (e.clientY / window.innerHeight - 0.5) * 2
  }

  private tick = () => {
    // Lerp para suavizar
    this.current.x += (this.target.x - this.current.x) * 0.08
    this.current.y += (this.target.y - this.current.y) * 0.08

    this.layers.forEach((layer, i) => {
      const depth = parseFloat(layer.dataset.depth || '0')
      const x = this.current.x * depth * 30
      const y = this.current.y * depth * 30
      layer.style.transform = `translate3d(${x}px, ${y}px, ${layer.dataset.z || 0}px)`
    })

    requestAnimationFrame(this.tick)
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove)
  }
}
```

```html
<div class="hero-layers">
  <div class="layer layer-bg" data-depth="0.2" data-z="-300"></div>
  <div class="layer layer-subject" data-depth="0.5" data-z="0"></div>
  <div class="layer layer-fg" data-depth="1.0" data-z="100"></div>
</div>
```

---

## 6. Lenis smooth scroll integration

Lenis es la alternativa moderna a Locomotive Scroll. Más liviano, mejor
mantenido.

```typescript
import Lenis from 'lenis'

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,        // Mobile usa native scroll
})

function raf(time: number) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

// Conectar con ScrollTrigger
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
```

**Por qué smoothTouch: false**: El smooth scroll en touch se siente raro y
rompe la "inercia natural" del dedo. En mobile, native scroll es mejor.

---

## 7. Cuándo migrar a WebGL

CSS 3D es perfecto hasta cierto punto. Migra a R3F o Three.js cuando necesites:

- ✅ Modelos 3D reales (GLB)
- ✅ Shaders custom (noise, fluid, distortion)
- ✅ Partículas (más de 50)
- ✅ Post-processing (bloom, chromatic aberration)
- ✅ Iluminación realista (sombras, IBL)
- ✅ Camera orbit en 3D real (no fake con scale)

Si solo necesitas parallax + tipografía animada + scroll-driven, CSS 3D es
suficiente y carga 10x más rápido.

---

## Patrones Awwwards que SÍ puedes lograr con CSS 3D

- Parallax 2.5D por capas (Arquetipo 1)
- Tipografía stagger de entrada
- Texto outline → fill on scroll
- Magnetic buttons
- Cursor morfólogo
- Camera dolly fake (scale + opacity)
- Hover reveals depth (rotateX/Y)
- Scroll progress indicator
- Letterbox cinematográfico

No subestimes CSS 3D — muchos SOTDs usan solo esto. La clave está en el timing
y la dirección artística, no en la tecnología.
