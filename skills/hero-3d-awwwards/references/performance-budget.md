# Performance Budget

> Targets y optimizaciones para mantener Balance wow+fps. Si el hero no pasa
> estos checks, no es nivel Awwwards.

## Tabla de contenidos
1. Targets cuantitativos
2. Optimizaciones por orden de impacto
3. Mobile-specific rules
4. Diagnóstico con Chrome DevTools
5. Web Vitals específicos para heroes

---

## 1. Targets cuantitativos

### Core Web Vitals
| Métrica | Target | Cómo medir |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.0s | Lighthouse, Performance observer |
| FID (First Input Delay) | < 100ms | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| FCP (First Contentful Paint) | < 1.5s | Lighthouse |
| TTI (Time to Interactive) | < 3.0s | Lighthouse |

### Runtime
| Métrica | Target | Cómo medir |
|---|---|---|
| FPS scroll | 60fps sostenido | Chrome Performance tab |
| FPS idle | 60fps (sin drops) | Chrome Performance tab |
| GPU usage | < 70% en MacBook Air M1 | Chrome Task Manager |
| JS heap | < 50MB después de GC | Chrome Memory tab |
| Bundle JS | < 200KB gzip | `vite build` + bundle analyzer |
| Bundle CSS | < 30KB gzip | `vite build` |
| Imágenes | < 500KB total hero | Network tab |

### Mobile (iPhone SE, Android mid-tier)
| Métrica | Target |
|---|---|
| FPS | 60fps sostenido (o 30fps si CSS fallback) |
| LCP | < 2.5s |
| TTI | < 4s |
| JS parse | < 1s |

---

## 2. Optimizaciones por orden de impacto

Aplica en orden. Las primeras dan más ganancia por minuto invertido.

### Tier 1: High impact, low effort

#### 2.1 Clamp pixel ratio
```tsx
<Canvas dpr={[1, 2]}>
```
**Por qué**: iPhone Pro Max tiene devicePixelRatio 3. Renderiza 9x más píxeles
que dpr=1. Visualmente imperceptible vs dpr=2, pero +200% GPU.

#### 2.2 Comprimir GLB con Draco
```bash
npx gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --simplify --simplify-ratio 0.5 \
  --weld
```
**Por qué**: Un GLB de 8MB típico baja a 800KB-1.5MB sin pérdida visual
percibida.

#### 2.3 WebP en vez de PNG/JPG
```bash
cwebp input.png -q 80 -o output.webp
```
**Por qué**: 30-50% más chico que PNG, soporta transparencia, soportado en todos
los browsers modernos.

#### 2.4 Lazy-load con Suspense + preload
```tsx
useGLTF.preload('/models/hero.glb')  // Empieza a cargar al montar el route
```

#### 2.5 `will-change` en CSS 3D
```css
.layer { will-change: transform; }
```

---

### Tier 2: Medium impact

#### 2.6 LOD para modelos grandes
```tsx
<Detailed distances={[0, 5, 15]}>
  <primitive object={high.scene} />
  <primitive object={mid.scene} />
  <primitive object={low.scene} />
</Detailed>
```

#### 2.7 Instancing para partículas
```tsx
<Instances limit={500}>
  <sphereGeometry args={[0.02]} />
  <meshStandardMaterial />
  {particles.map(p => <Instance position={p} />)}
</Instances>
```
**Por qué**: 1 draw call en vez de 500. Game-changer para partículas.

#### 2.8 Pause render offscreen
```tsx
const { invalidate } = useThree()
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) {
      // Pause render loop
    } else {
      invalidate()
    }
  })
  observer.observe(canvasRef.current)
  return () => observer.disconnect()
}, [])
```

#### 2.9 AdaptiveDpr + AdaptiveEvents (R3F)
```tsx
<AdaptiveDpr pixelated />
<AdaptiveEvents />
```
**Por qué**: Baja dpr automáticamente cuando FPS baja. Desactiva raycasting
cuando FPS es bajo. Transparente al usuario.

#### 2.10 Frame loop demand
```tsx
<Canvas frameloop="demand">
```
**Por qué**: Si la escena no anima por sí sola (solo reacciona a scroll/mouse),
esto renderiza solo cuando hay cambios. Cero GPU idle.

---

### Tier 3: Lower impact, still worth it

#### 2.11 Tree-shake drei
```tsx
// ✅ Bien
import { OrbitControls } from '@react-three/drei'
// ❌ Mal
import * as Drei from '@react-three/drei'
```

