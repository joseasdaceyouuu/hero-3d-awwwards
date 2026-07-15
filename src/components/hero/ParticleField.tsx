"use client";

/**
 * ParticleField.tsx
 *
 * 2000 partículas instanced que siguen un curl noise field en el vertex shader.
 * Cada partícula tiene posición base + offset animado por noise = movimiento orgánico.
 * Mouse empuja las partículas radialmente (force field).
 *
 * Performance:
 *   - 1 draw call (instanced)
 *   - Cálculo en GPU (vertex shader)
 *   - 2000 partículas a 60fps en mobile
 */

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 2000;

const VERTEX_SHADER = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uPixelRatio;

  attribute vec3 aOffset;      // posición base de cada partícula
  attribute float aScale;      // tamaño aleatorio
  attribute float aSpeed;      // velocidad de animación aleatoria

  varying float vAlpha;
  varying float vDepth;

  // === Simplex 3D noise ===
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    float n_x0 = snoise(p - dx);
    float n_x1 = snoise(p + dx);
    float n_y0 = snoise(p - dy);
    float n_y1 = snoise(p + dy);
    float n_z0 = snoise(p - dz);
    float n_z1 = snoise(p + dz);
    vec3 curl;
    curl.x = (n_z1 - n_z0) - (n_y1 - n_y0);
    curl.y = (n_x1 - n_x0) - (n_z1 - n_z0);
    curl.z = (n_y1 - n_y0) - (n_x1 - n_x0);
    return curl / (2.0 * e);
  }

  void main() {
    // Posición base + offset animado por curl noise
    float t = uTime * aSpeed * 0.3;
    vec3 noisePos = aOffset * 0.3 + vec3(0.0, 0.0, t);
    vec3 flow = curlNoise(noisePos) * 0.5;

    vec3 finalPos = aOffset + flow;

    // Mouse repulsion: empuja partículas lejos del cursor
    vec2 mouseInfluence = uMouse * 3.0;
    float mouseDist = distance(finalPos.xy, mouseInfluence);
    float repel = exp(-mouseDist * mouseDist * 1.5) * uMouseStrength;
    vec2 repelDir = normalize(finalPos.xy - mouseInfluence + vec2(0.001));
    finalPos.xy += repelDir * repel * 0.8;

    // Profundidad z para parallax
    finalPos.z = aOffset.z + flow.z * 0.3;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Tamaño con perspectiva
    gl_PointSize = aScale * uPixelRatio * (50.0 / -mvPosition.z);

    // Alpha basado en profundidad (partículas lejanas más tenues)
    vAlpha = clamp(1.0 - (-mvPosition.z - 2.0) / 8.0, 0.2, 1.0);
    vDepth = -mvPosition.z;
  }
`;

const FRAGMENT_SHADER = `
  varying float vAlpha;
  varying float vDepth;

  void main() {
    // Soft circular particle (mejor que cuadrado)
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Falloff suave
    float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;

    // Color: blanco con tinte cyan/violet según profundidad
    vec3 colorNear = vec3(0.7, 0.95, 1.0);   // cyan claro cerca
    vec3 colorFar = vec3(0.69, 0.4, 1.0);    // violet lejos
    vec3 color = mix(colorNear, colorFar, smoothstep(2.0, 8.0, vDepth));

    gl_FragColor = vec4(color, alpha * 0.9);
  }
`;

function Particles({ reducedMotion }: { reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();

  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));
  const mouseStrength = useRef(0);

  // Generar posiciones base aleatorias para las partículas
  const { positions, offsets, scales, speeds } = useMemo(() => {
    const offsets = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribución en caja 3D amplia
      offsets[i * 3] = (Math.random() - 0.5) * 12;
      offsets[i * 3 + 1] = (Math.random() - 0.5) * 8;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 6;

      scales[i] = Math.random() * 2 + 0.5;
      speeds[i] = Math.random() * 0.5 + 0.5;
    }

    // positions attribute (vacío, solo para que three no chille)
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    return { positions, offsets, scales, speeds };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    }),
    []
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      mouseStrength.current = 1.0;
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  useFrame((state) => {
    if (!materialRef.current) return;
    if (!reducedMotion) {
      uniforms.uTime.value = state.clock.elapsedTime;
    }
    mouseCurrent.current.lerp(mouseTarget.current, 0.05);
    uniforms.uMouse.value.copy(mouseCurrent.current);
    uniforms.uMouseStrength.value = mouseStrength.current;
    // Fade mouse strength
    mouseStrength.current = Math.max(0, mouseStrength.current - 0.02);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          args={[offsets, 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-aScale"
          args={[scales, 1]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          args={[speeds, 1]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ParticleField({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: false, // partículas no necesitan antialias
          alpha: true,
          powerPreference: "high-performance",
        }}
        frameloop={reducedMotion ? "demand" : "always"}
        style={{ background: "transparent" }}
      >
        <Particles reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
