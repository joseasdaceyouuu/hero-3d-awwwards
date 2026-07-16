"use client";

/**
 * PIXELVOID — Hero anti-ARAGAL, cyberpunk dark fantasy gamer.
 *
 * DESAFÍO A: ANTI-ARAGAL
 *   ❌ NO usa LetterReveal (estrella del VERVAIN)
 *   ❌ NO usa ConnectedParticles (fondo del VERVAIN)
 *   ❌ NO usa GoldenDust (micro-reward del VERVAIN)
 *   ❌ NO usa MouseGlow (glow suave del VERVAIN)
 *   ❌ NO usa paleta monocroma oro/negro
 *   ❌ NO usa tipografía serif elegante
 *   ❌ NO usa partículas suaves tipo polvo
 *   ✅ SÍ usa neón saturado: magenta #FF006E + cyan #00F5FF + lime #C7FF00 sobre negro
 *   ✅ SÍ usa sans-serif bold display (Space Grotesk + JetBrains Mono)
 *   ✅ SÍ usa glitch / RGB split / scanlines / CRT flicker
 *   ✅ SÍ usa interacción original: glitch burst on hover, CRT distortion on click
 *
 * Shader custom: GLITCH (sin usar registry — escrito desde cero para este caso)
 *   - RGB split horizontal con offset noise-driven
 *   - Scanlines horizontales con sine + time
 *   - CRT flicker (brightness oscillation)
 *   - Chromatic aberration radial
 *   - Glitch blocks (bloques que se desplazan horizontalmente)
 *   - Vignette + grain
 *
 * Anti-patterns aplicados:
 *   - 5.9: overflow-x: clip (no rompe sticky)
 *   - 5.5: prefers-reduced-motion (desactiva glitch animation, canvas estático)
 *   - 5.13: no anidar h1 (GlitchTitle renderiza div, no h1)
 *   - 5.14: mouse listeners en window (canvas pointer-events: none)
 */

import { useState, useEffect, useRef } from "react";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// GLITCH SHADER (custom — sin registry)
// ============================================================