#### 2.12 Texture compression con Basis Universal
```bash
npx gltf-transform etc1s input.glb output.glb
```
**Por qué**: Basis se transcodifica al formato nativo del GPU (ETC1S, BC7, ASTC).
3-5x más chico en GPU memory.

#### 2.13 Reduce shader subdivisions
```tsx
// Para shader plane
new THREE.PlaneGeometry(8, 5, 128, 128)  // No 256x256 si no es necesario
```
**Por qué**: Cada subdivisión = 2 triángulos. 256x256 = 130k triángulos. 128x128
= 32k. Diferencia visual nula para noise shaders, 4x menos GPU.

#### 2.14 Tone mapping en fragment shader
En vez de postprocessing EffectComposer (que es un render extra), aplica tonemap
dentro del shader final:
```glsl
gl_FragColor.rgb = ACESFilmic(gl_FragColor.rgb);
```

#### 2.15 Half-float en simulaciones
```tsx
new THREE.WebGLRenderTarget(width, height, {
  type: THREE.HalfFloatType,  // No FloatType
})
```
**Por qué**: Half-float = 16 bits, Full-float = 32. Half es suficiente para
fluid sims.

---

## 3. Mobile-specific rules

### Detect low-end devices
```typescript
function isLowEndDevice(): boolean {
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as any).deviceMemory || 4
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  return isMobile && (cores < 4 || memory < 4)
}

if (isLowEndDevice()) {
  // Renderizar versión CSS fallback
  // O reducir dpr a 1
  // O desactivar postprocessing
}
```

### Touch events vs mouse
```typescript
const hasFinePointer = window.matchMedia('(pointer: fine)').matches
if (hasFinePointer) {
  // Solo activar mouse parallax en desktop
}
```

### Smooth scroll: off en touch
```typescript
const lenis = new Lenis({
  smoothWheel: true,
  smoothTouch: false,  // Mobile = native scroll
})
```

### Reduced motion: SIEMPRE respetar
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReducedMotion) {
  // Renderizar hero estático, sin animación
}
```

---

## 4. Diagnóstico con Chrome DevTools

### Performance tab — buscar:
- **Long tasks** > 50ms: bloquean main thread, causan jank
- **GPU usage**: si está al 100% sostenido, optimizar shaders
- **Layer tree**: si hay > 20 layers en CSS 3D, fusionar

### Rendering tab — activar:
- **FPS meter**: verde constante = 60fps
- **Layer borders**: ver cuántas layers estás creando
- **Paint flashing**: ver qué áreas se repintan

### Lighthouse:
- Performance > 85 (objetivo Awwwards)
- Accessibility > 90 (SOTD lo exige)
- Best Practices = 100

### WebGPU tab (experimental):
- Si WebGL2 falla, hay WebGPU fallback en Chrome 113+

---

## 5. Web Vitals específicos para heroes

### LCP optimization checklist
- [ ] Imagen/video del hero preloaded con `<link rel="preload">`
- [ ] GLB preload en `<head>` con `<link rel="preload" as="fetch">`
- [ ] Critical CSS inline en `<head>`
- [ ] Fonts con `font-display: swap` o `optional`
- [ ] Imágenes servidas con `loading="eager"` solo para hero

### CLS prevention
- [ ] Hero container con `min-height: 100vh` siempre
- [ ] Aspect ratio en imágenes: `aspect-ratio: 16/9`
- [ ] No inyectar contenido encima del hero después de load
- [ ] Fuentes: usa `size-adjust` en `@font-face`

### FID/INP optimization
- [ ] Break up long tasks con `setTimeout(0)` o `scheduler.yield()`
- [ ] GSAP timeline con `onComplete` en vez de loops
- [ ] Evitar `setInterval` para animación — siempre `requestAnimationFrame`
- [ ] Web Workers para cálculos pesados (raro en heroes, pero útil)

---

## Cuando los targets no se cumplen

Si después de Tier 1+2 sigues sin pasar:

1. **Reduce ambition**: Si tienes 3 shaders, mata 2. Si tienes 5 capas, usa 3.
2. **Mobile fallback**: Sirve CSS 3D en mobile, R3F en desktop.
3. **Static poster**: Primera paint es una imagen estática; la animación carga
   después con fade-in.
4. **Pre-render**: Si el hero es el mismo siempre, pre-renderiza con `next export`
   y sirve HTML estático + canvas overlay.

NO sacrifiques performance por más "wow". Awwwards descalifica sitios lentos.
