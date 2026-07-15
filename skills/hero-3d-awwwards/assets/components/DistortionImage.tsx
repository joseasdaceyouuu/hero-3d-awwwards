'use client'

/**
 * DistortionImage.tsx
 * Imagen con displacement al hover. Arquetipo 4 (Distortion hover).
 *
 * 3 variantes:
 *   - <DistortionImageTexture>  — displacement por textura (mapa de noise PNG)
 *   - <DistortionImageProcedural> — displacement procedural (shader noise)
 *   - <DistortionImageRGB>      — RGB shift + blur direccional
 *
 * Para portfolios de fotografía, e-commerce de moda, brand sites.
 */

import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

// ============================================================
// VARIANT 1: Distortion por textura
// ============================================================
interface DistortionImageTextureProps {
  image: string
  displacementMap?: string
  intensity?: number           // Default 0.3
  hoverIntensity?: number      // Default 1.0
  resolution?: [number, number]
  scale?: [number, number]
}

export function DistortionImageTexture({
  image,
  displacementMap,
  intensity = 0.3,
  hoverIntensity = 1.0,
  resolution = [256, 256],
  scale = [4, 3],
}: DistortionImageTextureProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const hoverRef = useRef({ value: 0 })

  const imageTexture = useLoader(THREE.TextureLoader, image)
  const dispTexture = displacementMap
    ? useLoader(THREE.TextureLoader, displacementMap)
    : null

  const uniforms = useMemo(() => ({
    uTexture: { value: imageTexture },
    uDisplacement: { value: dispTexture },
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uHover: { value: 0 },
  }), [imageTexture, dispTexture, intensity])

  // Hover handling
  useEffect(() => {
    if (!meshRef.current) return

    const handleEnter = () => {
      gsap.to(uniforms.uHover, {
        value: hoverIntensity,
        duration: 0.6,
        ease: 'power3.out',
      })
    }

    const handleLeave = () => {
      gsap.to(uniforms.uHover, {
        value: 0,
        duration: 0.8,
        ease: 'power3.inOut',
      })
    }

    const mesh = meshRef.current
    mesh.addEventListener('pointerenter', handleEnter)
    mesh.addEventListener('pointerleave', handleLeave)

    return () => {
      mesh.removeEventListener('pointerenter', handleEnter)
      mesh.removeEventListener('pointerleave', handleLeave)
    }
  }, [hoverIntensity, uniforms])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} scale={scale}>
      <planeGeometry args={[1, 1, resolution[0], resolution[1]]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          uniform sampler2D uDisplacement;
          uniform float uTime;
          uniform float uHover;
          uniform float uIntensity;
          varying vec2 vUv;

          void main() {
            vUv = uv;
            vec3 pos = position;

            float disp = 0.0;
            if (uHover > 0.0) {
              vec2 dispUv = uv + vec2(sin(uTime * 0.5) * 0.02, cos(uTime * 0.3) * 0.02);
              disp = texture2D(uDisplacement, dispUv).r;
              pos.z += disp * uIntensity * uHover;
              pos.x += (disp - 0.5) * 0.1 * uHover;
              pos.y += (disp - 0.5) * 0.1 * uHover;
            }

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D uTexture;
          uniform float uHover;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;
            // Slight chromatic aberration on hover
            float aberration = 0.005 * uHover;
            float r = texture2D(uTexture, uv + vec2(aberration, 0.0)).r;
            float g = texture2D(uTexture, uv).g;
            float b = texture2D(uTexture, uv - vec2(aberration, 0.0)).b;
            vec3 color = vec3(r, g, b);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

// ============================================================
// VARIANT 2: Distortion procedural (sin displacement map)
// ============================================================
interface DistortionImageProceduralProps {
  image: string
  intensity?: number
  hoverIntensity?: number
  frequency?: number         // Default 3.0
  resolution?: [number, number]
  scale?: [number, number]
}

export function DistortionImageProcedural({
  image,
  intensity = 0.15,
  hoverIntensity = 1.0,
  frequency = 3.0,
  resolution = [256, 256],
  scale = [4, 3],
}: DistortionImageProceduralProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({
    uTexture: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uHover: { value: 0 },
    uIntensity: { value: intensity },
    uFrequency: { value: frequency },
  }), [intensity, frequency])

  const imageTexture = useLoader(THREE.TextureLoader, image)
  useEffect(() => {
    uniforms.uTexture.value = imageTexture
  }, [imageTexture, uniforms])

  useEffect(() => {
    if (!meshRef.current) return
    const mesh = meshRef.current

    const handleEnter = () => {
      gsap.to(uniforms.uHover, {
        value: hoverIntensity,
        duration: 0.6,
        ease: 'power3.out',
      })
    }
    const handleLeave = () => {
      gsap.to(uniforms.uHover, {
        value: 0,
        duration: 0.8,
        ease: 'power3.inOut',
      })
    }

    mesh.addEventListener('pointerenter', handleEnter)
    mesh.addEventListener('pointerleave', handleLeave)
    return () => {
      mesh.removeEventListener('pointerenter', handleEnter)
      mesh.removeEventListener('pointerleave', handleLeave)
    }
  }, [hoverIntensity, uniforms])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} scale={scale}>
      <planeGeometry args={[1, 1, resolution[0], resolution[1]]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uHover;
          uniform float uIntensity;
          uniform float uFrequency;
          varying vec2 vUv;

          // Simplex 2D (pegar de noise.frag)
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                               -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                    dot(x12.zw,x12.zw)), 0.0);
            m = m*m;
            m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
            vUv = uv;
            vec3 pos = position;
            float n = snoise(uv * uFrequency + uTime * 0.3);
            pos.z += n * uIntensity * uHover;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D uTexture;
          uniform float uHover;
          uniform float uTime;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;
            float aberration = 0.008 * uHover;
            vec2 offset = vec2(sin(uTime + uv.y * 10.0), cos(uTime + uv.x * 10.0)) * 0.005 * uHover;

            float r = texture2D(uTexture, uv + offset + vec2(aberration, 0.0)).r;
            float g = texture2D(uTexture, uv + offset).g;
            float b = texture2D(uTexture, uv + offset - vec2(aberration, 0.0)).b;

            vec3 color = vec3(r, g, b);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

