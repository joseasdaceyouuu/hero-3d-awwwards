"use client";

/**
 * ChromeShader.tsx — Procedural chrome/mercury surface shader.
 *
 * Generado por Creator agent (GLM-5.2), adaptado para usar shaderMaterial
 * plano (como nuestros otros heroes) en vez de drei shaderMaterial + extend.
 *
 * Técnica:
 *   - fbm noise para superficie orgánica
 *   - Environment mapping simulado (gradient + noise)
 *   - Mouse ripple distortion
 *   - Paleta: silver/chrome + deep black + cyan accent
 */

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

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

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.05;

    // === Mouse ripple distortion ===
    float mouseDist = length(centered - uMouse * 0.5);
    float ripple = sin(mouseDist * 20.0 - uTime * 3.0) * exp(-mouseDist * 3.0) * uMouseStrength;
    centered += ripple * 0.05;

    // === Chrome surface: 2 layers of fbm ===
    float n1 = fbm(vec3(centered * 2.0 + vec2(t, t * 0.7), t));
    float n2 = fbm(vec3(centered * 4.0 + vec2(-t * 0.5, t * 0.3), t * 0.8 + 5.0));
    float surface = n1 * 0.6 + n2 * 0.4;
    surface = surface * 0.5 + 0.5;

    // === Environment reflection (simulated) ===
    // Gradient + noise = chrome reflection look
    vec3 reflectColor = mix(
      vec3(0.1, 0.1, 0.15),  // dark reflection
      vec3(0.85, 0.85, 0.9), // bright reflection (silver)
      surface
    );

    // Cyan accent where surface peaks
    vec3 cyanAccent = vec3(0.0, 0.83, 1.0);
    reflectColor = mix(reflectColor, cyanAccent, smoothstep(0.6, 0.9, surface) * 0.3);

    // === Specular highlights ===
    float spec = pow(smoothstep(0.5, 0.8, surface), 3.0);
    reflectColor += vec3(1.0) * spec * 0.4;

    // === Vignette ===
    float vig = 1.0 - length(centered) * 0.5;
    reflectColor *= clamp(vig, 0.6, 1.0);

    // === Film grain ===
    float grain = snoise(vec3(uv * 800.0, uTime * 20.0)) * 0.015;
    reflectColor += grain;

    reflectColor = clamp(reflectColor, 0.0, 1.0);
    gl_FragColor = vec4(reflectColor, 1.0);
  }
`;

function ChromePlane({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();

  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));
  const mouseStrength = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
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
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size, uniforms]);

  useFrame((state) => {
    if (!materialRef.current) return;
    if (!reducedMotion) {
      uniforms.uTime.value = state.clock.elapsedTime;
    }
    mouseCurrent.current.lerp(mouseTarget.current, 0.05);
    uniforms.uMouse.value.copy(mouseCurrent.current);
    uniforms.uMouseStrength.value = mouseStrength.current;
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

export function ChromeShader() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

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
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setWebglAvailable(!!gl);
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  // PERF-1: IntersectionObserver pause-offscreen
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // A11Y-3: Navegación por teclado — las flechas mueven el "mouse virtual"
  const keyboardMouseRef = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      const step = 0.1;
      switch (e.key) {
        case "ArrowLeft":
          keyboardMouseRef.current.x = Math.max(-1, keyboardMouseRef.current.x - step);
          break;
        case "ArrowRight":
          keyboardMouseRef.current.x = Math.min(1, keyboardMouseRef.current.x + step);
          break;
        case "ArrowUp":
          keyboardMouseRef.current.y = Math.min(1, keyboardMouseRef.current.y + step);
          break;
        case "ArrowDown":
          keyboardMouseRef.current.y = Math.max(-1, keyboardMouseRef.current.y - step);
          break;
        case "Enter":
        case " ":
          // Simular click en CTA
          const cta = document.querySelector('[data-hover]') as HTMLAnchorElement;
          if (cta) cta.click();
          break;
      }
      // Disparar evento sintético de mousemove para que el shader lo detecte
      window.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX: ((keyboardMouseRef.current.x + 1) / 2) * window.innerWidth,
          clientY: ((1 - keyboardMouseRef.current.y) / 2) * window.innerHeight,
        })
      );
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!webglAvailable || reducedMotion) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #0a0a0f 50%, #2a2a3e 100%)",
        }}
        aria-hidden
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      role="application"
      aria-label="Superficie cromada interactiva. Usa las flechas para mover el cursor y Enter para activar el botón."
      tabIndex={0}
      style={{ outline: "none" }}
    >
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
        <ChromePlane reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
