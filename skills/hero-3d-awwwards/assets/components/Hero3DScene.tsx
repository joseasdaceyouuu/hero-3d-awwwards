'use client'

/**
 * Hero3DScene.tsx
 * Escena 3D base para heroes Awwwards (Arquetipo 2: 3D Scene con GLB).
 *
 * Incluye:
 *   - Canvas R3F con performance budget (dpr clamp, ACES tone mapping)
 *   - Cámara con fov 45° (cinematográfico)
 *   - Luces de 3 puntos + Environment IBL
 *   - ContactShadows suaves
 *   - AdaptiveDpr + AdaptiveEvents para auto-optimización
 *   - Post-processing cinemático (Bloom, ChromaticAberration, Vignette)
 *   - Pause render loop offscreen
 *   - Fallback para reduced-motion
 *
 * USO:
 *   <Hero3DScene modelUrl="/models/hero.glb">
 *     <HeroOverlay title="Brand" />
 *   </Hero3DScene>
 *
 * ANTES DE USAR:
 *   - Lee references/r3f-gsap.md para setup del proyecto
 *   - Ejecuta scripts/setup-r3f.sh para instalar deps
 *   - Comprime tu GLB con Draco (ver r3f-gsap.md sección 4)
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Environment,
  ContactShadows,
  AdaptiveDpr,
  AdaptiveEvents,
  Preload,
  useGLTF,
  Float,
  OrbitControls,
} from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Suspense, useEffect, useRef, useState, ReactNode } from 'react'
import * as THREE from 'three'

// ============================================================
// PROPS
// ============================================================
interface Hero3DSceneProps {
  modelUrl?: string
  children?: ReactNode
  cameraPosition?: [number, number, number]
  cameraFov?: number
  enableControls?: boolean
  enablePostprocessing?: boolean
  enableFloat?: boolean
  environmentPreset?:
    | 'studio' | 'sunset' | 'dawn' | 'night' | 'warehouse'
    | 'city' | 'park' | 'forest'
  bloomStrength?: number
  chromaticAmount?: number
  grainAmount?: number
  vignetteDarkness?: number
  className?: string
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function Hero3DScene({
  modelUrl,
  children,
  cameraPosition = [0, 0, 5],
  cameraFov = 45,
  enableControls = false,
  enablePostprocessing = true,
  enableFloat = true,
  environmentPreset = 'studio',
  bloomStrength = 0.6,
  chromaticAmount = 0.0008,
  grainAmount = 0.015,
  vignetteDarkness = 0.4,
  className,
}: Hero3DSceneProps) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [webglAvailable, setWebglAvailable] = useState(true)

  useEffect(() => {
    // prefers-reduced-motion check
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)

    // WebGL availability
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      setWebglAvailable(!!gl)
    } catch {
      setWebglAvailable(false)
    }
  }, [])

  // Fallback estático
  if (!webglAvailable || reducedMotion) {
    return (
      <div
        className={`hero-3d-fallback ${className || ''}`}
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`hero-3d-scene ${className || ''}`} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: cameraPosition, fov: cameraFov, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <SceneContents
            modelUrl={modelUrl}
            enableControls={enableControls}
            enableFloat={enableFloat}
            environmentPreset={environmentPreset}
          />
          {children}
          <Preload all />
        </Suspense>

        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        {enablePostprocessing && (
          <EffectComposer disableNormalPass>
            <Bloom
              intensity={bloomStrength}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
            <ChromaticAberration
              offset={new THREE.Vector2(chromaticAmount, chromaticAmount)}
              blendFunction={BlendFunction.NORMAL}
              radialModulation={false}
              modulationOffset={0}
            />
            <Noise opacity={grainAmount} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.2} darkness={vignetteDarkness} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}

// ============================================================
// SCENE CONTENTS (luces, modelo, sombras)
// ============================================================
function SceneContents({
  modelUrl,
  enableControls,
  enableFloat,
  environmentPreset,
}: {
  modelUrl?: string
  enableControls: boolean
  enableFloat: boolean
  environmentPreset: string
}) {
  const { camera } = useThree()
  const mouseX = useRef(0)
  const mouseY = useRef(0)
  const targetCamPos = useRef(new THREE.Vector3(...camera.position.toArray()))

  // Mouse-driven subtle camera orbit
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseX.current = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY.current = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  useFrame(() => {
    // Subtle camera parallax (max 0.5 units)
    targetCamPos.current.x = mouseX.current * 0.5
    targetCamPos.current.y = -mouseY.current * 0.3 + 0
    camera.position.lerp(targetCamPos.current, 0.05)
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      {/* Luces de 3 puntos */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#ff0040" />

      {/* IBL environment */}
      <Environment preset={environmentPreset as any} />

      {/* Modelo GLB (si hay) */}
      {modelUrl && (
        <Suspense fallback={null}>
          {enableFloat ? (
            <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
              <HeroModel url={modelUrl} />
            </Float>
          ) : (
            <HeroModel url={modelUrl} />
          )}
        </Suspense>
      )}

      {/* Contact shadows */}
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.5}
        scale={20}
        blur={2.5}
        far={4}
        resolution={1024}
      />

      {/* Optional orbit controls */}
      {enableControls && (
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
        />
      )}
    </>
  )
}

// ============================================================
// HERO MODEL (wrapper de useGLTF)
// ============================================================
function HeroModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  useEffect(() => {
    // Enable shadows
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
  }, [scene])

  return <primitive object={scene} scale={1} position={[0, 0, 0]} />
}

// ============================================================
// HOOK: pause render loop offscreen
// ============================================================
export function usePauseWhenOffscreen(canvasRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!canvasRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const canvas = canvasRef.current?.querySelector('canvas')
        if (canvas) {
          // R3F stores frameloop state in __r3f
          ;(canvas as any).__r3f && ((canvas as any).__r3f.frameloop = entry.isIntersecting ? 'always' : 'never')
        }
      },
      { threshold: 0 }
    )
    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [canvasRef])
}

// ============================================================
// EXPORTS ADICIONALES
// ============================================================
export { HeroModel }

// Preload del GLB (llamar fuera del componente, en page.tsx)
export const preloadHeroModel = (url: string) => useGLTF.preload(url)