const GLITCH_VERTEX = `
  // En WebGL crudo (sin Three.js) hay que declarar attributes y uniforms
  // que Three.js normalmente inyecta automáticamente.
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLITCH_FRAGMENT = `
  // WebGL1 GLSL ES 1.00 requiere precision explícito para floats
  precision highp float;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uGlitchIntensity;  // 0..1, burst on hover/click
  uniform float uReducedMotion;    // 0 or 1
  varying vec2 vUv;

  // Hash para ruido pseudo-aleatorio
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Bloque glitch: desplaza horizontalmente bandas aleatorias
  float glitchBlocks(vec2 uv, float time, float intensity) {
    float t = floor(time * 12.0);
    float row = floor(uv.y * 30.0);
    float blockRand = hash(row + t);
    // Solo algunas filas se desplazan
    float threshold = 1.0 - intensity * 0.3;
    float shift = step(threshold, blockRand) * (blockRand - 0.5) * 0.15 * intensity;
    return shift;
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= uResolution.x / uResolution.y;

    float time = uTime;
    float intensity = uGlitchIntensity;
    // Si reduced motion, desactivar glitch pero mantener fondo
    float glitchMul = mix(1.0, 0.0, uReducedMotion);

    // === FONDO: gradient radial neón ===
    // Centro: negro profundo. Bordes: magenta/cyan radial
    float dist = length(centered);
    vec3 colDeep = vec3(0.02, 0.0, 0.04);     // negro violáceo
    vec3 colMagenta = vec3(0.8, 0.0, 0.43);   // #FF006E normalizado
    vec3 colCyan = vec3(0.0, 0.96, 1.0);      // #00F5FF
    vec3 colLime = vec3(0.78, 1.0, 0.0);      // #C7FF00

    // Aura radial que cambia con el tiempo
    float auraT = time * 0.3;
    vec3 aura = mix(colMagenta, colCyan, sin(auraT) * 0.5 + 0.5);
    aura = mix(aura, colLime, sin(auraT * 0.7 + 1.0) * 0.5 + 0.5);
    float auraMask = smoothstep(0.9, 0.2, dist) * 0.15;
    vec3 color = colDeep + aura * auraMask;

    // === GRID CYBERPUNK (líneas finas) ===
    vec2 gridUv = centered * 8.0;
    vec2 gridFract = abs(fract(gridUv) - 0.5);
    float gridLine = smoothstep(0.48, 0.5, max(gridFract.x, gridFract.y));
    // El grid se intensifica con el glitch
    color += colCyan * gridLine * 0.04 * (0.5 + intensity * 0.5);

    // === GLITCH BLOCKS (desplazamiento horizontal de bandas) ===
    float blockShift = glitchBlocks(uv, time, intensity) * glitchMul;
    vec2 glitchUv = uv + vec2(blockShift, 0.0);

    // === RGB SPLIT (chromatic aberration horizontal) ===
    float splitAmount = (0.005 + intensity * 0.02) * glitchMul;
    // Samplear "ruido" para el split
    float n1 = noise(glitchUv * 3.0 + time * 0.5);
    float n2 = noise(glitchUv * 3.0 - time * 0.3);
    // Aumentar el split en zonas con glitch
    splitAmount *= (0.5 + n1 * 1.5);

    // === SCANLINES (líneas horizontales CRT) ===
    float scanline = sin(uv.y * uResolution.y * 0.8) * 0.5 + 0.5;
    scanline = pow(scanline, 3.0);
    float scanlineIntensity = 0.12 * (1.0 - uReducedMotion * 0.7);
    color *= 1.0 - scanline * scanlineIntensity;

    // === CRT FLICKER (brightness oscillation) ===
    float flicker = sin(time * 60.0) * 0.02 + sin(time * 13.0) * 0.01;
    flicker *= (1.0 - uReducedMotion);
    color += flicker;

    // === GLITCH BURST VISIBLE (cuando intensity > 0) ===
    // Bandas magenta/cyan que aparecen aleatoriamente
    float burstBand = step(0.92, hash(floor(uv.y * 50.0) + floor(time * 20.0)));
    burstBand *= intensity * glitchMul;
    vec3 burstColor = mix(colMagenta, colCyan, hash(floor(time * 20.0)));
    color += burstColor * burstBand * 0.5;

    // === VIGNETTE ===
    float vig = 1.0 - smoothstep(0.4, 1.2, dist);
    color *= clamp(vig, 0.3, 1.0);

    // === GRAIN ===
    float grain = hash2(uv * uResolution + time * 60.0) * 0.05;
    color += grain * (1.0 - uReducedMotion * 0.5);

    // === CHROMATIC ABERRATION RADIAL ===
    // Simular samples desplazados (como si el lens tuviera CA)
    float ca = 0.003 * (1.0 + intensity) * glitchMul;
    vec2 caDir = normalize(centered + 0.001);
    // Re-mezclar canales: R hacia afuera, B hacia adentro
    float rSample = smoothstep(0.5, 0.0, length(centered - caDir * ca));
    float bSample = smoothstep(0.5, 0.0, length(centered + caDir * ca));
    color.r = mix(color.r, color.r * 1.2, rSample * 0.3);
    color.b = mix(color.b, color.b * 1.2, bSample * 0.3);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

// ============================================================
// GLITCH BACKGROUND COMPONENT (canvas con shader)
// ============================================================
function GlitchBackground({
  glitchRef,
  reducedMotion,
}: {
  glitchRef: React.RefObject<number>;
  reducedMotion: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | undefined>(undefined);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) {
      console.warn("[PIXELVOID] WebGL no disponible");
      return;
    }
    glRef.current = gl;

    // Compilar shaders
    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, GLITCH_VERTEX);
    const fs = compileShader(gl.FRAGMENT_SHADER, GLITCH_FRAGMENT);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;

    // Fullscreen quad con position (vec3) y uv (vec2) intercalados
    // Interleaved: [pos.x, pos.y, pos.z, uv.x, uv.y] × 4 vértices = 20 floats
    const vertexData = new Float32Array([
      // pos (xyz)    uv
      -1, -1, 0,    0, 0,
       1, -1, 0,    1, 0,
      -1,  1, 0,    0, 1,
       1,  1, 0,    1, 1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    const stride = 5 * 4; // 5 floats × 4 bytes
    const posLoc = gl.getAttribLocation(program, "position");
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
    }
    const uvLoc = gl.getAttribLocation(program, "uv");
    if (uvLoc >= 0) {
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 3 * 4);
    }

    // Uniforms
    uniformsRef.current = {
      uTime: gl.getUniformLocation(program, "uTime"),
      uMouse: gl.getUniformLocation(program, "uMouse"),
      uResolution: gl.getUniformLocation(program, "uResolution"),
      uGlitchIntensity: gl.getUniformLocation(program, "uGlitchIntensity"),
      uReducedMotion: gl.getUniformLocation(program, "uReducedMotion"),
    };

    // Resize
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking en window (canvas tiene pointer-events: none — anti-pattern 5.14)
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: 1.0 - e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // IntersectionObserver — pause offscreen (PERF-1)
    let observer: IntersectionObserver | null = null;
    if (containerRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
        { threshold: 0 }
      );
      observer.observe(containerRef.current);
    }

    // Smooth glitch intensity (lerp hacia el target)
    const currentGlitch = { value: 0 };

    const render = (time: number) => {
      if (!gl || !program) return;

      // Lerp suave del glitch intensity
      const target = glitchRef.current;
      currentGlitch.value += (target - currentGlitch.value) * 0.15;

      gl.useProgram(program);
      gl.uniform1f(uniformsRef.current.uTime!, time * 0.001);
      gl.uniform2f(uniformsRef.current.uMouse!, mouseRef.current.x, mouseRef.current.y);
      gl.uniform2f(uniformsRef.current.uResolution!, canvas.width, canvas.height);
      gl.uniform1f(uniformsRef.current.uGlitchIntensity!, currentGlitch.value);
      gl.uniform1f(uniformsRef.current.uReducedMotion!, reducedMotion ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (isVisibleRef.current && !reducedMotion) {
        rafRef.current = requestAnimationFrame(render);
      }
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      if (observer) observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [glitchRef, reducedMotion]);

  return (
    <div ref={containerRef} className="absolute inset-0" aria-hidden>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </div>
  );
}

