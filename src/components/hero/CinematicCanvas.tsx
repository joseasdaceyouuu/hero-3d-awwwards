"use client";

/**
 * CinematicCanvas.tsx — Canvas 3D con 3 capas a distintas profundidades Z.
 *
 * Capa FONDO (Z=+8): niebla atmosférica + estrellas/luciérnagas lentas
 * Capa NIEBLA (Z=+4): bruma volumétrica que se intensifica al atravesarla
 * Capa MEDIO (Z=+1): 120 partículas con halo + estela + burst al cruzar
 * Capa FRENTE (Z=-1): shader iridiscente (oro líquido + Fresnel + ondas + shimmer)
 *
 * CROSSFADE POR Z: cada capa calcula su propia visibilidad basándose en
 * la Z de la cámara relativa a su propia Z. Esto crea transiciones
 * naturales donde cada capa "respira" a su propio ritmo en vez de un
 * fade global sincronizado. La fórmula:
 *   layerAlpha = smoothstep(near - fadeRange, layerZ, cameraZ) *
 *                (1.0 - smoothstep(layerZ - fadeRange, layerZ - fadeRange*2, cameraZ))
 *
 * COREOGRAFÍA DE COLOR EN 4 FASES (basadas en uDepth 0..1):
 *   Fase 1 (0.0-0.30): Lejano — frío violeta/azul, estrellas activas
 *   Fase 2 (0.30-0.55): Aproximación — paleta tibia, niebla crece
 *   Fase 3 (0.55-0.80): Cruce de medio — burst de partículas, paleta cálida
 *   Fase 4 (0.80-1.00): Llegada — frente se materializa, amber/oro pleno
 *
 * Stack: R3F + GSAP ScrollTrigger + Lenis
 * Performance: DPR [1,2], IntersectionObserver pause-offscreen, reduced-motion
 * Accesibilidad: role=application, tabIndex=0, keyboard nav
 */

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ============================================================
// SHADERS
// ============================================================

// Helper: crossfade por Z. Calcula un alpha 0..1 basado en la Z de la cámara
// relativa a la Z de la capa. La capa es visible cuando la cámara está lejos,
// se atenúa cuando la cámara se acerca, y se desvanece cuando la atraviesa.
//
//   layerAlpha = smoothstep(camFar, layerZ + fadeIn, cameraZ) *   // aparece al acercarse
//                (1.0 - smoothstep(layerZ - fadeOut, layerZ - fadeOut*2, cameraZ))  // se va al cruzar
//
// cameraZ es positivo (la cámara va de Z=+14 a Z=+1.5).
// layerZ también positivo (8, 4, 1). Cuando cameraZ > layerZ la cámara está DELANTE.
const Z_CROSSFADE_GLSL = `
  float zCrossfade(float cameraZ, float layerZ, float fadeIn, float fadeOut) {
    // Visible cuando cameraZ > layerZ + fadeIn (lejos de la capa)
    float appear = smoothstep(layerZ + fadeIn + 0.5, layerZ + fadeIn, cameraZ);
    // Desaparece cuando cameraZ < layerZ - fadeOut (cámara ya pasó la capa)
    float disappear = smoothstep(layerZ - fadeOut, layerZ - fadeOut * 2.0, cameraZ);
    return appear * disappear;
  }
`;

