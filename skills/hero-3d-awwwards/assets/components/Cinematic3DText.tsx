'use client'

/**
 * Cinematic3DText.tsx
 * Tipografía 3D con stagger de entrada. Arquetipo 5 (Text 3D cinemático).
 *
 * 2 variantes:
 *   - <Cinematic3DTextTroika>  — usa troika-three-text (SDF, liviano, recomendado)
 *   - <Cinematic3DText3D>      — usa drei Text3D (extruded geometry, más pesado)
 *
 * Características:
 *   - Entrada con stagger por palabra (gsap)
 *   - Color + emissive opcional
 *   - Bloom compatible (emissive > 1)
 *   - Mouse parallax opcional
 *   - Float animation opcional
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text3D, Float, Center } from '@react-three/drei'
import { TroikaText } from './TroikaText'  // Ver nota abajo
import * as THREE from 'three'
import gsap from 'gsap'

// ============================================================
// VARIANT 1: Troika (RECOMENDADA)
// ============================================================
interface Cinematic3DTextTroikaProps {
  text: string
  fontSize?: number              // default 1
  color?: string                 // default "#ffffff"
  emissive?: string              // default "#000000"
  emissiveIntensity?: number     // default 0
  position?: [number, number, number]
  staggerDelay?: number          // default 0.08 (segundos por palabra)
  entryDuration?: number         // default 1.2
  entryFrom?: 'bottom' | 'top' | 'left' | 'right' | 'scale' | 'depth'
  enableFloat?: boolean
  enableMouseParallax?: boolean
  maxWidth?: number              // default 10
  textAlign?: 'left' | 'center' | 'right'
  fontUrl?: string               // .woff/.ttf/.otf URL
}

export function Cinematic3DTextTroika({
  text,
  fontSize = 1,
  color = '#ffffff',
  emissive = '#000000',
  emissiveIntensity = 0,
  position = [0, 0, 0],
  staggerDelay = 0.08,
  entryDuration = 1.2,
  entryFrom = 'bottom',
  enableFloat = false,
  enableMouseParallax = true,
  maxWidth = 10,
  textAlign = 'center',
  fontUrl,
}: Cinematic3DTextTroikaProps) {
  const groupRef = useRef<THREE.Group>(null)
  const words = text.split(' ')

  // Mouse parallax
  const mouseTarget = useRef(new THREE.Vector2(0, 0))
  const mouseCurrent = useRef(new THREE.Vector2(0, 0))
  const { camera } = useThree()

  useEffect(() => {
    if (!enableMouseParallax) return
    const handler = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseTarget.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [enableMouseParallax])

  // Entry animation con stagger
  useEffect(() => {
    if (!groupRef.current) return

    const wordGroups = groupRef.current.children
    const fromVars = getEntryFromVars(entryFrom)

    const tl = gsap.timeline({ delay: 0.3 })
    wordGroups.forEach((word, i) => {
      gsap.set(word.position, {
        x: word.position.x + fromVars.x,
        y: word.position.y + fromVars.y,
        z: word.position.z + fromVars.z,
      })
      gsap.set(word.scale, fromVars.scale)

      tl.to(word.position, {
        x: '-=' + fromVars.x,
        y: '-=' + fromVars.y,
        z: '-=' + fromVars.z,
        duration: entryDuration,
        ease: 'power4.out',
      }, i * staggerDelay)
        .to(word.scale, {
          x: 1, y: 1, z: 1,
          duration: entryDuration,
          ease: 'power4.out',
        }, i * staggerDelay)
    })

    return () => { tl.kill() }
  }, [entryFrom, entryDuration, staggerDelay])

  useFrame(() => {
    if (enableMouseParallax && groupRef.current) {
      mouseCurrent.current.lerp(mouseTarget.current, 0.05)
      groupRef.current.rotation.y = mouseCurrent.current.x * 0.1
      groupRef.current.rotation.x = -mouseCurrent.current.y * 0.05
    }
  })

  // Layout horizontal simple (centered)
  // Para layouts complejos, usa layout calculado con textWidth
  const wordPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    const spacing = fontSize * 0.6
    let x = -(words.length - 1) * spacing / 2
    words.forEach(() => {
      positions.push([x, 0, 0])
      x += spacing
    })
    return positions
  }, [words.length, fontSize])

  const inner = (
    <group ref={groupRef} position={position}>
      {words.map((word, i) => (
        <group key={i} position={wordPositions[i]}>
          <TroikaText
            text={word}
            fontSize={fontSize}
            color={color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            maxWidth={maxWidth}
            textAlign={textAlign}
            font={fontUrl}
          />
        </group>
      ))}
    </group>
  )

  if (enableFloat) {
    return (
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        {inner}
      </Float>
    )
  }
  return inner
}

// ============================================================
// VARIANT 2: Text3D (extruded geometry)
// ============================================================
interface Cinematic3DText3DProps {
  text: string
  fontUrl: string                // REQUERIDO: JSON font (Helvetiker, etc.)
  fontSize?: number              // default 1
  height?: number                // extrude depth, default 0.2
  color?: string                 // default "#ffffff"
  metalness?: number             // default 0.7
  roughness?: number             // default 0.2
  emissive?: string              // default "#000000"
  emissiveIntensity?: number     // default 0
  position?: [number, number, number]
  staggerDelay?: number
  entryDuration?: number
  entryFrom?: 'bottom' | 'top' | 'left' | 'right' | 'scale' | 'depth'
  enableFloat?: boolean
  enableMouseParallax?: boolean
}

export function Cinematic3DText3D({
  text,
  fontUrl,
  fontSize = 1,
  height = 0.2,
  color = '#ffffff',
  metalness = 0.7,
  roughness = 0.2,
  emissive = '#000000',
  emissiveIntensity = 0,
  position = [0, 0, 0],
  staggerDelay = 0.08,
  entryDuration = 1.2,
  entryFrom = 'depth',
  enableFloat = false,
  enableMouseParallax = true,
}: Cinematic3DText3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const letters = text.split('')
  const { camera } = useThree()
  const mouseTarget = useRef(new THREE.Vector2(0, 0))
  const mouseCurrent = useRef(new THREE.Vector2(0, 0))

  useEffect(() => {
    if (!enableMouseParallax) return
    const handler = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseTarget.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [enableMouseParallax])

  useEffect(() => {
    if (!groupRef.current) return
    const letterGroups = groupRef.current.children
    const fromVars = getEntryFromVars(entryFrom)

    const tl = gsap.timeline({ delay: 0.3 })
    letterGroups.forEach((letter, i) => {
      gsap.set(letter.position, {
        x: letter.position.x + fromVars.x,
        y: letter.position.y + fromVars.y,
        z: letter.position.z + fromVars.z,
      })
      gsap.set(letter.scale, fromVars.scale)

      tl.to(letter.position, {
        x: '-=' + fromVars.x,
        y: '-=' + fromVars.y,
        z: '-=' + fromVars.z,
        duration: entryDuration,
        ease: 'power4.out',
      }, i * staggerDelay)
        .to(letter.scale, {
          x: 1, y: 1, z: 1,
          duration: entryDuration,
          ease: 'power4.out',
        }, i * staggerDelay)
    })

    return () => { tl.kill() }
  }, [entryFrom, entryDuration, staggerDelay])

  useFrame(() => {
    if (enableMouseParallax && groupRef.current) {
      mouseCurrent.current.lerp(mouseTarget.current, 0.05)
      groupRef.current.rotation.y = mouseCurrent.current.x * 0.15
      groupRef.current.rotation.x = -mouseCurrent.current.y * 0.1
    }
  })

  // Layout: posicionar cada letra horizontalmente
  const letterSpacing = fontSize * 0.5
  const letterPositions = useMemo(() => {
    return letters.map((_, i) => [
      (i - (letters.length - 1) / 2) * letterSpacing,
      0,
      0,
    ] as [number, number, number])
  }, [letters.length, letterSpacing])

  const inner = (
    <group ref={groupRef} position={position}>
      {letters.map((letter, i) => (
        <group key={i} position={letterPositions[i]}>
          <Text3D
            font={fontUrl}
            size={fontSize}
            height={height}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
            bevelSegments={3}
          >
            {letter}
            <meshStandardMaterial
              color={color}
              metalness={metalness}
              roughness={roughness}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </Text3D>
        </group>
      ))}
    </group>
  )

  if (enableFloat) {
    return (
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        {inner}
      </Float>
    )
  }
  return inner
}

// ============================================================
// HELPERS
// ============================================================
function getEntryFromVars(entryFrom: string): { x: number; y: number; z: number; scale: { x: number; y: number; z: number } } {
  switch (entryFrom) {
    case 'bottom': return { x: 0, y: -3, z: 0, scale: { x: 1, y: 1, z: 1 } }
    case 'top':    return { x: 0, y: 3, z: 0,  scale: { x: 1, y: 1, z: 1 } }
    case 'left':   return { x: -5, y: 0, z: 0, scale: { x: 1, y: 1, z: 1 } }
    case 'right':  return { x: 5, y: 0, z: 0,  scale: { x: 1, y: 1, z: 1 } }
    case 'scale':  return { x: 0, y: 0, z: 0,  scale: { x: 0, y: 0, z: 0 } }
    case 'depth':  return { x: 0, y: 0, z: 8,  scale: { x: 0.5, y: 0.5, z: 0.5 } }
    default:       return { x: 0, y: -3, z: 0, scale: { x: 1, y: 1, z: 1 } }
  }
}

// ============================================================
// USO
// ============================================================
/*
import { Cinematic3DTextTroika } from '@/components/hero/Cinematic3DText'

<Canvas>
  <ambientLight intensity={0.5} />
  <directionalLight position={[5, 5, 5]} intensity={1.5} />

  <Cinematic3DTextTroika
    text="BRAND NAME"
    fontSize={1.2}
    color="#ffffff"
    emissive="#ff0040"
    emissiveIntensity={0.5}
    entryFrom="depth"
    enableFloat
    enableMouseParallax
  />
</Canvas>
*/

