"use client";

/**
 * CosmicBackground.tsx
 *
 * Shader procedural con curl noise — genera un campo de flujo tipo "cosmic resonance".
 * NO es un fluid simulation real (eso requeriría ping-pong rendering), sino curl noise
 * evaluado en el fragment shader para producir el look fluid sin la complejidad.
 *
 * Características técnicas:
 *   - Simplex 3D noise (Ashima Arts)
 *   - Curl noise computation (vector field sin divergencia)
 *   - 3 octavas de fBm para detalle orgánico
 *   - Mouse como atractor (el campo fluye hacia el cursor)
 *   - Vignette + grain integrados en fragment shader
 *   - ACES tone mapping
 *   - Paleta: #030014 (deep) → #00d4ff (cyan) → #b026ff (violet) en 3 stops
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

  // === Curl noise: derivadas del noise para crear vector field sin divergencia ===
  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 p_x0 = p - dx;
    vec3 p_x1 = p + dx;
    vec3 p_y0 = p - dy;
    vec3 p_y1 = p + dy;
    vec3 p_z0 = p - dz;
    vec3 p_z1 = p + dz;

    float n_x0 = snoise(p_x0);
    float n_x1 = snoise(p_x1);
    float n_y0 = snoise(p_y0);
    float n_y1 = snoise(p_y1);
    float n_z0 = snoise(p_z0);
    float n_z1 = snoise(p_z1);

    // Curl = (∂Nz/∂y - ∂Ny/∂z, ∂Nx/∂z - ∂Nz/∂x, ∂Ny/∂x - ∂Nx/∂y)
    vec3 curl;
    curl.x = (n_z1 - n_z0) / (2.0 * e) - (n_y1 - n_y0) / (2.0 * e);
    curl.y = (n_x1 - n_x0) / (2.0 * e) - (n_z1 - n_z0) / (2.0 * e);
    curl.z = (n_y1 - n_y0) / (2.0 * e) - (n_x1 - n_x0) / (2.0 * e);
    return curl / (2.0 * e);
  }

  // === fBm con 3 octavas ===
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

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.05;

    // === Sample curl noise en múltiples puntos para crear flujo ===
    vec3 p1 = vec3(centered * 2.0, t);
    vec3 c1 = curlNoise(p1);

    // Segunda capa con frecuencia diferente para detalle
    vec3 p2 = vec3(centered * 4.0 + c1.xy * 0.1, t * 1.3);
    vec3 c2 = curlNoise(p2);

    // Combinar capas
    vec2 flow = c1.xy * 0.6 + c2.xy * 0.4;

    // Mouse como atractor: el flujo se intensifica cerca del cursor
    float mouseDist = length(centered - uMouse * 0.5);
    float mouseAttract = exp(-mouseDist * mouseDist * 4.0) * uMouseStrength;
    flow += (uMouse - centered) * mouseAttract * 2.0;

    // === fBm modulado por el flujo ===
    float n = fbm(vec3(centered * 3.0 + flow * 0.5, t));

    // === Streamlines: triple sample para look "filamentoso" ===
    vec3 streamColor;
    for (float i = 0.0; i < 3.0; i++) {
      vec2 offset = flow * (0.02 + i * 0.008);
      float s = fbm(vec3(centered * 3.0 + offset, t));
      streamColor[int(i)] = s + i * 0.05;
    }

    // === Paleta cósmica: deep → cyan → violet ===
    vec3 colorDeep = vec3(0.01, 0.0, 0.08);    // #030014 deep cosmic
    vec3 colorCyan = vec3(0.0, 0.83, 1.0);     // #00d4ff cyan
    vec3 colorViolet = vec3(0.69, 0.15, 1.0);  // #b026ff violet

    // Mezcla por umbrales suaves
    vec3 color = mix(colorDeep, colorCyan, smoothstep(-0.3, 0.4, streamColor.x));
    color = mix(color, colorViolet, smoothstep(0.2, 0.8, streamColor.y) * 0.7);

    // Boost de brillo donde el flow es intenso
    float flowMag = length(flow);
    color += colorCyan * smoothstep(0.5, 1.5, flowMag) * 0.3;

    // Mouse glow
    color += colorCyan * mouseAttract * 0.4;

    // === Vignette cinematográfico ===
    float vig = 1.0 - length(centered) * 0.65;
    color *= clamp(vig, 0.35, 1.0);

    // === Film grain ===
    float grain = snoise(vec3(uv * 1200.0, uTime * 50.0)) * 0.02;
    color += grain;

    // === ACES tone mapping ===
    color = clamp((color * (2.51 * color + 0.03)) /
                  (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function CosmicPlane({ reducedMotion }: { reducedMotion: boolean }) {
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
    const handler = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      mouseStrength.current = 1.0;
    };
    const fadeHandler = () => {
      // Fade out mouse strength when not moving
      mouseStrength.current = Math.max(0, mouseStrength.current - 0.05);
    };
    window.addEventListener("mousemove", handler);
    const interval = setInterval(fadeHandler, 100);
    return () => {
      window.removeEventListener("mousemove", handler);
      clearInterval(interval);
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

    // Smooth mouse parallax
    mouseCurrent.current.lerp(mouseTarget.current, 0.05);
    uniforms.uMouse.value.copy(mouseCurrent.current);
    uniforms.uMouseStrength.value = mouseStrength.current;
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

export function CosmicBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);

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
            "radial-gradient(ellipse at center, #1a0530 0%, #030014 70%)",
        }}
        aria-hidden
      />
    );
  }

  return (
    <div className="absolute inset-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <CosmicPlane reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
