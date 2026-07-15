# R3F + GSAP Stack Guide

> Stack dominante en Awwwards para heroes 3D en React/Next.js. Declarativo,
> ecosistema maduro, integración limpia con Next.js App Router.

## Tabla de contenidos
1. Setup completo
2. Estructura de archivos recomendada
3. Patrones declarativos esenciales
4. Integración con Next.js App Router
5. Loader y Suspense
6. Hooks custom frecuentes
7. Performance patterns específicos R3F

---

## 1. Setup completo

Ejecuta `bash scripts/setup-r3f.sh` desde el directorio del proyecto. El script
instala versiones pinneadas:

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.92.0",
    "@react-three/postprocessing": "^2.16.0",
    "gsap": "^3.12.5",
    "@gsap/react": "^2.1.0",
    "lenis": "^1.1.0",
    "troika-three-text": "^0.49.0"
  }
}
```

**Por qué versiones pinneadas**: R3F 8 + drei 9 + three 0.160 es la combo más
estable probada en producción 2024. R3F 9 (alpha) rompe APIs.

---

## 2. Estructura de archivos recomendada

```
app/
├── page.tsx                    # Hero entry, client component
├── layout.tsx                  # Root layout, Lenis provider
components/
├── hero/
│   ├── Hero3DScene.tsx         # <Canvas> + escena
│   ├── Hero3DModel.tsx         # GLB + luces (si Arquetipo 2)
│   ├── HeroShader.tsx          # Shader plane (si Arquetipo 3)
│   ├── HeroOverlay.tsx         # Headline + CTA encima del canvas
│   └── HeroLoader.tsx          # Loading screen custom
├── providers/
│   └── LenisProvider.tsx       # Smooth scroll global
lib/
├── shaders/
│   ├── noise.frag
│   ├── distortion.vert
│   └── postprocessing.frag
└── hooks/
    ├── useMousePosition.ts     # Mouse normalizado -1..1
    └── useScrollProgress.ts    # 0..1 del scroll del hero
public/
└── models/
    └── hero.glb                # GLB comprimido con Draco
```

---

## 3. Patrones declarativos esenciales

### Canvas mínimo con performance budget

```tsx
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei'

export function Hero3DScene({ children }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}                    // NUNCA más de 2
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      frameloop="always"              // o "demand" si no anima solo
    >
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
      <AdaptiveDpr pixelated />        // Baja dpr cuando baja fps
      <AdaptiveEvents />              // Desactiva raycast cuando baja fps
    </Canvas>
  )
}
```

### Cargar GLB con Suspense y preload

```tsx
import { useGLTF } from '@react-three/drei'
import { useProgress } from '@react-three/drei'

function HeroModel() {
  const { scene } = useGLTF('/models/hero.glb')
  return <primitive object={scene} scale={1} />
}

// En layout.tsx o page.tsx:
useGLTF.preload('/models/hero.glb')   // Empieza a cargar al montar el route
```

### Hook de mouse normalizado

```tsx
// lib/hooks/useMousePosition.ts
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export function useMousePosition() {
  const mouse = useRef(new THREE.Vector2(0, 0))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return mouse
}
```

### Integración GSAP ScrollTrigger con useFrame

```tsx
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function CameraDolly() {
  const { camera } = useThree()
  const scrollProgress = useRef(0)

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => { scrollProgress.current = self.progress },
    })
    return () => st.kill()
  }, [])

  useFrame(() => {
    // Lerp camera Z based on scroll
    const targetZ = 5 - scrollProgress.current * 3
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1)
  })

  return null
}
```

### Luces de 3 puntos + ContactShadows

```tsx
import { Environment, ContactShadows, Float } from '@react-three/drei'

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#ff0040" />
      <Environment preset="studio" />           {/* IBL */}
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.5}
        scale={20}
        blur={2.5}
        far={4}
      />
    </>
  )
}
```

### Postprocessing cinemático

```tsx
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

function CinematicEffects() {
  return (
    <EffectComposer disableNormalPass>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0005, 0.0005)}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
    </EffectComposer>
  )
}
```

---

## 4. Integración con Next.js App Router

El `<Canvas>` R3F debe estar en un Client Component. Marca el archivo con
`'use client'` en la primera línea. Next.js 14 App Router soporta esto
nativamente.

```tsx
// app/page.tsx
'use client'

import { Hero3DScene } from '@/components/hero/Hero3DScene'
import { HeroOverlay } from '@/components/hero/HeroOverlay'

export default function HomePage() {
  return (
    <main>
      <section id="hero" className="relative h-screen">
        <Hero3DScene>
          {/* Modelos, shaders, luces aquí */}
        </Hero3DScene>
        <HeroOverlay />   {/* Headline + CTA encima, absoluta posicionada */}
      </section>
    </main>
  )
}
```

**Para SSR-safe**: Wrap Canvas con `dynamic(() => import('...'), { ssr: false })`
si tienes issues de hydration.

---

## 5. Loader y Suspense

Loading screen **custom** — nunca uses `<Html center>` con un spinner.

```tsx
// components/hero/HeroLoader.tsx
import { useProgress, Html } from '@react-three/drei'

export function HeroLoader() {
  const { progress, active } = useProgress()

  return (
    <Html center>
      <div className="loader">
        <div className="loader-bar" style={{ width: `${progress}%` }} />
        <span className="loader-text">{Math.round(progress)}%</span>
      </div>
    </Html>
  )
}
```

Para loaders más cinemáticos, animation controlada por GSAP timeline que monta
el hero cuando `active === false`.

---

## 6. Hooks custom frecuentes

### useScrollProgress (0..1 de un elemento)

```tsx
export function useScrollProgress(ref: React.RefObject<HTMLElement>) {
  const progress = useRef(0)

  useEffect(() => {
    const update = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const viewport = window.innerHeight
      progress.current = Math.max(0, Math.min(1, 1 - rect.bottom / (viewport + rect.height)))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [ref])

  return progress
}
```

### useReducedMotion

```tsx
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}
```

Si `reduced === true`, el hero debe renderizar estático sin animación.

---

## 7. Performance patterns específicos R3F

### Pause render loop offscreen

```tsx
function useInViewPause(canvasRef) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (canvasRef.current) {
          canvasRef.current.frameloop = entry.isIntersecting ? 'always' : 'never'
        }
      },
      { threshold: 0 }
    )
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [canvasRef])
}
```

### Instancing para partículas

```tsx
import { Instances, Instance } from '@react-three/drei'

function Particles({ count = 200 }) {
  return (
    <Instances limit={count}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshStandardMaterial color="#fff" />
      {Array.from({ length: count }).map((_, i) => (
        <Instance
          key={i}
          position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 5,
          ]}
        />
      ))}
    </Instances>
  )
}
```

### LOD para modelos grandes

```tsx
import { Detailed } from '@react-three/drei'

function HeroModelLOD() {
  const high = useGLTF('/models/hero-high.glb')
  const mid = useGLTF('/models/hero-mid.glb')
  const low = useGLTF('/models/hero-low.glb')

  return (
    <Detailed distances={[0, 5, 15]}>
      <primitive object={high.scene} />
      <primitive object={mid.scene} />
      <primitive object={low.scene} />
    </Detailed>
  )
}
```

---

## Cuándo NO usar R3F

- Proyecto sin React (obvio, pero hay quien pregunta)
- Bundle size crítico (<50KB total) → CSS 3D
- Hero estático sin interacción → CSS plano
- WebGL no disponible → CSS fallback

Para esos casos, rutea a `css-3d-gsap.md` o `threejs-vanilla.md`.