const NOISE_GLSL = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289_4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute4(vec4 x) { return mod289_4(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt4(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

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
    vec4 p = permute4(permute4(permute4(
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
    vec4 norm = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * snoise(p); p *= 2.0; a *= 0.5; }
    return v;
  }
`;

// Capa FONDO: niebla atmosférica
const BG_VERTEX = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const BG_FRAGMENT = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uDepth;        // 0..1, progreso del dolly
  uniform float uCameraZ;      // Z actual de la cámara
  uniform float uLayerAlpha;   // crossfade calculado en CPU
  varying vec2 vUv;
  ${NOISE_GLSL}

  // Hash para generar posiciones de estrellas pseudo-aleatorias estables
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Estrellas/luciérnagas: puntos estables que parpadean lentamente
  float stars(vec2 uv, float density, float twinkleSpeed) {
    vec2 grid = fract(uv * density) - 0.5;
    vec2 id = floor(uv * density);
    float h = hash21(id);
    // Solo algunas celdas tienen estrella (densidad controlada)
    float star = step(0.92, h);
    // Distancia al centro de la celda
    float d = length(grid);
    // Núcleo pequeño + halo suave
    float core = smoothstep(0.05, 0.0, d);
    float halo = smoothstep(0.4, 0.0, d) * 0.15;
    // Twinkle: cada estrella parpadea a su propio ritmo
    float twinkle = sin(uTime * twinkleSpeed + h * 6.28) * 0.5 + 0.5;
    twinkle = mix(0.3, 1.0, twinkle);
    return (core + halo) * star * twinkle;
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.15;
    float n = fbm(vec3(centered * 1.5 + uMouse * 0.02, t));
    n = n * 0.5 + 0.5;

    // Paleta que evoluciona con la profundidad:
    //   uDepth=0 (lejos): tonos fríos violeta/azul
    //   uDepth=1 (cerca): tonos cálidos amber/oro
    // deepNear/midNear suficientemente cálidos y luminosos para que el halo
    // residual del fondo al final del dolly aporte luz (no negro).
    vec3 deepFar  = vec3(0.05, 0.05, 0.10);
    vec3 midFar   = vec3(0.14, 0.11, 0.24);
    vec3 deepNear = vec3(0.18, 0.12, 0.08);
    vec3 midNear  = vec3(0.42, 0.26, 0.16);

    vec3 deep = mix(deepFar, deepNear, uDepth);
    vec3 mid  = mix(midFar,  midNear,  uDepth);

    // Accent: violeta frío al inicio, amber cálido al final
    vec3 accentFar  = vec3(0.30, 0.25, 0.45);
    vec3 accentNear = vec3(0.55, 0.40, 0.20);
    vec3 accent = mix(accentFar, accentNear, uDepth);

    vec3 color = mix(deep, mid, smoothstep(0.2, 0.8, n));
    color += accent * smoothstep(0.5, 0.9, n) * 0.3;

    // Estrellas/luciérnagas — dos capas a distintas escalas y velocidades
    // Se desplazan lentamente con el mouse para dar sensación de parallax lejano
    vec2 starUv = centered + uMouse * 0.01;
    float s1 = stars(starUv * 3.0 + vec2(uTime * 0.005, 0.0), 8.0, 0.8);
    float s2 = stars(starUv * 5.0 - vec2(0.0, uTime * 0.003), 12.0, 1.2);
    // Las estrellas se atenúan al acercarse la cámara (uDepth alto = menos estrellas)
    float starAlpha = mix(1.0, 0.3, uDepth);
    // Color de estrella: blanco-azulado al inicio, blanco-amber al final
    vec3 starCol = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.92, 0.75), uDepth);
    color += starCol * (s1 + s2 * 0.6) * starAlpha * 0.8;

    // Vignette fuerte (fondo más oscuro en bordes)
    float vig = 1.0 - length(centered) * 0.6;
    color *= clamp(vig, 0.4, 1.0);

    // Crossfade por Z: la capa se desvanece cuando la cámara la atraviesa.
    // Halo residual alto (0.35) para que quede iluminación de fondo siempre.
    float alpha = mix(0.35, 1.0, uLayerAlpha);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Capa FRENTE: iridiscente (oro líquido + Fresnel)
const FG_VERTEX = `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Ondulación Z orgánica
    float wave = sin(pos.x * 1.5 + uTime * 0.4) * cos(pos.y * 1.5 + uTime * 0.3);
    pos.z += wave * 0.06;
    // Parallax en UVs (NO en geometría)
    vUv = uv + uMouse * 0.015;

    vec3 transformedNormal = normalize(vec3(
      -sin(pos.x * 1.5 + uTime * 0.4) * 0.06,
      -cos(pos.y * 1.5 + uTime * 0.3) * 0.06,
      1.0
    ));
    vNormal = normalize(normalMatrix * transformedNormal);
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FG_FRAGMENT = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uMouseStrength;
  uniform float uDepth;          // progreso del dolly
  uniform float uLayerAlpha;     // crossfade calculado en CPU
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  ${NOISE_GLSL}

  vec3 thinFilmIridescence(float thickness, float noise) {
    vec3 c1 = vec3(0.85, 0.65, 0.25);  // oro
    vec3 c2 = vec3(0.70, 0.50, 0.35);  // bronce
    vec3 c3 = vec3(0.90, 0.80, 0.50);  // champagne
    vec3 c4 = vec3(0.60, 0.45, 0.55);  // violeta suave
    float t = thickness * 3.0 + noise * 2.0 + uTime * 0.2;
    vec3 col = mix(c1, c2, sin(t) * 0.5 + 0.5);
    col = mix(col, c3, sin(t * 1.3 + 1.0) * 0.5 + 0.5);
    col = mix(col, c4, sin(t * 0.7 + 2.0) * 0.5 + 0.5);
    return col;
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    // Fresnel
    float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
    fresnel = pow(fresnel, 1.2);

    // Noise orgánico
    float organicNoise = fbm(vec3(centered * 1.5, uTime * 0.1));

    // Iridiscencia
    vec3 irid = thinFilmIridescence(fresnel, organicNoise);

    // Mouse ripple
    float mouseDist = length(centered - uMouse * 0.3);
    float ripple = sin(mouseDist * 12.0 - uTime * 1.5) * exp(-mouseDist * 3.0) * uMouseStrength;

    // --- NUEVO: Ondas concéntricas lentas que emanan del centro ---
    // Ondas muy lentas y sutiles — como ondas en agua quieta
    float distFromCenter = length(centered);
    float slowWaves = sin(distFromCenter * 8.0 - uTime * 0.4) * 0.5 + 0.5;
    slowWaves *= smoothstep(1.2, 0.2, distFromCenter); // solo en el centro
    slowWaves = pow(slowWaves, 3.0) * 0.3;

    // --- NUEVO: Shimmer sutil — destellos que recorren la superficie ---
    // Usamos fBm de alta frecuencia modulado por tiempo lento
    float shimmerNoise = fbm(vec3(centered * 6.0, uTime * 0.5));
    float shimmer = smoothstep(0.55, 0.75, shimmerNoise) * smoothstep(0.85, 0.75, shimmerNoise);
    shimmer *= 0.4;

    // --- NUEVO: Línea de horizonte sutil ---
    // Una línea horizontal baja que sugiere un horizonte cinematográfico
    float horizonY = 0.15; // posición del horizonte (un poco abajo del centro)
    float horizonLine = smoothstep(0.012, 0.0, abs(centered.y + horizonY));
    // El horizonte tiene un glow suave encima y debajo
    float horizonGlow = exp(-abs(centered.y + horizonY) * 8.0) * 0.4;
    // El horizonte se desvanece en los bordes para no verse como línea recta
    float horizonMask = smoothstep(1.0, 0.3, abs(centered.x));
    horizonLine *= horizonMask;
    horizonGlow *= horizonMask;

    // Paleta — colores aclarados para evitar pantalla negra cuando la capa
    // se materializa al final del dolly. La iridiscencia y el Fresnel agregan
    // brillo encima, así que la base puede ser moderada.
    vec3 colorDeep = vec3(0.15, 0.10, 0.12);
    vec3 colorMid = vec3(0.45, 0.30, 0.20);
    vec3 colorLight = vec3(1.0, 0.85, 0.60);

    float depth = length(centered);
    vec3 color = mix(colorMid, colorDeep, smoothstep(0.0, 0.7, depth));

    // Iridiscencia Fresnel
    color += irid * fresnel * 1.5;
    color += colorLight * pow(fresnel, 2.0) * 0.8;

    // Mouse glow
    color += irid * ripple * 0.3;
    color += vec3(0.4, 0.30, 0.15) * exp(-mouseDist * 4.0) * uMouseStrength * 0.15;

    // Ondas concéntricas
    color += colorLight * slowWaves;

    // Shimmer
    color += colorLight * shimmer * fresnel;

    // Horizonte: línea caliente + glow
    color += vec3(0.85, 0.65, 0.35) * horizonLine * 0.6;
    color += vec3(0.55, 0.40, 0.25) * horizonGlow;

    // God rays sutiles
    float rays = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 rayPos = vec2(0.2 + fi * 0.2, 0.8);
      float d = length(uv - rayPos);
      rays += exp(-d * d * 8.0) * (sin(uTime * 0.3 + fi * 1.5) * 0.5 + 0.5);
    }
    rays *= 0.12;
    color += vec3(0.45, 0.35, 0.20) * rays;

    // Vignette
    float vig = 1.0 - pow(depth * 1.2, 2.0);
    color *= clamp(vig, 0.5, 1.0);

    // Grain
    float grain = snoise(vec3(uv * 1200.0, uTime * 15.0)) * 0.008;
    color += grain;

    // --- Aparición progresiva al acercarse la cámara ---
    // La capa frente se "materializa" gradualmente. Empieza temprano (0.20) y
    // termina a (0.55) para solapar con el desvanecimiento de la niebla y
    // las partículas — evita huecos de visibilidad al final del dolly.
    float fgReveal = smoothstep(0.20, 0.55, uDepth);
    // Mezclamos hacia negro cuando uDepth es bajo, pero sin hacerla invisible
    // del todo (queremos que se insinúe desde el principio)
    color = mix(color * 0.30, color, fgReveal);

    // Crossfade por Z + reveal → alpha final.
    // El mix sube el piso a 0.35 para que el frente siempre aporte luz.
    float alpha = uLayerAlpha * mix(0.35, 1.0, fgReveal);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha);
  }
`;

// ============================================================
// CAPA NIEBLA VOLUMÉTRICA (Z=+4) — bruma que se intensifica al atravesarla
// ============================================================
const FOG_VERTEX = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const FOG_FRAGMENT = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uDepth;          // progreso del dolly
  uniform float uCameraZ;        // Z de la cámara
  uniform float uLayerAlpha;     // crossfade por Z
  varying vec2 vUv;
  ${NOISE_GLSL}

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    // Niebla con fBm de baja frecuencia — nubes grandes y lentas
    float t = uTime * 0.08;
    float n = fbm(vec3(centered * 1.2 + uMouse * 0.015, t));
    n = n * 0.5 + 0.5;
    // Segunda capa de niebla a otra escala para dar profundidad
    float n2 = fbm(vec3(centered * 2.5 - uMouse * 0.01, t * 1.3));
    n2 = n2 * 0.5 + 0.5;
    float fog = n * 0.6 + n2 * 0.4;
    fog = smoothstep(0.3, 0.85, fog);

    // Color de la niebla: evoluciona con la profundidad
    // Lejano: azul-violeta frío. Cerca: amber cálido.
    // Colores más vivos porque usamos AdditiveBlending (suma luz).
    vec3 fogFar  = vec3(0.18, 0.15, 0.30);
    vec3 fogNear = vec3(0.45, 0.30, 0.20);
    vec3 fogCol = mix(fogFar, fogNear, uDepth);

    // Intensidad de la niebla: crece al aproximarse la capa (uLayerAlpha alto)
    // y decae después de cruzarla. uLayerAlpha controla la visibilidad.
    // Multiplicador subido a 0.7 porque usamos AdditiveBlending (suma luz).
    float intensity = fog * uLayerAlpha * 0.7;

    // Vignette suave para que la niebla sea más densa en el centro
    float vig = 1.0 - length(centered) * 0.4;
    intensity *= clamp(vig, 0.5, 1.0);

    // Pequeño shimmer en la niebla — destellos que la atraviesan
    float shimmer = smoothstep(0.7, 0.85, n2) * uLayerAlpha * 0.15;
    fogCol += vec3(0.4, 0.35, 0.25) * shimmer;

    gl_FragColor = vec4(fogCol, intensity);
  }
`;

// ============================================================
// CAPA FONDO (Z=-8) — niebla + estrellas/luciérnagas + paleta dinámica
// ============================================================
function BackgroundLayer({ mouseRef, scrollProgressRef, cameraZRef, reducedMotion }: {
  mouseRef: React.RefObject<THREE.Vector2>;
  scrollProgressRef: React.RefObject<number>;
  cameraZRef: React.RefObject<number>;
  reducedMotion: boolean;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uDepth: { value: 0 },
    uCameraZ: { value: 14 },
    uLayerAlpha: { value: 0.78 }, // alpha inicial en camZ=14 con fadeIn=20, fadeOut=4
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    if (!reducedMotion) uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uMouse.value.copy(mouseRef.current);
    const depth = scrollProgressRef.current;
    uniforms.uDepth.value = THREE.MathUtils.lerp(uniforms.uDepth.value, depth, 0.08);
    const camZ = cameraZRef.current;
    uniforms.uCameraZ.value = camZ;
    // Crossfade por Z: capa fondo está en Z=8 (mesh position=[0,0,8]).
    // fadeIn grande (20) → siempre "aparecida" en el rango del dolly (camZ 0.5..14).
    // fadeOut=4 → se desvanece cuando la cámara cruza Z=8 y llega a Z=4.
    const alpha = zCrossfadeCPU(camZ, 8.0, 20.0, 4.0);
    uniforms.uLayerAlpha.value = THREE.MathUtils.lerp(uniforms.uLayerAlpha.value, alpha, 0.1);
  });

  return (
    <mesh position={[0, 0, 8]} scale={[viewport.width * 3, viewport.height * 3, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={BG_VERTEX}
        fragmentShader={BG_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// Helper CPU para crossfade por Z (espejo del GLSL).
// Calcula un alpha 0..1 basado en la distancia entre la cámara y la capa.
//
// appear:   1 cuando la cámara está EN o PASÓ la capa (dist <= 0),
//           0 cuando la cámara está lejos (dist >= fadeIn),
//           interpolación suave entre.
//
// disappear: 1 cuando la cámara está EN o DELANTE de la capa (dist >= 0),
//            0 cuando la cámara ya pasó la capa (dist <= -fadeOut),
//            interpolación suave entre.
//
// alpha = appear * disappear → curva de campana:
//   0 lejos → sube al acercarse → pico en la capa → baja al cruzar → 0 lejos detrás
//
// Casos especiales:
//   - Capas LEJANAS (fondo): usar fadeIn grande → appear≈1 siempre, solo desaparece al cruzar
//   - Capas CERCANAS (frente): usar fadeOut grande → disappear≈1 siempre, solo aparece al acercarse
function zCrossfadeCPU(cameraZ: number, layerZ: number, fadeIn: number, fadeOut: number): number {
  const dist = cameraZ - layerZ; // positivo = cámara delante (lejos); negativo = cámara pasó la capa
  const appear = 1 - THREE.MathUtils.smoothstep(dist, 0, fadeIn);
  const disappear = THREE.MathUtils.smoothstep(dist, -fadeOut, 0);
  return appear * disappear;
}

// ============================================================
// CAPA NIEBLA VOLUMÉTRICA (Z=+4) — bruma intercapa
// ============================================================
function FogLayer({ mouseRef, scrollProgressRef, cameraZRef, reducedMotion }: {
  mouseRef: React.RefObject<THREE.Vector2>;
  scrollProgressRef: React.RefObject<number>;
  cameraZRef: React.RefObject<number>;
  reducedMotion: boolean;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uDepth: { value: 0 },
    uCameraZ: { value: 14 },
    uLayerAlpha: { value: 0 },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    if (!reducedMotion) uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uMouse.value.copy(mouseRef.current);
    const depth = scrollProgressRef.current;
    uniforms.uDepth.value = THREE.MathUtils.lerp(uniforms.uDepth.value, depth, 0.08);
    const camZ = cameraZRef.current;
    uniforms.uCameraZ.value = camZ;
    // Capa niebla está en Z=4. Curva de campana: aparece al acercarse,
    // pico en camZ=4, se desvanece al cruzar.
    const alpha = zCrossfadeCPU(camZ, 4.0, 4.0, 3.0);
    uniforms.uLayerAlpha.value = THREE.MathUtils.lerp(uniforms.uLayerAlpha.value, alpha, 0.1);
  });

  return (
    <mesh position={[0, 0, 4]} scale={[viewport.width * 2.5, viewport.height * 2.5, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={FOG_VERTEX}
        fragmentShader={FOG_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ============================================================
// CAPA MEDIO (Z=+1) — Partículas con halo + estela + burst al cruzar
// ============================================================
// Shader de partículas con halo suave y parpadeo orgánico
const PARTICLE_VERTEX = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uDepth;          // progreso del dolly
  uniform float uCameraZ;        // Z de la cámara
  uniform float uLayerAlpha;     // crossfade por Z
  uniform float uBurst;          // 0..1, flash orgánico al cruzar la capa
  varying float vPhase;
  varying float vAlpha;
  varying float vBurst;

  void main() {
    vPhase = aPhase;
    vBurst = uBurst;
    vec3 pos = position;
    // Movimiento orbital lento — cada partícula tiene su velocidad y fase
    float t = uTime * aSpeed;
    pos.x += sin(t + aPhase * 6.28) * 0.3;
    pos.y += cos(t * 0.7 + aPhase * 6.28) * 0.25;
    pos.z += sin(t * 0.5 + aPhase * 3.14) * 0.15;

    // BURST: cuando la cámara cruza la capa, las partículas se expanden
    // brevemente hacia afuera (efecto de "atravesar el plano")
    float burstDir = sign(pos.x) * step(0.001, abs(pos.x));
    pos.x += burstDir * uBurst * 0.4 * (0.5 + aPhase);
    pos.y += (aPhase - 0.5) * uBurst * 0.3;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Tamaño con atenuación por distancia + parpadeo orgánico
    float twinkle = sin(uTime * 0.8 + aPhase * 6.28) * 0.3 + 0.7;
    // El burst hace que las partículas crezcan brevemente
    float burstSize = 1.0 + uBurst * 1.5;
    gl_PointSize = aSize * uPixelRatio * 80.0 * twinkle * burstSize / -mvPos.z;

    // Crossfade por Z + visibilidad (multiplicador subido a 0.7 para que
    // aporten luz visible incluso sin burst — son AdditiveBlending).
    float visibility = uLayerAlpha * (0.7 + uBurst * 0.3);
    vAlpha = visibility;
  }
`;

const PARTICLE_FRAGMENT = `
  varying float vPhase;
  varying float vAlpha;
  varying float vBurst;

  void main() {
    // Coordenada centrada en el punto
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // Núcleo brillante + halo suave (glow)
    float core = smoothstep(0.5, 0.0, d);
    float halo = smoothstep(0.5, 0.15, d) * 0.4;
    // El burst expande el halo
    halo *= (1.0 + vBurst * 1.2);

    // Color: la mayoría amber, algunas con tinte cálido/rosado sutil
    // El burst intensifica hacia blanco-amarillo
    vec3 colAmber = vec3(1.0, 0.85, 0.55);
    vec3 colRose  = vec3(1.0, 0.75, 0.65);
    vec3 colWhite = vec3(1.0, 0.98, 0.85);
    vec3 col = mix(colAmber, colRose, step(0.7, vPhase));
    col = mix(col, colWhite, vBurst * 0.6);

    float alpha = (core + halo) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

function ParticleLayer({ mouseRef, scrollProgressRef, cameraZRef, reducedMotion }: {
  mouseRef: React.RefObject<THREE.Vector2>;
  scrollProgressRef: React.RefObject<number>;
  cameraZRef: React.RefObject<number>;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  // Ref para detectar el cruce de la capa y disparar el burst
  const prevCameraZ = useRef(14);
  const burstValue = useRef(0);

  const { positions, sizes, phases, speeds } = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * viewport.width * 2.2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * viewport.height * 2.2;
      positions[i * 3 + 2] = 1 + (Math.random() - 0.5) * 1.5; // Z=1 ± 0.75
      sizes[i] = Math.random() * 0.5 + 0.3;
      phases[i] = Math.random();
      speeds[i] = 0.15 + Math.random() * 0.25;
    }
    return { positions, sizes, phases, speeds };
  }, [viewport]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uDepth: { value: 0 },
    uCameraZ: { value: 14 },
    uLayerAlpha: { value: 0 },
    uBurst: { value: 0 },
  }), []);

  useFrame((state) => {
    if (!pointsRef.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    const depth = scrollProgressRef.current;
    uniforms.uDepth.value = THREE.MathUtils.lerp(uniforms.uDepth.value, depth, 0.08);
    const camZ = cameraZRef.current;
    uniforms.uCameraZ.value = camZ;

    // Crossfade por Z: capa medio está en Z=1. Curva de campana.
    // Aparece al acercarse (camZ≈5), pico en camZ=1, se desvanece al cruzar.
    const alpha = zCrossfadeCPU(camZ, 1.0, 4.0, 2.0);
    uniforms.uLayerAlpha.value = THREE.MathUtils.lerp(uniforms.uLayerAlpha.value, alpha, 0.1);

    // BURST: detectar cuando la cámara cruza Z=1 (de camZ>1 a camZ<1)
    if (prevCameraZ.current > 1.0 && camZ <= 1.0) {
      burstValue.current = 1.0; // disparar burst
    }
    prevCameraZ.current = camZ;
    // Decaer el burst exponencialmente
    burstValue.current = Math.max(0, burstValue.current - 0.018);
    uniforms.uBurst.value = THREE.MathUtils.lerp(uniforms.uBurst.value, burstValue.current, 0.2);

    // Reset cuando el scroll vuelve a 0 — evita estado inconsistente al volver
    if (depth < 0.001) {
      prevCameraZ.current = 14;
      burstValue.current = 0;
      uniforms.uBurst.value = 0;
    }

    // Rotación muy lenta + parallax sutil con mouse
    pointsRef.current.rotation.y = t * 0.015 + mouseRef.current.x * 0.04;
    pointsRef.current.rotation.x = t * 0.01 + mouseRef.current.y * 0.04;
    pointsRef.current.position.y = Math.sin(t * 0.12) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={positions.length / 3} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} count={sizes.length} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} count={phases.length} />
        <bufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} count={speeds.length} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={PARTICLE_VERTEX}
        fragmentShader={PARTICLE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ============================================================
// CAPA FRENTE (Z=-1) — Iridiscente + ondas + shimmer + horizonte
// ============================================================
function ForegroundLayer({ mouseRef, mouseStrengthRef, scrollProgressRef, cameraZRef, reducedMotion }: {
  mouseRef: React.RefObject<THREE.Vector2>;
  mouseStrengthRef: React.RefObject<number>;
  scrollProgressRef: React.RefObject<number>;
  cameraZRef: React.RefObject<number>;
  reducedMotion: boolean;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uMouseStrength: { value: 0 },
    uDepth: { value: 0 },
    uCameraZ: { value: 14 },
    uLayerAlpha: { value: 0.94 }, // alpha inicial en camZ=14 con fadeIn=100, fadeOut=2
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    if (!reducedMotion) uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uMouse.value.copy(mouseRef.current);
    uniforms.uMouseStrength.value = mouseStrengthRef.current;
    const depth = scrollProgressRef.current;
    uniforms.uDepth.value = THREE.MathUtils.lerp(uniforms.uDepth.value, depth, 0.08);
    const camZ = cameraZRef.current;
    uniforms.uCameraZ.value = camZ;
    // Capa frente está en Z=-1. fadeIn muy grande (100) → appear≈1 siempre
    // (nunca "aparece" porque ya está aparecida). fadeOut=2 → no se desvanece
    // porque la cámara nunca cruza Z=-1 (se detiene en Z=0.5).
    // El reveal real lo maneja el shader con fgReveal (basado en uDepth).
    const alpha = zCrossfadeCPU(camZ, -1.0, 100.0, 2.0);
    uniforms.uLayerAlpha.value = THREE.MathUtils.lerp(uniforms.uLayerAlpha.value, alpha, 0.1);
  });

  return (
    <mesh position={[0, 0, -1]} scale={[viewport.width * 1.3, viewport.height * 1.3, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={FG_VERTEX}
        fragmentShader={FG_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================
// CÁMARA CON DOLLY EN SCROLL
// ============================================================
function CameraDolly({ scrollProgressRef, cameraZRef }: {
  scrollProgressRef: React.RefObject<number>;
  cameraZRef: React.RefObject<number>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    // El hero mide 400vh (HERO_SCREENS = 4 en page.tsx) y se monta dinámicamente
    // cuando `loaded` pasa a true. Cuando este componente se monta, el hero
    // recién acaba de aparecer — su altura real puede no estar lista todavía.
    // Esperamos un frame + un microtask y luego forzamos refresh para que
    // ScrollTrigger mida correctamente el rango completo.
    let st: ScrollTrigger | null = null;
    let raf1 = 0, raf2 = 0;

    const create = () => {
      st = ScrollTrigger.create({
        trigger: "#hero",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => { scrollProgressRef.current = self.progress; },
      });
      ScrollTrigger.refresh();
    };

    // doble rAF: 1) pinta el layout, 2) mide correctamente
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(create);
    });

    // Recalcula en resize por si cambia el viewport
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", onResize);
      if (st) st.kill();
    };
  }, [scrollProgressRef]);

  useFrame(() => {
    // Cámara viaja de Z=14 a Z=0.5 — dolly completo a través de las 4 capas:
    // Capa Fondo (Z=8) → Niebla (Z=4) → Partículas (Z=1, aquí dispara el burst) → Frente (Z=-1)
    // El usuario VE el travelling porque el scroll dura 3 viewport-heights.
    // Llegamos a Z=0.5 (no a Z=-1) para no atravesar el frente y dejarlo visible.
    const progress = scrollProgressRef.current;
    const targetZ = 14 - progress * 13.5;

    // Cuando el scroll vuelve a 0 (usuario scrolleó hacia arriba), forzar
    // el reset inmediato de la cámara a Z=14. Sin esto, el lerp suave tarda
    // varios frames en volver y las capas se renderizan con escala incorrecta
    // porque la cámara está cerca pero el layout se ajustó a un viewport lejano.
    if (progress < 0.005) {
      // Snap directo a Z=14 — sin transición suave
      camera.position.z = 14;
    } else if (targetZ > camera.position.z + 0.5) {
      // Scrolleando hacia ARRIBA (targetZ > currentZ = cámara debe alejarse).
      // Lerp más rápido (0.18) para que las capas no se queden "pequeñas"
      // mientras la cámara vuelve a su posición lejana.
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.18);
    } else {
      // Scrolleando hacia ABAJO (dolly normal). Lerp suave estándar.
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);
    }
    // Compartir la Z de la cámara con todas las capas para el crossfade por Z
    cameraZRef.current = camera.position.z;
  });

  return null;
}

// ============================================================
// CANVAS PRINCIPAL
// ============================================================
export function CinematicCanvas() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Mouse tracking (compartido entre capas)
  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));
  const mouseStrength = useRef(0);

  // Scroll progress compartido (0..1) — el CameraDolly lo escribe,
  // las 4 capas lo leen para sincronizar paleta y visibilidad con el dolly.
  const scrollProgressRef = useRef(0);

  // Z de la cámara compartida — el CameraDolly la escribe, las capas la leen
  // para calcular su propio crossfade por Z (transiciones elegantes intercapa).
  const cameraZRef = useRef(14);

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
    } catch { setWebglAvailable(false); }
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

  // Mouse listener
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      mouseStrength.current = 1.0;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // Lerp mouse + decay strength (fuera del Canvas — usar requestAnimationFrame)
  useEffect(() => {
    let raf: number;
    const tick = () => {
      mouseCurrent.current.lerp(mouseTarget.current, 0.05);
      mouseStrength.current = Math.max(0, mouseStrength.current - 0.012);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard nav (A11Y-3)
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      const step = 0.1;
      switch (e.key) {
        case "ArrowLeft": mouseTarget.current.x = Math.max(-1, mouseTarget.current.x - step); break;
        case "ArrowRight": mouseTarget.current.x = Math.min(1, mouseTarget.current.x + step); break;
        case "ArrowUp": mouseTarget.current.y = Math.min(1, mouseTarget.current.y + step); break;
        case "ArrowDown": mouseTarget.current.y = Math.max(-1, mouseTarget.current.y - step); break;
        case "Enter": case " ":
          const cta = document.querySelector("[data-hover]") as HTMLAnchorElement;
          if (cta) cta.click();
          break;
      }
      mouseStrength.current = 1.0;
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!webglAvailable || reducedMotion) {
    return (
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(40,25,15,0.6) 0%, rgba(8,6,16,1) 70%)",
      }} aria-hidden />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      role="application"
      aria-label="Escena 3D interactiva con 3 capas de profundidad. Usa flechas para mover y Enter para activar."
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <Canvas
        camera={{ position: [0, 0, 14], fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        frameloop={isVisible && !reducedMotion ? "always" : "demand"}
      >
        {/* 4 capas a distintas profundidades Z — todas sincronizadas al dolly.
            Orden de renderizado: FONDO (Z=8) → NIEBLA (Z=4) → MEDIO/partículas (Z=1) → FRENTE (Z=-1)
            Cada capa calcula su propio crossfade por Z para transiciones elegantes. */}
        <BackgroundLayer
          mouseRef={mouseCurrent}
          scrollProgressRef={scrollProgressRef}
          cameraZRef={cameraZRef}
          reducedMotion={reducedMotion}
        />
        <FogLayer
          mouseRef={mouseCurrent}
          scrollProgressRef={scrollProgressRef}
          cameraZRef={cameraZRef}
          reducedMotion={reducedMotion}
        />
        <ParticleLayer
          mouseRef={mouseCurrent}
          scrollProgressRef={scrollProgressRef}
          cameraZRef={cameraZRef}
          reducedMotion={reducedMotion}
        />
        <ForegroundLayer
          mouseRef={mouseCurrent}
          mouseStrengthRef={mouseStrength}
          scrollProgressRef={scrollProgressRef}
          cameraZRef={cameraZRef}
          reducedMotion={reducedMotion}
        />

        {/* Cámara que hace dolly al scroll — escribe progreso y Z en los refs compartidos */}
        <CameraDolly scrollProgressRef={scrollProgressRef} cameraZRef={cameraZRef} />
      </Canvas>
    </div>
  );
}
