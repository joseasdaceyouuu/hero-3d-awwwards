"use client";

/**
 * AuroraBorealis.tsx
 *
 * Aurora boreal procedural — cortinas de luz celestial que se mueven
 * como campos magnéticos reales. Técnica:
 *
 *   - 3 cortinas de luz con velocidades y altitudes distintas (parallax)
 *   - Cada cortina usa fbm noise modulado por una curva gaussiana vertical
 *     para crear la forma "cortina" que cuelga del cielo
 *   - Paleta natural: verde aurora (#00ff9d) + magenta (#ff00aa) + azul profundo
 *   - Mouse desplaza las cortinas horizontalmente (efecto viento solar)
 *   - Stars integradas en el shader (puntos con twinkle)
 *   - Reflejo en agua: mitad inferior espeja + distorsiona
 *
 * Inspiración: Islandia, noruega, fotos de Awwwards SOTD de travel.
 * Principios del skill aplicados:
 *   - C9: Una idea dominante (la aurora)
 *   - C10: Paleta ≤ 3 colores (verde + magenta + deep blue)
 *   - C11: Timing cinematográfico
 *   - C7: prefers-reduced-motion respetado
 *   - C12: WebGL fallback
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

  // === Cortina de aurora ===
  // Una cortina es: noise horizontal modulado por curva gaussiana vertical.
  // La aurora "cuelga" del cielo — más intensa en cierta altitud.
  float auroraCurtain(vec2 uv, float time, float altitude, float speed, float freq) {
    // Coordenada horizontal con movimiento (viento solar)
    float x = uv.x * freq + time * speed;
    // Noise horizontal — crea las "rayas" verticales características
    float n = fbm(vec3(x * 1.5, time * 0.3, altitude));
    n = n * 0.5 + 0.5; // [0,1]

    // Curva gaussiana vertical — la aurora es más intensa en 'altitude'
    float dist = abs(uv.y - altitude);
    float intensity = exp(-dist * dist * 12.0);

    // Combinar: la cortina aparece donde noise + altitude coinciden
    float curtain = n * intensity;
    return curtain;
  }

  // === Estrellas con twinkle ===
  float stars(vec2 uv, float time) {
    // Grid de estrellas — más denso
    vec2 grid = floor(uv * 150.0);
    float star = sin(grid.x * 12.9898 + grid.y * 78.233) * 43758.5453;
    star = fract(star);

    // Más estrellas (threshold más bajo)
    float isStar = step(0.97, star);

    // Twinkle más pronunciado
    float twinkle = sin(time * 3.0 + star * 100.0) * 0.5 + 0.5;

    // Posición exacta dentro de la celda
    vec2 cellUv = fract(uv * 150.0) - 0.5;
    float dist = length(cellUv);
    // Estrellas más grandes
    float starShape = smoothstep(0.08, 0.0, dist);

    // Algunas estrellas más brillantes (variación)
    float brightness = 0.5 + star * 0.5;

    return isStar * starShape * twinkle * brightness;
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.1;

    // === Fondo: deep night sky ===
    vec3 colorDeep = vec3(0.01, 0.02, 0.06); // deep blue-black
    vec3 color = colorDeep;

    // === Estrellas (solo en mitad superior) ===
    if (uv.y > 0.5) {
      float starIntensity = stars(uv * vec2(uResolution.x / uResolution.y, 1.0), uTime);
      color += vec3(1.0, 1.0, 1.0) * starIntensity * 1.5;
    }

    // === 3 cortinas de aurora con altitudes y velocidades distintas ===
    // Mouse desplaza horizontalmente las cortinas (viento solar)
    float mouseWind = uMouse.x * 0.3 * uMouseStrength;

    // Cortina 1: verde, altitud alta, lenta
    float curtain1 = auroraCurtain(uv + vec2(mouseWind, 0.0), t, 0.75, 0.5, 3.0);
    vec3 colorGreen = vec3(0.0, 1.0, 0.6); // verde aurora
    color += colorGreen * curtain1 * 1.5;

    // Cortina 2: magenta, altitud media, velocidad media
    float curtain2 = auroraCurtain(uv + vec2(mouseWind * 1.5, 0.0), t * 1.3, 0.65, 0.8, 4.0);
    vec3 colorMagenta = vec3(1.0, 0.2, 0.8); // magenta aurora
    color += colorMagenta * curtain2 * 1.2;

    // Cortana 3: cyan, altitud baja, rápida
    float curtain3 = auroraCurtain(uv + vec2(mouseWind * 2.0, 0.0), t * 1.6, 0.55, 1.2, 5.0);
    vec3 colorCyan = vec3(0.2, 0.9, 1.0); // cyan
    color += colorCyan * curtain3 * 1.0;

    // === Reflejo en agua (mitad inferior) ===
    if (uv.y < 0.5) {
      // Espejar la mitad superior
      vec2 reflectedUv = vec2(uv.x, 1.0 - uv.y);

      // Distorsión del agua con noise
      float waterNoise = fbm(vec3(uv.x * 8.0, uTime * 0.5, 0.0)) * 0.02;
      reflectedUv.x += waterNoise;
      reflectedUv.y += waterNoise * 0.5;

      // Recalcular aurora reflejada
      float r1 = auroraCurtain(reflectedUv + vec2(mouseWind, 0.0), t, 0.75, 0.5, 3.0);
      float r2 = auroraCurtain(reflectedUv + vec2(mouseWind * 1.5, 0.0), t * 1.3, 0.65, 0.8, 4.0);
      float r3 = auroraCurtain(reflectedUv + vec2(mouseWind * 2.0, 0.0), t * 1.6, 0.55, 1.2, 5.0);

      // Atenuar reflejo (agua no es espejo perfecto)
      float reflectionMask = smoothstep(0.0, 0.5, uv.y); // más visible cerca del horizonte
      float reflectionStrength = 0.4 * reflectionMask;

      color += colorGreen * r1 * reflectionStrength;
      color += colorMagenta * r2 * reflectionStrength;
      color += colorCyan * r3 * reflectionStrength;

      // Tinte azul del agua
      color = mix(color, vec3(0.02, 0.05, 0.12), 0.3 * (1.0 - reflectionMask));
    }

    // === Horizonte: línea sutil ===
    float horizon = smoothstep(0.49, 0.51, uv.y) - smoothstep(0.51, 0.53, uv.y);
    color += vec3(0.1, 0.15, 0.2) * horizon;

    // === Vignette ===
    float vig = 1.0 - length(centered) * 0.4;
    color *= clamp(vig, 0.7, 1.0);

    // === Film grain ===
    float grain = snoise(vec3(uv * 800.0, uTime * 20.0)) * 0.015;
    color += grain;

    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function AuroraPlane({ reducedMotion }: { reducedMotion: boolean }) {
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
    mouseStrength.current = Math.max(0, mouseStrength.current - 0.01);
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

export function AuroraBorealis() {
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
            "linear-gradient(to bottom, #02050f 0%, #0a1a3a 40%, #1a2a5a 50%, #050a1a 100%)",
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
          preserveDrawingBuffer: true,
        }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <AuroraPlane reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