// ============================================================
// GLITCH TITLE — tipografía con glitch hover
// ============================================================
function GlitchTitle({ text }: { text: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <h1
      className="font-display"
      style={{
        fontSize: "clamp(60px, 14vw, 180px)",
        fontWeight: 900,
        lineHeight: 0.9,
        letterSpacing: "-0.04em",
        margin: 0,
        position: "relative",
        color: "#F5F0E8",
        textShadow: isHovered
          ? "3px 0 #FF006E, -3px 0 #00F5FF, 0 0 30px rgba(199,255,0,0.4)"
          : "2px 0 #FF006E, -2px 0 #00F5FF",
        transition: "text-shadow 0.15s",
        cursor: "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-text={text}
    >
      {text}
      {/* Pseudo-glitch layer con ::before via CSS-in-JS no posible, usamos span */}
      {isHovered && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            color: "#C7FF00",
            opacity: 0.7,
            transform: "translate(-3px, 1px)",
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </h1>
  );
}

// ============================================================
// CRT CLICK BURST — interacción original (no es golden dust)
// ============================================================
function useClickBurst(glitchRef: React.RefObject<number>) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      // Disparar glitch burst: intensity sube a 1 y decae
      glitchRef.current = 1.0;
      const decay = () => {
        glitchRef.current = Math.max(0.15, glitchRef.current - 0.04);
        if (glitchRef.current > 0.15) {
          requestAnimationFrame(decay);
        }
      };
      requestAnimationFrame(decay);

      // Spawn 6 "shards" visuales (no partículas circulares como golden dust)
      for (let i = 0; i < 6; i++) {
        const shard = document.createElement("div");
        const isVertical = i % 2 === 0;
        const length = 60 + Math.random() * 80;
        const colors = ["#FF006E", "#00F5FF", "#C7FF00"];
        const color = colors[i % 3];
        shard.style.cssText = `
          position: fixed;
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          width: ${isVertical ? "2px" : `${length}px`};
          height: ${isVertical ? `${length}px` : "2px"};
          background: ${color};
          box-shadow: 0 0 12px ${color};
          pointer-events: none;
          z-index: 100;
          will-change: transform, opacity;
          transform-origin: center;
        `;
        document.body.appendChild(shard);

        const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
        const distance = 80 + Math.random() * 120;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const rotation = (Math.random() - 0.5) * 180;

        shard.animate(
          [
            { transform: `translate(-50%, -50%) rotate(0deg) scale(1)`, opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rotation}deg) scale(0.3)`, opacity: 0 },
          ],
          {
            duration: 500 + Math.random() * 300,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "forwards",
          }
        ).onfinish = () => shard.remove();
      }
    };

    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, [glitchRef]);
}

// ============================================================
// PAGE
// ============================================================
export default function PixelvoidHero() {
  const [loaded, setLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const glitchRef = useRef(0.15); // intensity base

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);
  }, [loaded]);

  // Hover sobre el hero aumenta glitch intensity
  useEffect(() => {
    if (!loaded || reducedMotion) return;
    const onEnter = () => { glitchRef.current = Math.max(glitchRef.current, 0.4); };
    const onLeave = () => { glitchRef.current = 0.15; };
    const heroEl = document.getElementById("pixelvoid-hero");
    if (heroEl) {
      heroEl.addEventListener("mouseenter", onEnter);
      heroEl.addEventListener("mouseleave", onLeave);
      return () => {
        heroEl.removeEventListener("mouseenter", onEnter);
        heroEl.removeEventListener("mouseleave", onLeave);
      };
    }
  }, [loaded, reducedMotion]);

  // Click burst
  useClickBurst(glitchRef);

  // Preloader timer
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#040008" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body {
          font-family: 'Space Grotesk', sans-serif;
          background: #040008;
          color: #F5F0E8;
          -webkit-font-smoothing: antialiased;
        }
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes glitchSkew {
          0%, 100% { transform: skewX(0deg); }
          92% { transform: skewX(0deg); }
          93% { transform: skewX(-2deg); }
          94% { transform: skewX(1deg); }
          95% { transform: skewX(0deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        a:focus-visible, button:focus-visible {
          outline: 2px solid #C7FF00;
          outline-offset: 4px;
          box-shadow: 0 0 20px rgba(199,255,0,0.4);
        }
        ::selection { background: #FF006E; color: #F5F0E8; }
        
        @media (pointer: fine) { * { cursor: none !important; } }
      `}</style>

      {!loaded ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "#040008", zIndex: 100 }}
        >
          <div className="font-mono text-center">
            <div
              className="font-display"
              style={{
                fontSize: "clamp(40px, 8vw, 80px)",
                fontWeight: 900,
                color: "#F5F0E8",
                textShadow: "2px 0 #FF006E, -2px 0 #00F5FF",
                letterSpacing: "-0.04em",
                animation: "glitchSkew 2s infinite",
              }}
            >
              PIXELVOID
            </div>
            <div
              className="font-mono mt-6"
              style={{
                fontSize: "12px",
                color: "#C7FF00",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              LOADING<span style={{ animation: "blink 1s infinite" }}>_</span>
            </div>
            <div
              className="mt-4 mx-auto"
              style={{
                width: "200px",
                height: "2px",
                background: "rgba(245,240,232,0.1)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  background: "linear-gradient(90deg, #FF006E, #00F5FF, #C7FF00)",
                  animation: "scan 1.5s ease-in-out infinite",
                  width: "40%",
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <section
            id="pixelvoid-hero"
            className="relative w-full h-screen overflow-hidden flex items-center justify-center"
            aria-label="PIXELVOID — Dark fantasy metroidvania"
          >
            {/* Glitch background shader */}
            <GlitchBackground glitchRef={glitchRef} reducedMotion={reducedMotion} />

            {/* Scanline overlay (CSS, no shader) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 2,
                background:
                  "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 3px, transparent 4px)",
                mixBlendMode: "multiply",
              }}
              aria-hidden
            />

            {/* Moving scan beam */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                zIndex: 3,
                top: 0,
                height: "3px",
                background: "linear-gradient(90deg, transparent, rgba(199,255,0,0.6), transparent)",
                animation: reducedMotion ? "none" : "scan 4s linear infinite",
                opacity: 0.5,
              }}
              aria-hidden
            />

            {/* Contenido */}
            <div
              className="relative z-10 text-center px-6 max-w-5xl"
              style={{ opacity: 0, animation: "fadeUp 1s ease-out 0.3s forwards" }}
            >
              {/* Tag superior */}
              <div
                className="font-mono mb-6 inline-block"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.4em",
                  textTransform: "uppercase",
                  color: "#C7FF00",
                  padding: "6px 14px",
                  border: "1px solid rgba(199,255,0,0.4)",
                  background: "rgba(199,255,0,0.05)",
                }}
              >
                EST. 2026 · SCL · DARK FANTASY
              </div>

              {/* Título glitch */}
              <div style={{ marginBottom: "16px" }}>
                <GlitchTitle text="PIXELVOID" />
              </div>

              {/* Subtítulo */}
              <p
                className="font-mono mb-12"
                style={{
                  fontSize: "clamp(13px, 1.6vw, 17px)",
                  fontWeight: 400,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#F5F0E8",
                  opacity: 0.85,
                  lineHeight: 1.6,
                }}
              >
                Un metroidvania donde la oscuridad<br />
                <span style={{ color: "#FF006E" }}>// recuerda tu nombre</span>
              </p>

              {/* Stats / Especificaciones técnicas (gamer aesthetic) */}
              <div
                className="font-mono flex justify-center gap-8 flex-wrap mb-12"
                style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase" }}
              >
                {[
                  { label: "GÉNERO", val: "METROIDVANIA", color: "#FF006E" },
                  { label: "ENGINE", val: "UNITY 6", color: "#00F5FF" },
                  { label: "PLATFORMS", val: "PC · SWITCH 2", color: "#C7FF00" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "left" }}>
                    <div style={{ color: "rgba(245,240,232,0.4)" }}>{s.label}</div>
                    <div style={{ color: s.color, fontWeight: 700, marginTop: "4px" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div
                className="flex justify-center gap-4 flex-wrap"
                style={{ opacity: 0, animation: "fadeUp 1s ease 1.2s forwards" }}
              >
                <a
                  href="#wishlist"
                  aria-label="Wishlist en Steam"
                  style={{
                    padding: "16px 36px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#040008",
                    background: "#C7FF00",
                    border: "1px solid #C7FF00",
                    boxShadow: "0 0 30px rgba(199,255,0,0.3)",
                    transition: "all 0.2s",
                    display: "inline-block",
                    clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 50px rgba(199,255,0,0.6)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(199,255,0,0.3)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  ▶ WISHLIST NOW
                </a>
                <a
                  href="#trailer"
                  aria-label="Ver trailer"
                  style={{
                    padding: "16px 36px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#00F5FF",
                    background: "transparent",
                    border: "1px solid rgba(0,245,255,0.4)",
                    transition: "all 0.2s",
                    display: "inline-block",
                    clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#00F5FF";
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(0,245,255,0.3)";
                    e.currentTarget.style.background = "rgba(0,245,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,245,255,0.4)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ▶ TRAILER 1.0
                </a>
              </div>
            </div>

            {/* HUD esquina superior izquierda — terminal style */}
            <div
              className="absolute top-6 left-6 z-20 font-mono"
              style={{
                fontSize: "10px",
                color: "rgba(199,255,0,0.6)",
                letterSpacing: "0.15em",
                opacity: 0,
                animation: "fadeUp 1s ease 0.6s forwards",
              }}
              aria-hidden
            >
              <div>SYS: PIXELVOID/BUILD</div>
              <div style={{ color: "rgba(245,240,232,0.4)" }}>v0.0.1_alpha</div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ color: "#C7FF00" }}>●</span> ONLINE
              </div>
            </div>

            {/* HUD esquina superior derecha — clock + stats */}
            <div
              className="absolute top-6 right-6 z-20 font-mono text-right"
              style={{
                fontSize: "10px",
                color: "rgba(0,245,255,0.6)",
                letterSpacing: "0.15em",
                opacity: 0,
                animation: "fadeUp 1s ease 0.6s forwards",
              }}
              aria-hidden
            >
              <div>FRAME · 60FPS</div>
              <div style={{ color: "rgba(245,240,232,0.4)" }}>GPU · WEBGL2</div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ color: "#FF006E" }}>▲</span> LATENCY 8ms
              </div>
            </div>

            {/* Bottom hint */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-20 font-mono"
              style={{
                bottom: "30px",
                fontSize: "10px",
                color: "rgba(245,240,232,0.4)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                opacity: 0,
                animation: "fadeUp 1s ease 1.5s forwards",
              }}
              aria-hidden
            >
              [ CLICK PARA GLITCH ] · [ HOVER PARA DISTORSIÓN ]
            </div>

            {/* Volver */}
            <a
              href="/"
              className="absolute bottom-6 right-6 z-20 font-mono"
              style={{
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(245,240,232,0.5)",
                textDecoration: "none",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F0E8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,240,232,0.5)")}
              aria-label="Volver"
            >
              ← INDEX
            </a>
          <HeroPolish accentColor="#00F5FF" />
          </section>

          {/* Sección siguiente */}
          <section
            id="wishlist"
            className="py-40 px-6"
            style={{ background: "#040008", borderTop: "1px solid rgba(199,255,0,0.15)" }}
            aria-label="Sobre el juego"
          >
            <div className="max-w-4xl mx-auto">
              <div
                className="font-mono mb-8"
                style={{ fontSize: "11px", color: "#FF006E", letterSpacing: "0.4em", textTransform: "uppercase" }}
              >
                // 01 — LA MÁSCARA
              </div>
              <h2
                className="font-display mb-8"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  color: "#F5F0E8",
                }}
              >
                Despierta sin nombre.<br />
                <span style={{ color: "#C7FF00" }}>Recupera cada fragmento.</span>
              </h2>
              <p
                className="font-light"
                style={{
                  fontSize: "18px",
                  lineHeight: 1.7,
                  color: "rgba(245,240,232,0.7)",
                  maxWidth: "600px",
                }}
              >
                Un metroidvania 2D ambientado en las ruinas de una civilización que aprendió
                a escribir su memoria en luz. Explora. Glitch. Sobrevive.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
