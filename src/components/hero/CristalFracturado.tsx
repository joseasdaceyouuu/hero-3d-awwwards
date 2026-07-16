"use client";

/**
 * CristalFracturado.tsx v2 — Reconstrucción completa.
 *
 * Problemas de v1 que se arreglan:
 *   - Partículas cuadradas feas → ELIMINADAS. En su lugar: god rays sutiles
 *   - Voronoi burdo → Reemplazado por Fresnel + iridiscencia sutil
 *   - Movimiento agresivo → Movimiento orgánico lento y elegante
 *   - Colores saturados → Paleta desaturada, refinada
 *   - Sin profundidad real → Depth fog + parallax suave
 *
 * Técnica de vanguardia: Fresnel iridiscencia + causticas suaves + god rays
 * Inspiración: Apple Vision Pro, sitios de Active Theory
 */

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX_SHADER = `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;

    // Ondulación orgánica del plano (no agresiva)
    vec3 pos = position;
    float wave = sin(pos.x * 2.0 + uTime * 0.5) * cos(pos.y * 2.0 + uTime * 0.3);
    pos.z += wave * 0.15; // Ondas dramáticas y visibles

    // Parallax sutil al mouse
    pos.x += uMouse.x * 0.08;
    pos.y += uMouse.y * 0.08;

    // Normal para Fresnel
    vec3 transformedNormal = normalize(vec3(
      -sin(pos.x * 2.0 + uTime * 0.5) * 0.03,
      -cos(pos.y * 2.0 + uTime * 0.3) * 0.03,
      1.0
    ));
    vNormal = normalize(normalMatrix * transformedNormal);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vViewDir = normalize(-mvPos.xyz);

    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uMouseStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

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
    for (int i = 0; i < 3; i++) {
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  // Iridiscencia basada en Fresnel — como una pompa de jabón o cristal
  vec3 iridescence(float fresnel, float noise) {
    // Espectro de colores sutiles y desaturados
    vec3 c1 = vec3(0.55, 0.35, 0.85);  // violeta brillante
    vec3 c2 = vec3(0.38, 0.52, 0.78);  // azul brillante
    vec3 c3 = vec3(0.62, 0.48, 0.72);  // lavanda brillante
    vec3 c4 = vec3(0.70, 0.55, 0.65);  // rosa-perla
    vec3 c5 = vec3(0.42, 0.55, 0.72);  // azul acero brillante

    float t = fresnel * 3.0 + noise * 2.0 + uTime * 0.3; // Muy dinámico
    vec3 col = mix(c1, c2, sin(t) * 0.5 + 0.5);
    col = mix(col, c3, sin(t * 1.3 + 1.0) * 0.5 + 0.5);
    col = mix(col, c4, sin(t * 0.7 + 2.0) * 0.5 + 0.5);
    col = mix(col, c5, sin(t * 1.7 + 3.0) * 0.5 + 0.5);

    return col;
  }

  // Causticas suaves — luz que fluye como agua
  float softCaustics(vec2 uv, float time) {
    float n1 = fbm(vec3(uv * 2.0, time * 0.15));
    float n2 = fbm(vec3(uv * 3.5 + 5.0, time * 0.2));
    // Interferencia sutil
    float pattern = abs(n1 + n2 * 0.5);
    return smoothstep(0.0, 0.4, pattern) * 0.6;
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.5; // Dinámico y visible

    // === Fresnel — efecto principal ===
    float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
    fresnel = pow(fresnel, 1.2); // Bordes más amplios y visibles

    // === Noise orgánico para variación ===
    float organicNoise = fbm(vec3(centered * 1.5, t * 0.5));

    // === Iridiscencia Fresnel ===
    vec3 irid = iridescence(fresnel, organicNoise);

    // === Causticas suaves de fondo ===
    float caustic = softCaustics(uv + organicNoise * 0.05, t);

    // === Paleta refinada y desaturada ===
    vec3 colorDeep = vec3(0.12, 0.08, 0.20);      // violeta profundo visible
    vec3 colorMid = vec3(0.28, 0.22, 0.42);       // violeta medio brillante
    vec3 colorLight = vec3(0.95, 0.88, 1.0);      // blanco-lavanda muy brillante

    // Base: gradiente de profundidad
    float depth = length(centered);
    vec3 color = mix(colorMid, colorDeep, smoothstep(0.0, 0.7, depth));

    // Añadir causticas suaves
    color = mix(color, irid * 1.0, caustic * 0.6);

    // Iridiscencia Fresnel MUY visible
    color += irid * fresnel * 1.8;

    // Luz en los bordes — brillo intenso como cristal real
    color += colorLight * pow(fresnel, 2.0) * 1.2;

    // === Mouse: ripple sutil y elegante ===
    float mouseDist = length(centered - uMouse * 0.3);
    float ripple = sin(mouseDist * 12.0 - uTime * 1.5) * exp(-mouseDist * 3.0) * uMouseStrength;
    color += irid * ripple * 0.3;

    // Glow sutil del mouse
    color += vec3(0.3, 0.25, 0.4) * exp(-mouseDist * 4.0) * uMouseStrength * 0.15;

    // === God rays verticales sutiles ===
    float rays = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 rayPos = vec2(0.2 + fi * 0.2, 0.8);
      float d = length(uv - rayPos);
      rays += exp(-d * d * 8.0) * (sin(uTime * 0.3 + fi * 1.5) * 0.5 + 0.5);
    }
    rays *= 0.2; // God rays claramente visibles
    color += vec3(0.4, 0.35, 0.5) * rays;

    // === Depth fog atmosférico ===
    color = mix(color, colorDeep, smoothstep(0.3, 0.9, depth) * 0.3);

    // === Vignette elegante ===
    float vig = 1.0 - pow(depth * 1.2, 2.0);
    color *= clamp(vig, 0.5, 1.0);

    // === Film grain muy sutil ===
    float grain = snoise(vec3(uv * 1200.0, uTime * 15.0)) * 0.008;
    color += grain;

    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function CrystalPlane({ reducedMotion }: { reducedMotion: boolean }) {
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
    mouseCurrent.current.lerp(mouseTarget.current, 0.04);
    uniforms.uMouse.value.copy(mouseCurrent.current);
    uniforms.uMouseStrength.value = mouseStrength.current;
    mouseStrength.current = Math.max(0, mouseStrength.current - 0.01);
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function CristalFracturado() {
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

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const keyboardMouseRef = useRef(new THREE.Vector2(0, 0));
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      const step = 0.1;
      switch (e.key) {
        case "ArrowLeft": keyboardMouseRef.current.x = Math.max(-1, keyboardMouseRef.current.x - step); break;
        case "ArrowRight": keyboardMouseRef.current.x = Math.min(1, keyboardMouseRef.current.x + step); break;
        case "ArrowUp": keyboardMouseRef.current.y = Math.min(1, keyboardMouseRef.current.y + step); break;
        case "ArrowDown": keyboardMouseRef.current.y = Math.max(-1, keyboardMouseRef.current.y - step); break;
        case "Enter": case " ":
          const cta = document.querySelector('[data-hover]') as HTMLAnchorElement;
          if (cta) cta.click();
          break;
      }
      window.dispatchEvent(new MouseEvent("mousemove", {
        clientX: ((keyboardMouseRef.current.x + 1) / 2) * window.innerWidth,
        clientY: ((1 - keyboardMouseRef.current.y) / 2) * window.innerHeight,
      }));
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!webglAvailable || reducedMotion) {
    return (
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(40,30,60,0.6) 0%, rgba(10,8,15,1) 70%)",
      }} aria-hidden />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      role="application"
      aria-label="Cristal iridiscente interactivo. Usa las flechas para mover y Enter para activar."
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
        <CrystalPlane reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
