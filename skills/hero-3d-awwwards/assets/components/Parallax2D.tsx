'use client'

/**
 * Parallax2D.tsx
 * Capas 2.5D con mouse + scroll parallax. Arquetipo 1.
 *
 * Disponible en 2 variantes:
 *   - <Parallax2DR3F>   — usa R3F (WebGL), para máxima calidad
 *   - <Parallax2DCSS>   — usa CSS 3D transforms, más liviano
 *
 * Elige Parallax2DCSS si:
 *   - SEO es crítico (el contenido se indexa)
 *   - El hero solo tiene 3-5 capas sin WebGL complejo
 *   - Quieres carga <50KB
 *
 * Elige Parallax2DR3F si:
 *   - Ya estás usando R3F para otras cosas
 *   - Necesitas shaders extra (displacement, blur direccional)
 *   - Quieres 60fps garantizado en todos los dispositivos
 */

import { useEffect, useRef, ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ============================================================
// VARIANT CSS (recomendada por defecto)
// ============================================================
interface ParallaxLayer {
  src: string
  depth: number         // 0 = fijo, 1 = cerca, -1 = lejos
  z?: number            // translateZ en px (default = depth * 100)
  scale?: number        // override del scale automático
  className?: string
  style?: React.CSSProperties
}

interface Parallax2DCSSProps {
  layers: ParallaxLayer[]
  perspective?: number  // default 1000px
  mouseLerp?: number    // default 0.08
  scrollLerp?: number   // default 1 (ScrollTrigger scrub)
  className?: string
  children?: ReactNode
}

export function Parallax2DCSS({
  layers,
  perspective = 1000,
  mouseLerp = 0.08,
  scrollLerp = 1,
  className,
  children,
}: Parallax2DCSSProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<HTMLDivElement[]>([])
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseCurrent = useRef({ x: 0, y: 0 })
  const scrollProgress = useRef(0)

  // Mouse parallax loop
  useEffect(() => {
    let raf: number

    const onMouseMove = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseTarget.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }

    const tick = () => {
      mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * mouseLerp
      mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * mouseLerp

      layersRef.current.forEach((el, i) => {
        if (!el) return
        const depth = layers[i].depth
        const z = layers[i].z ?? depth * 100
        const x = mouseCurrent.current.x * depth * 25
        const y = mouseCurrent.current.y * depth * 25 + scrollProgress.current * depth * -50
        el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`
      })

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMouseMove)
    tick()

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(raf)
    }
  }, [layers, mouseLerp])

  // ScrollTrigger (controla scrollProgress.current)
  useEffect(() => {
    if (!containerRef.current) return

    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: scrollLerp,
      onUpdate: (self) => {
        scrollProgress.current = self.progress
      },
    })

    return () => st.kill()
  }, [scrollLerp])

  return (
    <div
      ref={containerRef}
      className={`parallax-2d ${className || ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        perspective: `${perspective}px`,
        perspectiveOrigin: '50% 50%',
        overflow: 'hidden',
      }}
    >
      <div
        className="parallax-layers"
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
        }}
      >
        {layers.map((layer, i) => {
          const scale = layer.scale ?? 1 + Math.abs(layer.z ?? layer.depth * 100) / perspective
          return (
            <div
              key={i}
              ref={(el) => {
                if (el) layersRef.current[i] = el
              }}
              className={`parallax-layer ${layer.className || ''}`}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${layer.src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                willChange: 'transform',
                transform: `translateZ(${layer.z ?? layer.depth * 100}px) scale(${scale})`,
                ...layer.style,
              }}
            />
          )
        })}
        {children}
      </div>
    </div>
  )
}

// ============================================================
// VARIANT R3F (WebGL, mayor calidad)
// ============================================================
// Para uso cuando ya tienes <Canvas> R3F. Importa dentro de tu escena:
//
// import { Parallax2DR3F } from './Parallax2D'
//
// <Canvas>
//   <Parallax2DR3F
//     layers={[
//       { src: '/layers/bg.webp', depth: -0.8 },
//       { src: '/layers/subject.webp', depth: 0 },
//       { src: '/layers/fg.webp', depth: 0.6 },
//     ]}
//   />
// </Canvas>

import { useLoader, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface Parallax2DR3FProps {
  layers: ParallaxLayer[]
  mouseLerp?: number
  scrollTrigger?: React.RefObject<HTMLElement>
}

export function Parallax2DR3F({
  layers,
  mouseLerp = 0.08,
  scrollTrigger,
}: Parallax2DR3FProps) {
  const { viewport } = useThree()
  const textures = useLoader(THREE.TextureLoader, layers.map((l) => l.src))
  const meshesRef = useRef<THREE.Mesh[]>([])
  const mouseTarget = useRef(new THREE.Vector2(0, 0))
  const mouseCurrent = useRef(new THREE.Vector2(0, 0))
  const scrollProgress = useRef(0)

  useEffect(() => {
    if (!scrollTrigger?.current) return
    const st = ScrollTrigger.create({
      trigger: scrollTrigger.current,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => { scrollProgress.current = self.progress },
    })
    return () => st.kill()
  }, [scrollTrigger])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseTarget.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  useFrame(() => {
    mouseCurrent.current.lerp(mouseTarget.current, mouseLerp)

    meshesRef.current.forEach((mesh, i) => {
      if (!mesh) return
      const depth = layers[i].depth
      const z = depth * 2
      const x = mouseCurrent.current.x * depth * 0.5
      const y = mouseCurrent.current.y * depth * 0.3 + scrollProgress.current * depth * 1
      mesh.position.set(x, y, z)
    })
  })

  return (
    <group>
      {layers.map((layer, i) => {
        const scaleCompensation = 1 + Math.abs(layer.depth) * 0.3
        return (
          <mesh
            key={i}
            ref={(el) => {
              if (el) meshesRef.current[i] = el
            }}
            scale={[viewport.width * scaleCompensation, viewport.height * scaleCompensation, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={textures[i]}
              transparent
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// ============================================================
// EJEMPLO DE USO
// ============================================================
/*
import { Parallax2DCSS } from '@/components/hero/Parallax2D'

export function Hero() {
  return (
    <section style={{ height: '100vh', position: 'relative' }}>
      <Parallax2DCSS
        perspective={1200}
        layers={[
          { src: '/layers/sky.webp',  depth: -1.2, z: -400 },  // Cielo lejano
          { src: '/layers/mountain.webp', depth: -0.6, z: -200 }, // Montañas
          { src: '/layers/subject.webp', depth: 0,    z: 0 },   // Sujeto principal
          { src: '/layers/foreground.webp', depth: 0.8, z: 150 }, // Frente
        ]}
      >
        <div className="hero-overlay">
          <h1>Brand Name</h1>
          <p>Tagline</p>
        </div>
      </Parallax2DCSS>
    </section>
  )
}
*/

// ============================================================
// TIPS
// ============================================================
// - Para PNGs con transparencia, exporta con fondo transparente y comprime a WebP.
// - Limpia halos: en Photoshop, elimina 1px de borde anti-aliased antes de exportar.
// - 3-5 capas es el sweet spot. Más de 8 = judder en Safari.
// - Delta Z (diferencia entre la capa más cercana y la más lejana) < 600px.
// - Si quieres partículas extra (polvo, nieve), añade una capa CSS con CSS animations.