// ============================================================
// VARIANT 3: RGB shift + blur direccional (sin geometry displacement)
// ============================================================
interface DistortionImageRGBProps {
  image: string
  hoverIntensity?: number
  scale?: [number, number]
}

export function DistortionImageRGB({
  image,
  hoverIntensity = 1.0,
  scale = [4, 3],
}: DistortionImageRGBProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({
    uTexture: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uHover: { value: 0 },
  }), [])

  const imageTexture = useLoader(THREE.TextureLoader, image)
  useEffect(() => {
    uniforms.uTexture.value = imageTexture
  }, [imageTexture, uniforms])

  useEffect(() => {
    if (!meshRef.current) return
    const mesh = meshRef.current

    const handleEnter = () => {
      gsap.to(uniforms.uHover, {
        value: hoverIntensity,
        duration: 0.5,
        ease: 'power3.out',
      })
    }
    const handleLeave = () => {
      gsap.to(uniforms.uHover, {
        value: 0,
        duration: 0.7,
        ease: 'power3.inOut',
      })
    }

    mesh.addEventListener('pointerenter', handleEnter)
    mesh.addEventListener('pointerleave', handleLeave)
    return () => {
      mesh.removeEventListener('pointerenter', handleEnter)
      mesh.removeEventListener('pointerleave', handleLeave)
    }
  }, [hoverIntensity, uniforms])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} scale={scale}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D uTexture;
          uniform float uHover;
          uniform float uTime;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;

            // RGB shift
            float shift = 0.015 * uHover;
            float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
            float g = texture2D(uTexture, uv).g;
            float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;

            // Scanline on hover
            float scanline = sin(uv.y * 800.0 + uTime * 5.0) * 0.05 * uHover;
            vec3 color = vec3(r, g, b) - scanline;

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

// ============================================================
// USO
// ============================================================
/*
import { DistortionImageProcedural } from '@/components/hero/DistortionImage'

<Canvas>
  <DistortionImageProcedural
    image="/hero.jpg"
    intensity={0.15}
    hoverIntensity={1.0}
    frequency={3.0}
  />
</Canvas>
*/

// ============================================================
// TIPS
// ============================================================
// - Para DistortionImageTexture, genera el displacement map en Photoshop:
//   Filter > Render > Clouds → grayscale → exporta como PNG.
// - intensity 0.1-0.3 = sutil. 0.5+ = agresivo.
// - En mobile (sin hover), considera pasar hoverIntensity desde scroll o
//   siempre en 0.5 para efecto sutil.
// - NO uses resolution > 256x256 en mobile — quema GPU sin ganancia visual.
