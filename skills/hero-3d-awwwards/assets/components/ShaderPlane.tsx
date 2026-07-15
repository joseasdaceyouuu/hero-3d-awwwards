'use client'

/**
 * ShaderPlane.tsx
 * Plane con shaderMaterial custom. Arquetipo 3 (Shaders/WebGL).
 *
 * Pensado para heroes con shaders custom: noise backgrounds, distortion,
 * gradientes animados, fluid sims, plasma effects.
 *
 * IMPORTANTE: Pega los shaders desde assets/glsl/noise.frag dentro de los
 * template strings. Los uniforms ya están conectados a useFrame.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ============================================================
// PROPS
// ============================================================
interface ShaderPlaneProps {
  vertexShader?: string
  fragmentShader?: string
  uniforms?: Record<string, THREE.IUniform>
  resolution?: [number, number]      // Subdivisiones del plane
  size?: [number, number]            // Tamaño en world units
  mouseUniform?: boolean             // Conectar mouse automáticamente (default true)
  timeUniform?: boolean              // Conectar time (default true)
  scrollUniform?: boolean            // Conectar scroll progress (default false)
  className?: string
}

// ============================================================
// SHADERS POR DEFECTO (ejemplo con noise animado)
// ============================================================
const DEFAULT_VERTEX = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uScrollProgress;
  varying vec2 vUv;

  // === PEGAR AQUÍ EL CONTENIDO DE noise.frag ===
  // [snoise 2D y 3D incluidos]

  void main() {
    vUv = uv;
    vec3 pos = position;
    float n = snoise(vec3(pos.xy * 1.5, uTime * 0.2));
    pos.z += n * 0.15;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const DEFAULT_FRAGMENT = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // === PEGAR AQUÍ EL CONTENIDO DE noise.frag ===

  void main() {
    vec2 uv = vUv;
    float n = fbm(vec2(uv * 3.0 + uTime * 0.05), 5);
    float n2 = fbm(vec2(uv * 2.0 - uTime * 0.03 + uMouse), 3);

    vec3 colorA = vec3(0.05, 0.05, 0.1);
    vec3 colorB = vec3(0.9, 0.2, 0.4);
    vec3 color = mix(colorA, colorB, smoothstep(-0.3, 0.5, n + n2 * 0.3));

    // Vignette
    float vig = 1.0 - length(uv - 0.5) * 1.2;
    color *= vig;

    gl_FragColor = vec4(color, 1.0);
  }
`

// ============================================================
// COMPONENTE
// ============================================================
export function ShaderPlane({
  vertexShader = DEFAULT_VERTEX,
  fragmentShader = DEFAULT_FRAGMENT,
  uniforms: customUniforms,
  resolution = [256, 256],
  size = [8, 5],
  mouseUniform = true,
  timeUniform = true,
  scrollUniform = false,
  className,
}: ShaderPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, size: canvasSize } = useThree()
  const mouseTarget = useRef(new THREE.Vector2(0, 0))
  const mouseCurrent = useRef(new THREE.Vector2(0, 0))

  // Mouse listener
  useEffect(() => {
    if (!mouseUniform) return
    const handler = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [mouseUniform])

  // Scroll listener (optional)
  const scrollProgress = useRef(0)
  useEffect(() => {
    if (!scrollUniform) return
    const handler = () => {
      const max = document.body.scrollHeight - window.innerHeight
      scrollProgress.current = max > 0 ? window.scrollY / max : 0
    }
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [scrollUniform])

  // Merge uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(canvasSize.width, canvasSize.height) },
    uScrollProgress: { value: 0 },
    ...customUniforms,
  }), [customUniforms, canvasSize])

  // Update loop
  useFrame((state, delta) => {
    if (!materialRef.current) return

    if (timeUniform) {
      uniforms.uTime.value = state.clock.elapsedTime
    }

    if (mouseUniform) {
      mouseCurrent.current.lerp(mouseTarget.current, 0.08)
      uniforms.uMouse.value.copy(mouseCurrent.current)
    }

    if (scrollUniform) {
      uniforms.uScrollProgress.value = scrollProgress.current
    }
  })

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, resolution[0], resolution[1]]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

// ============================================================
// PRESET: Animated gradient (sin noise, simple y liviano)
// ============================================================
export function GradientShaderPlane() {
  return (
    <ShaderPlane
      vertexShader={`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec2 vUv;

        vec3 palette(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.263, 0.416, 0.557);
          return a + b * cos(6.28318 * (c * t + d));
        }

        void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= 1.78; // aspect
          uv += uMouse * 0.3;

          float t = uTime * 0.1;
          float d = length(uv) - t;

          vec3 color = palette(d);
          color *= smoothstep(0.0, 1.5, length(uv));

          gl_FragColor = vec4(color, 1.0);
        }
      `}
    />
  )
}

// ============================================================
// PRESET: Plasma (efecto retro-psicodélico)
// ============================================================
export function PlasmaShaderPlane() {
  return (
    <ShaderPlane
      vertexShader={`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= 1.78;
          uv += uMouse * 0.5;

          float v = sin(uv.x * 10.0 + uTime);
          v += sin((uv.y * 10.0 + uTime) / 2.0);
          v += sin((uv.x * 10.0 + uv.y * 10.0 + uTime) / 2.0);
          v += sin(sqrt(uv.x * uv.x + uv.y * uv.y + 1.0) * 10.0 + uTime);
          v = v / 2.0;

          vec3 col = vec3(sin(v * 3.14), sin(v * 3.14 + 2.0), sin(v * 3.14 + 4.0));
          gl_FragColor = vec4(col * 0.5 + 0.5, 1.0);
        }
      `}
    />
  )
}

// ============================================================
// USO
// ============================================================
/*
import { ShaderPlane } from '@/components/hero/ShaderPlane'

<Canvas>
  <ShaderPlane />
</Canvas>

// O con preset:
<Canvas>
  <GradientShaderPlane />
</Canvas>
*/

// ============================================================
// TIPS
// ============================================================
// - Resolution 256x256 es suficiente para noise. 512x512 solo si necesitas
//   detalle fino (ríos, montañas). Más = GPU innecesario.
// - Si el shader no compila, revisa que hayas pegado el contenido de noise.frag
//   DENTRO del vertex/fragment shader (no como import).
// - uniforms.uTime se actualiza cada frame. Si tu shader NO usa uTime,
//   pasa timeUniform={false} para ahorrar CPU.
// - En mobile, baja resolution a 128x128.
