"use client";

/**
 * VolumetricFog.tsx
 *
 * Niebla volumétrica + god rays en un solo fragment shader.
 * Técnica: ray-marching simplificado + noise para scattering.
 *
 * Inspiración: Blade Runner 2049, Active Theory.
 *
 * Características:
 *   - 4 capas de fog a distintas profundidades (parallax)
 *   - God rays desde una "luz" superior-izquierda
 *   - Mouse "aparta" la niebla radialmente
 *   - Paleta amber/sepia + deep black
 *   - Letterbox bars top/bottom (animadas por scroll)
 *   - prefers-reduced-motion: estático
 *   - DPR clamp [1, 2]
 */

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Hook para pausar render cuando el canvas sale del viewport (PERF-1)
function useIntersectionPause() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return { containerRef, isVisible };
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uScrollProgress;
  uniform float uMouseStrength;
  varying vec2 vUv;

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

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  // === God rays: ray-marching simplificado ===
  const vec2 LIGHT_POS = vec2(0.3, 0.85);

  float godRays(vec2 uv, float time) {
    vec2 toLight = uv - LIGHT_POS;
    float distToLight = length(toLight);
    vec2 dir = normalize(toLight);

    float rays = 0.0;
    const int STEPS = 8;
    for (int i = 0; i < STEPS; i++) {
      float t = float(i) / float(STEPS);
      vec2 samplePos = LIGHT_POS + dir * distToLight * t;
      float n = snoise(vec3(samplePos * 4.0, time * 0.1));
      rays += (1.0 - t) * smoothstep(-0.2, 0.5, n) * 0.08;
    }
    rays *= exp(-distToLight * 1.5);
    return rays;
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.04;

    // === 4 capas de niebla con velocidades, escalas y direcciones distintas ===
    // Cada capa se mueve de forma independiente para crear profundidad real

    // Capa 1: FONDO LEJANO — muy lenta, escala grande, se mueve a la derecha
    vec2 uv1 = uv * 1.5 + vec2(t * 0.4, t * 0.15);
    float fog1 = fbm(vec3(uv1, t * 0.3));

    // Capa 2: FONDO MEDIO — lenta, escala media, se mueve a la izquierda
    vec2 uv2 = uv * 2.5 + vec2(-t * 0.8, t * 0.3);
    float fog2 = fbm(vec3(uv2, t * 0.5 + 10.0));

    // Capa 3: FRENTE — velocidad media, escala chica, se mueve a la derecha rápido
    vec2 uv3 = uv * 4.0 + vec2(t * 2.0, -t * 0.5);
    float fog3 = fbm(vec3(uv3, t * 0.8 + 20.0));

    // Capa 4: DETALLE — muy rápida, escala muy chica, movimiento turbulento
    vec2 uv4 = uv * 7.0 + vec2(t * 3.5, t * 1.2);
    float fog4 = fbm(vec3(uv4, t * 1.5 + 30.0));

    // Combinar capas con pesos distintos
    // Las capas lejanas (1,2) dominan el volumen; las cercanas (3,4) añaden detalle
    float fog = fog1 * 0.35 + fog2 * 0.30 + fog3 * 0.20 + fog4 * 0.15;
    fog = fog * 0.5 + 0.5; // [-1,1] -> [0,1]
    fog = clamp(fog, 0.0, 1.0);

    // Acentuar contraste para que las capas se distingan
    fog = smoothstep(0.15, 0.95, fog);

    // === Mouse aparta la niebla ===
    vec2 mousePos = uMouse * vec2(uResolution.x / uResolution.y, 1.0) * 0.5;
    float mouseDist = length(centered - mousePos);
    float mouseFogClear = exp(-mouseDist * mouseDist * 3.0) * uMouseStrength;
    fog *= (1.0 - mouseFogClear * 0.7);

    // === God rays ===
    float rays = godRays(uv, uTime);

    // === Paleta cinematográfica — boost para visibilidad ===
    vec3 colorDeep = vec3(0.08, 0.06, 0.08);
    vec3 colorFog = vec3(0.75, 0.55, 0.32);
    vec3 colorAmber = vec3(1.0, 0.78, 0.5);
    vec3 colorLight = vec3(1.0, 0.9, 0.7);

    vec3 finalColor = mix(colorDeep, colorFog, fog * 1.0);
    finalColor += colorLight * rays * 2.5;
    float highlight = fog * rays * 3.0;
    finalColor += colorAmber * highlight;

    // Vignette suave
    float vig = 1.0 - length(centered) * 0.35;
    finalColor *= clamp(vig, 0.7, 1.0);

    // Film grain sutil
    float grain = snoise(vec3(uv * 800.0, uTime * 20.0)) * 0.02;
    finalColor += grain;

    finalColor = clamp(finalColor, 0.0, 1.0);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function FogPlane({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();

  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));
  const mouseStrength = useRef(0);
  const scrollProgress = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uScrollProgress: { value: 0 },
      uMouseStrength: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      mouseStrength.current = 1.0;
    };
    const onScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      scrollProgress.current = Math.min(scrollY / heroHeight, 1);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size, uniforms]);

  useFrame((state) => {
    if (!materialRef.current) return;

    if (!reducedMotion) {
      uniforms.uTime.value = state.clock.elapsedTime;
    }

    // Lerp mouse
    mouseCurrent.current.lerp(mouseTarget.current, 0.05);
    uniforms.uMouse.value.copy(mouseCurrent.current);
    uniforms.uMouseStrength.value = mouseStrength.current;
    uniforms.uScrollProgress.value = scrollProgress.current;

    // Fade mouse strength
    mouseStrength.current = Math.max(0, mouseStrength.current - 0.015);
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function VolumetricFog() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const { containerRef, isVisible } = useIntersectionPause();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setWebglAvailable(!!gl);
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  if (!webglAvailable || reducedMotion) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 85%, rgba(212,165,116,0.3) 0%, rgba(10,10,15,1) 60%)",
        }}
        aria-hidden
      />
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        frameloop={isVisible && !reducedMotion ? "always" : "demand"}
      >
        <FogPlane reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