// ============================================================
// NOTA SOBRE TROIKA
// ============================================================
// Troika-three-text NO está directamente disponible como componente en drei.
// Necesitas crear un wrapper mínimo:
//
// // TroikaText.tsx
// import { Text } from 'troika-three-text'
// import { useThree, useFrame } from '@react-three/fiber'
// import { useRef, useEffect } from 'react'
// import * as THREE from 'three'
//
// export function TroikaText({ text, fontSize, color, emissive, ...props }) {
//   const ref = useRef<THREE.Mesh>()
//   const troikaText = useRef(new Text())
//
//   useEffect(() => {
//     troikaText.current.text = text
//     troikaText.current.fontSize = fontSize
//     troikaText.current.color = color
//     troikaText.current.sync()
//   }, [text, fontSize, color])
//
//   return <primitive object={troikaText.current} ref={ref} {...props} />
// }
//
// Alternativa: usa <Text> de @react-three/drei (que internamente usa troika):
//   import { Text } from '@react-three/drei'
//   <Text fontSize={1} color="#fff">{text}</Text>
//
// Para simplificar, RECOMENDAMOS usar drei <Text> en vez del wrapper manual.

// ============================================================
// TIPS
// ============================================================
// - Troika es MÁS liviano que Text3D (usa SDF, no geometry).
// - Para glow effect: emissive + bloom en EffectComposer.
// - fontSize 1-2 = adecuado para hero principal. 3+ = masivo ( billboard ).
// - Si la fuente del usuario es custom (.woff), carga en fontUrl.
// - staggerDelay 0.05-0.12 = sweet spot. Menos = muy rápido. Más = lento.
