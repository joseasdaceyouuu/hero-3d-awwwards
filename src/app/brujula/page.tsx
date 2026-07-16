"use client";

/**
 * BRÚJULA — Hero split izquierda/derecha (Layout B).
 *
 * Diversidad estructural: NO usa layout centrado (como VERVAIN/MÉRIDA/CAFE).
 * Título y contenido a la IZQUIERDA, visual/canvas a la DERECHA.
 *
 * Brief: Agencia de viajes de aventura en Patagonia. Paleta azul hielo +
 * blanco + verde bosque. Tipografía sans-serif bold. Sin WebGL.
 *
 * Patrones aplicados:
 *   - LetterReveal (de memoria, adaptado a sans-serif bold)
 *   - Canvas 2D con brújula animada + partículas nieve (custom, no registry)
 *   - Layout B: split 60/40 (contenido/visual)
 *   - HUD: bottom strip horizontal (no esquinas)
 *   - CTA: dos botones lado a lado alineados a la izquierda
 */

import { useState, useEffect, useRef } from "react";
import { LetterReveal } from "@/lib/library/components/LetterReveal";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// COMPASS CANVAS — brújula animada + partículas nieve
// ============================================================
function CompassCanvas({ accentColor = "#7BA7BC" }: { accentColor?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Partículas de nieve
    const snowflakes = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.2 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.4,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.01;

      // Brújula central
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.32;

      // Círculos concéntricos
      ctx.strokeStyle = "rgba(123,167,188,0.2)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (radius * i) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Marcas cardinales
      ctx.strokeStyle = "rgba(245,240,232,0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 360; i += 15) {
        const rad = (i * Math.PI) / 180;
        const inner = i % 90 === 0 ? radius * 0.85 : radius * 0.92;
        const outer = radius;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(cx + Math.cos(rad) * outer, cy + Math.sin(rad) * outer);
        ctx.stroke();
      }

      // Letras N E S O
      ctx.fillStyle = "rgba(245,240,232,0.5)";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", cx, cy - radius - 18);
      ctx.fillText("E", cx + radius + 18, cy);
      ctx.fillText("S", cx, cy + radius + 18);
      ctx.fillText("O", cx - radius - 18, cy);

      // Aguja que sigue al mouse sutilmente
      const dx = mouseRef.current.x - cx;
      const dy = mouseRef.current.y - cy;
      let needleAngle = Math.atan2(dy, dx) + Math.PI / 2;
      if (mouseRef.current.x < 0) needleAngle = -time * 0.3; // rotación lenta si no hay mouse

      // Aguja roja (Norte)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(needleAngle);
      ctx.fillStyle = "#C84B3E";
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.8);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, radius * 0.3);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      // Aguja blanca (Sur)
      ctx.fillStyle = "rgba(245,240,232,0.7)";
      ctx.beginPath();
      ctx.moveTo(0, radius * 0.8);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, -radius * 0.3);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Centro
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Nieve
      ctx.fillStyle = "rgba(245,240,232,0.6)";
      for (const s of snowflakes) {
        if (!reducedMotion) {
          s.y += s.vy;
          s.x += s.vx + Math.sin(time + s.y * 0.01) * 0.2;
          if (s.y > height) {
            s.y = -5;
            s.x = Math.random() * width;
          }
        }
        ctx.globalAlpha = s.opacity;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reducedMotion) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [accentColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

// ============================================================
// PAGE — Layout B: Split izquierda/derecha
// ============================================================
export default function BrujulaHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#0B1F2A" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body { font-family: 'Inter', sans-serif; background: #0B1F2A; color: #F5F0E8; }
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        @keyframes fadeLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        a:focus-visible { outline: 2px solid #7BA7BC; outline-offset: 4px; }
      `}</style>

      {!loaded ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "#0B1F2A", zIndex: 100 }}
        >
          <div className="font-display" style={{ fontSize: "20px", color: "#7BA7BC", letterSpacing: "0.4em" }}>
            BRÚJULA
          </div>
        </div>
      ) : (
        <section
          className="relative w-full h-screen flex"
          aria-label="BRÚJULA — Viajes de aventura en Patagonia"
        >
          {/* LADO IZQUIERDO: contenido (60%) */}
          <div
            className="flex flex-col justify-center px-16"
            style={{
              width: "60%",
              zIndex: 10,
              animation: "fadeLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both",
            }}
          >
            {/* Tag superior alineado izquierda */}
            <div
              className="font-mono mb-8"
              style={{
                fontSize: "11px",
                color: "#7BA7BC",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              50°S · 73°O · PATAGONIA
            </div>

            {/* Título alineado izquierda — Layout B no centrado */}
            <h1 className="font-display" style={{ margin: 0 }}>
              <LetterReveal
                as="span"
                text="BRÚJULA"
                variant="reveal"
                baseDelay={0.5}
                stagger={0.09}
                duration={1.2}
                style={{
                  fontSize: "clamp(60px, 10vw, 130px)",
                  fontWeight: 700,
                  lineHeight: 0.9,
                  letterSpacing: "-0.03em",
                  color: "#F5F0E8",
                  display: "block",
                  textAlign: "left",
                }}
              />
            </h1>

            {/* Subtítulo alineado izquierda */}
            <p
              className="font-display mt-4 mb-10"
              style={{
                fontSize: "clamp(18px, 2vw, 24px)",
                fontWeight: 300,
                color: "#7BA7BC",
                lineHeight: 1.4,
                maxWidth: "440px",
                opacity: 0,
                animation: "fadeLeft 1s ease 1.4s forwards",
              }}
            >
              Viajes de aventura en la última frontera.
              <br />
              <span style={{ color: "rgba(245,240,232,0.6)" }}>
                Expediciones a medida, guiadas por quienes conocen cada valle.
              </span>
            </p>

            {/* Stats horizontales (no grid centrado) */}
            <div
              className="flex gap-10 mb-12"
              style={{
                opacity: 0,
                animation: "fadeLeft 1s ease 1.7s forwards",
              }}
            >
              {[
                { val: "12", label: "AÑOS" },
                { val: "47", label: "RUTAS" },
                { val: "100%", label: "GUIAS LOCALES" },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    className="font-display"
                    style={{
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#7BA7BC",
                      lineHeight: 1,
                    }}
                  >
                    {s.val}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.2em",
                      color: "rgba(245,240,232,0.4)",
                      marginTop: "4px",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs alineados izquierda (no centrados) */}
            <div
              className="flex gap-4"
              style={{
                opacity: 0,
                animation: "fadeLeft 1s ease 2s forwards",
              }}
            >
              <a
                href="#expediciones"
                aria-label="Ver expediciones"
                style={{
                  padding: "16px 36px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: "#0B1F2A",
                  background: "#F5F0E8",
                  display: "inline-block",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#7BA7BC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F5F0E8";
                }}
              >
                Ver Expediciones
              </a>
              <a
                href="#contacto"
                aria-label="Contactar"
                style={{
                  padding: "16px 36px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: "#7BA7BC",
                  background: "transparent",
                  border: "1px solid rgba(123,167,188,0.4)",
                  display: "inline-block",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#7BA7BC";
                  e.currentTarget.style.background = "rgba(123,167,188,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(123,167,188,0.4)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Hablar con Guía
              </a>
            </div>
          </div>

          {/* LADO DERECHO: visual (40%) */}
          <div
            className="relative"
            style={{
              width: "40%",
              background: "linear-gradient(135deg, #0B1F2A 0%, #1A3A4A 100%)",
              borderLeft: "1px solid rgba(123,167,188,0.15)",
              animation: "fadeRight 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both",
            }}
          >
            <CompassCanvas accentColor="#7BA7BC" />

            {/* Coordenadas en esquinas del visual (HUD minimalista) */}
            <div
              className="absolute font-mono"
              style={{
                top: "30px",
                right: "30px",
                fontSize: "10px",
                color: "rgba(123,167,188,0.6)",
                letterSpacing: "0.15em",
                textAlign: "right",
              }}
              aria-hidden
            >
              <div>LAT 50°56&apos;S</div>
              <div>LON 73°24&apos;O</div>
              <div style={{ marginTop: "6px", color: "rgba(245,240,232,0.3)" }}>
                TORRES DEL PAINE
              </div>
            </div>

            <div
              className="absolute font-mono"
              style={{
                bottom: "30px",
                right: "30px",
                fontSize: "10px",
                color: "rgba(123,167,188,0.5)",
                letterSpacing: "0.15em",
                textAlign: "right",
              }}
              aria-hidden
            >
              <div>VIENTO · 32 KM/H</div>
              <div>TEMP · -4°C</div>
              <div style={{ marginTop: "6px", color: "rgba(200,75,62,0.7)" }}>
                ● CONDICIÓN EXTREMA
              </div>
            </div>
          </div>

          {/* HUD bottom strip horizontal (no esquinas) */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-16 py-5"
            style={{
              background: "rgba(11,31,42,0.8)",
              borderTop: "1px solid rgba(123,167,188,0.15)",
              backdropFilter: "blur(10px)",
              zIndex: 20,
              opacity: 0,
              animation: "fadeLeft 1s ease 2.3s forwards",
            }}
            aria-hidden
          >
            <div
              className="font-mono"
              style={{
                fontSize: "10px",
                color: "rgba(245,240,232,0.4)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              EST. 2014 · PUERTO NATALES · CHILE
            </div>
            <a
              href="/heroes"
              className="font-mono"
              style={{
                fontSize: "10px",
                color: "rgba(123,167,188,0.5)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              ← GALERÍA
            </a>
          </div>
          <HeroPolish accentColor="#C84B3E" />
        </section>
      )}
    </main>
  );
}
