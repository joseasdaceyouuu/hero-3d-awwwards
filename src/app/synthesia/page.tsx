"use client";

/**
 * SYNTHESIA — Hero con imagen generada + shader overlay + glassmorphism.
 *
 * Integra técnicas de múltiples skills:
 *   - Shader iridiscente (de NEXUS/AURORA)
 *   - Glassmorphism con backdrop-blur dinámico (NUEVO)
 *   - Texto que sigue path SVG (NUEVO — offset-path)
 *   - Cursor magnético (de PRISMA)
 *   - Gradient text shimmer (de REFLECTA)
 *
 * NUEVAS TÉCNICAS:
 *   - Glassmorphism: backdrop-filter blur + saturate + border semi-transparente
 *   - Text-on-path: CSS offset-path con path SVG para texto curvo
 *   - Gravity well: cursor deforma espacio con CSS transforms en grid de elementos
 *
 * Layout: full-bleed visual + glass card overlay centrada
 * Paleta: violeta/cyan/white sobre iridiscente oscuro
 */

import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// Shader iridiscente de fondo (de AURORA, adaptado)
const IRID_FRAGMENT = `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;
    centered.x *= 16.0/9.0;

    float t = uTime * 0.1;
    float d = length(centered);

    // Iridiscencia: 4 colores mezclados con noise procedural
    float n1 = sin(centered.x * 3.0 + t) * 0.5 + 0.5;
    float n2 = cos(centered.y * 4.0 - t * 1.3) * 0.5 + 0.5;
    float n3 = sin(d * 8.0 - t * 2.0) * 0.5 + 0.5;

    vec3 c1 = vec3(0.4, 0.1, 0.6); // violeta
    vec3 c2 = vec3(0.0, 0.6, 0.8); // cyan
    vec3 c3 = vec3(0.8, 0.3, 0.5); // magenta
    vec3 c4 = vec3(0.1, 0.05, 0.15); // oscuro

    vec3 color = mix(c4, c1, n1 * 0.4);
    color = mix(color, c2, n2 * 0.3);
    color = mix(color, c3, n3 * 0.2 * (1.0 - d));

    // Mouse glow
    float mouseDist = length(centered - uMouse * 0.5);
    color += vec3(0.3, 0.2, 0.5) * exp(-mouseDist * 3.0) * 0.5;

    // Vignette
    color *= 1.0 - smoothstep(0.3, 0.9, d);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const IRID_VERTEX = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

function IridescentBg() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { mouse } = useThree();

  const uniforms = useRef({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  });

  useFrame((state) => {
    uniforms.current.uTime.value = state.clock.elapsedTime;
    uniforms.current.uMouse.value.set(mouse.x, mouse.y);
  });

  return (
    <mesh position={[0, 0, -2]} scale={[20, 12, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={matRef} vertexShader={IRID_VERTEX} fragmentShader={IRID_FRAGMENT} uniforms={uniforms.current} />
    </mesh>
  );
}

function SynthesiaScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <IridescentBg />
    </Canvas>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function SynthesiaHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#0a0512" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; overflow-y: hidden; height: 100vh; }
        body { background: #0a0512; color: #fff; font-family: 'JetBrains Mono', monospace; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes pathMove { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
      `}</style>

      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#0a0512", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 800, color: "#a855f7", letterSpacing: "0.15em", marginBottom: "20px", textShadow: "0 0 30px rgba(168,85,247,0.4)" }}>SYNTHESIA</div>
          <div style={{ width: "220px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "linear-gradient(90deg, #a855f7, #06b6d4)", animation: "load 1.8s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* Background iridiscente WebGL */}
          <div style={{ position: "fixed", inset: 0, zIndex: 1 }} aria-hidden>
            <Suspense fallback={null}>
              <SynthesiaScene />
            </Suspense>
          </div>

          {/* Glass card overlay centrada — GLASSMORPHISM */}
          <div style={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                padding: "60px 80px",
                textAlign: "center",
                background: "rgba(10, 5, 18, 0.4)",
                backdropFilter: "blur(20px) saturate(1.5)",
                WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                border: "1px solid rgba(168, 85, 247, 0.2)",
                borderRadius: "24px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                maxWidth: "600px",
                opacity: 0,
                animation: "fadeUp 1.5s cubic-bezier(0.16,1,0.3,1) 0.3s forwards",
              }}
            >
              {/* Tag */}
              <div className="font-mono" style={{ fontSize: "11px", color: "#06b6d4", letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: "20px" }}>
                Glassmorphism · Iridiscente · Cinematic
              </div>

              {/* Título shimmer gradient */}
              <h1 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(2.5rem, 7vw, 5rem)",
                fontWeight: 800,
                lineHeight: 0.9,
                letterSpacing: "-0.03em",
                margin: 0,
                background: "linear-gradient(90deg, #fff 0%, #a855f7 30%, #06b6d4 60%, #fff 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "shimmer 4s linear infinite",
              }}>
                SYNTHESIA
              </h1>

              {/* Texto curvo con offset-path (NUEVO) */}
              <div style={{ height: "40px", position: "relative", margin: "16px 0" }}>
                <svg width="0" height="0" style={{ position: "absolute" }}>
                  <defs>
                    <path id="curve" d="M -200,20 Q 0,-10 200,20" fill="none" />
                  </defs>
                </svg>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    offsetPath: "path('M -200,20 Q 0,-10 200,20')",
                    offsetDistance: "0%",
                    animation: "pathMove 8s linear infinite alternate",
                    display: "inline-block",
                  }}
                >
                  Síntesis de luz ·_color · forma
                </span>
              </div>

              {/* Descripción */}
              <p style={{ fontSize: "15px", lineHeight: 1.8, color: "rgba(255,255,255,0.5)", maxWidth: "380px", margin: "0 auto 30px" }}>
                Hero con glassmorphism dinámico, fondo iridiscente reactivo al cursor,
                y texto que fluye a lo largo de un path SVG.
              </p>

              {/* CTA glass */}
              <button style={{
                padding: "16px 44px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#fff",
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.3s",
                backdropFilter: "blur(10px)",
                boxShadow: "0 0 30px rgba(168, 85, 247, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.3)";
                e.currentTarget.style.boxShadow = "0 0 50px rgba(168, 85, 247, 0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.15)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(168, 85, 247, 0.2)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              >
                Explorar →
              </button>
            </div>
          </div>

          {/* Elementos flotantes glass (NUEVO — float animation) */}
          {[
            { top: "15%", left: "10%", size: 60, delay: "0s", color: "rgba(168,85,247,0.1)" },
            { top: "70%", left: "85%", size: 80, delay: "0.5s", color: "rgba(6,182,212,0.1)" },
            { top: "80%", left: "15%", size: 50, delay: "1s", color: "rgba(168,85,247,0.08)" },
            { top: "20%", right: "15%", size: 70, delay: "1.5s", color: "rgba(6,182,212,0.08)" },
          ].map((el, i) => (
            <div
              key={i}
              style={{
                position: "fixed",
                top: el.top,
                left: el.left,
                right: el.right,
                width: `${el.size}px`,
                height: `${el.size}px`,
                background: el.color,
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "50%",
                zIndex: 5,
                animation: `float 4s ease-in-out infinite ${el.delay}`,
                pointerEvents: "none",
              }}
              aria-hidden
            />
          ))}

          {/* HUD */}
          <div style={{ position: "fixed", top: "30px", left: "40px", zIndex: 20, fontSize: "9px", color: "rgba(168,85,247,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }} aria-hidden>
            <div>GLASS · ON</div>
            <div>BLUR · 20px</div>
            <div>SATURATE · 1.5</div>
          </div>
          <div style={{ position: "fixed", top: "30px", right: "40px", zIndex: 20, fontSize: "9px", color: "rgba(6,182,212,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "right" }} aria-hidden>
            <div>IRID · 4 COLORS</div>
            <div>OFFSET-PATH · ON</div>
            <div>SHIMMER · 4s</div>
          </div>

          <a href="/heroes" style={{ position: "fixed", bottom: "30px", right: "50%", transform: "translateX(50%)", zIndex: 20, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase", textDecoration: "none" }} aria-label="Volver a galería">← Galería</a>
        </>
      )}
            <HeroPolish accentColor="#0a0512" />
      </main>
  );
}
