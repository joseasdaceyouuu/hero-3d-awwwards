"use client";

/**
 * CINEFEST — Hero para festival de cine independiente.
 *
 * Brief: "Hero para festival de cine independiente. Sensación de proyección
 * analógica, película 16mm. Paleta sepia/ámbar. Tipografía serif
 * cinematográfica. Sin WebGL."
 *
 * PATRONES RECUPERADOS DE MEMORIA (Stage 1):
 *   - Letter reveal secuencial → título "CINEFEST" letra por letra
 *   - Mouse glow con mix-blend-mode: screen → glow ámbar suave
 *   - Partículas con conexiones → adaptado a "polvo de proyector"
 *   - Paleta cálida (como MÉRIDA granate/oro pero sepia/ámbar)
 *
 * ADAPTACIÓN ORIGINAL (no copia):
 *   - Film grain animation (estética 16mm) — patrón 1.18 adaptado
 *   - Flicker de proyector analógico (CSS animation)
 *   - Letterbox bars cinematográficas (estilo PROFUNDIDAD)
 *   - Layout D: full-bleed visual con texto overlay
 *   - Paleta sepia/ámbar (#D4A05E + #8B6914 + #1A0F08) — NO granate
 *   - Tipografía Cormorant Garamond (serif cinematográfico)
 *   - "Polvo de proyector": partículas que suben como en un haz de luz
 *
 * ANTI-PATTERNS APLICADOS (de memoria):
 *   - 5.9: overflow-x: clip (no hidden)
 *   - 5.13: as="span" en LetterReveal (no anidar h1)
 *   - 5.14: window.addEventListener para mouse (canvas pointer-events: none)
 *   - 5.18: Preloader con timer (useEffect + setTimeout)
 *
 * Arquetipo: 2.5D Parallax (capas CSS) + Shaders visuales (film grain)
 * Stack: CSS 3D + Canvas 2D (sin WebGL, como pide el brief)
 * Layout: D (full-bleed visual con overlay)
 */

import { useState, useEffect, useRef } from "react";
import { LetterReveal } from "@/lib/library/components/LetterReveal";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// PROJECTOR DUST — polvo de proyector subiendo en haz de luz
// Adaptación de ConnectedParticles + WineDroplets invertido
// ============================================================
function ProjectorDust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

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

    // Partículas de polvo — suben como en un haz de proyector
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: -(0.1 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 0.15,
      size: 0.5 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.3,
      flicker: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      time += 0.01;

      for (const p of particles) {
        if (!reducedMotion) {
          p.y += p.vy;
          p.x += p.vx + Math.sin(time + p.flicker) * 0.2;
          p.flicker += 0.02;

          // Reset si sale arriba
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        }

        // Flicker analógico — opacidad oscila como proyector viejo
        const flickerOpacity = p.opacity * (0.7 + Math.sin(p.flicker * 3) * 0.3);

        // Polvo ámbar/sepia
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, `rgba(212, 160, 94, ${flickerOpacity})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      if (!reducedMotion) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
        zIndex: 2,
      }}
    />
  );
}

// ============================================================
// PAGE
// ============================================================
export default function CinefestHero() {
  const [loaded, setLoaded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Preloader timer (anti-pattern 5.18)
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(t);
  }, [loaded]);

  // Scroll choreography
  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);
    const onScroll = () => {
      const p = Math.min(window.scrollY / window.innerHeight, 1);
      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(1 - p * 1.2);
        overlayRef.current.style.transform = `translateY(${-p * 50}px) scale(${1 - p * 0.05})`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#1A0F08" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body { font-family: 'Inter', sans-serif; background: #1A0F08; color: #F5E6D3; }
        .font-serif { font-family: 'Cormorant Garamond', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lineExpand {
          from { opacity: 0; transform: scaleX(0); }
          to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.3; transform: scaleY(0.5); transform-origin: top; }
          50% { opacity: 1; transform: scaleY(1); transform-origin: top; }
        }
        @keyframes grain {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-3px, 3px); }
          100% { transform: translate(3px, -3px); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          3% { opacity: 0.85; }
          6% { opacity: 1; }
          7% { opacity: 0.9; }
          8% { opacity: 1; }
          50% { opacity: 0.95; }
          51% { opacity: 1; }
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes load { to { width: 100%; } }

        a:focus-visible { outline: 2px solid #D4A05E; outline-offset: 4px; }
        ::selection { background: #D4A05E; color: #1A0F08; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#1A0F08",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            className="font-serif italic"
            style={{
              fontSize: "20px",
              color: "#D4A05E",
              letterSpacing: "0.3em",
              marginBottom: "20px",
            }}
          >
            CINEFEST
          </div>
          <div
            style={{
              width: "250px",
              height: "1px",
              background: "rgba(212,160,94,0.15)",
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
                width: "0%",
                background: "#D4A05E",
                animation: "load 2s ease-in-out forwards",
              }}
            />
          </div>
        </div>
      )}

      {loaded && (
        <>
          <section
            className="relative w-full h-screen overflow-hidden flex items-center justify-center"
            aria-label="CINEFEST — Festival de Cine Independiente"
            style={{ animation: "flicker 4s ease-in-out infinite" }}
          >
            {/* Capa 1: Fondo sepia radial (full-bleed) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,160,94,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(139,105,20,0.08) 0%, transparent 60%), #1A0F08",
              }}
              aria-hidden
            />

            {/* Capa 2: Polvo de proyector (Canvas 2D) */}
            <ProjectorDust />

            {/* Capa 3: Film grain (estética 16mm) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 3,
                opacity: 0.08,
                pointerEvents: "none",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                animation: "grain 0.15s steps(2) infinite",
              }}
              aria-hidden
            />

            {/* Capa 4: Scan line sutil */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(212,160,94,0.3), transparent)",
                zIndex: 4,
                animation: "scan 6s linear infinite",
                pointerEvents: "none",
              }}
              aria-hidden
            />

            {/* Capa 5: Vignette cinematográfico */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 5,
                background: "radial-gradient(ellipse at center, transparent 30%, rgba(26,15,8,0.8) 100%)",
                pointerEvents: "none",
              }}
              aria-hidden
            />

            {/* Contenido overlay (Layout D: full-bleed con overlay) */}
            <div
              ref={overlayRef}
              className="relative z-10 text-center px-6 max-w-4xl"
            >
              {/* Tag superior */}
              <div
                className="font-serif italic mb-8"
                style={{
                  fontSize: "15px",
                  fontWeight: 400,
                  color: "#D4A05E",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards",
                }}
              >
                XV Edición · 2026 · Santiago
              </div>

              {/* Título con letter reveal */}
              <h1 className="font-serif mb-3" style={{ margin: 0 }}>
                <LetterReveal
                  as="span"
                  text="CINEFEST"
                  variant="reveal"
                  baseDelay={0.6}
                  stagger={0.1}
                  duration={1.4}
                  style={{
                    fontSize: "clamp(60px, 12vw, 150px)",
                    fontWeight: 500,
                    lineHeight: 0.95,
                    letterSpacing: "0.04em",
                    color: "#F5E6D3",
                    textShadow:
                      "0 0 60px rgba(212,160,94,0.4), 0 0 120px rgba(139,105,20,0.2)",
                  }}
                />
              </h1>

              {/* Subtítulo */}
              <p
                className="font-serif italic mb-10"
                style={{
                  fontSize: "clamp(18px, 2.2vw, 26px)",
                  fontWeight: 400,
                  color: "#D4A05E",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.8s forwards",
                }}
              >
                Cine independiente · 16mm · Analógico
              </p>

              {/* Deco-line */}
              <div
                className="mx-auto mb-12"
                style={{
                  width: "70px",
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, #D4A05E, transparent)",
                  opacity: 0,
                  transform: "scaleX(0)",
                  animation: "lineExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 2.1s forwards",
                }}
                aria-hidden
              />

              {/* Quote cinematográfico */}
              <p
                className="font-serif italic mx-auto mb-14"
                style={{
                  fontSize: "clamp(16px, 1.8vw, 22px)",
                  fontWeight: 400,
                  lineHeight: 1.7,
                  color: "rgba(245,230,211,0.7)",
                  maxWidth: "480px",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2.3s forwards",
                }}
              >
                <span style={{ color: "#8B6914", opacity: 0.6, marginRight: "4px" }}>&ldquo;</span>
                El cine no se trata de imágenes,
                <br />
                se trata de la luz que las atraviesa.
                <span style={{ color: "#8B6914", opacity: 0.6, marginLeft: "4px" }}>&rdquo;</span>
              </p>

              {/* Stats del festival */}
              <div
                className="flex justify-center gap-10 flex-wrap mb-14"
                style={{
                  opacity: 0,
                  animation: "fadeUp 1.2s ease 2.5s forwards",
                }}
              >
                {[
                  { val: "48", label: "PELÍCULAS", color: "#D4A05E" },
                  { val: "12", label: "PAÍSES", color: "#8B6914" },
                  { val: "7", label: "DÍAS", color: "#D4A05E" },
                  { val: "3", label: "SEDES", color: "#8B6914" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div
                      className="font-serif"
                      style={{
                        fontSize: "28px",
                        fontWeight: 600,
                        color: s.color,
                        lineHeight: 1,
                        marginBottom: "6px",
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        color: "rgba(245,230,211,0.4)",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div
                className="flex justify-center gap-5 flex-wrap"
                style={{
                  opacity: 0,
                  animation: "fadeUp 1.2s ease 2.7s forwards",
                }}
              >
                <a
                  href="#programacion"
                  aria-label="Ver programación"
                  style={{
                    padding: "16px 38px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#1A0F08",
                    background: "#D4A05E",
                    border: "1px solid #D4A05E",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F5E6D3";
                    e.currentTarget.style.boxShadow = "0 0 40px rgba(212,160,94,0.4)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#D4A05E";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Ver Programación
                </a>
                <a
                  href="#entradas"
                  aria-label="Comprar entradas"
                  style={{
                    padding: "16px 38px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#D4A05E",
                    background: "transparent",
                    border: "1px solid rgba(212,160,94,0.4)",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#D4A05E";
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(212,160,94,0.2)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(212,160,94,0.4)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Comprar Entradas
                </a>
              </div>
            </div>

            {/* Scroll indicator */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5"
              style={{
                bottom: "40px",
                zIndex: 10,
                opacity: 0,
                animation: "fadeUp 1s ease 3s forwards",
              }}
              aria-hidden
            >
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.4em",
                  textTransform: "uppercase",
                  color: "rgba(212,160,94,0.5)",
                }}
              >
                Descubrir
              </span>
              <div
                style={{
                  width: "1px",
                  height: "45px",
                  background: "linear-gradient(to bottom, #D4A05E, transparent)",
                  animation: "scrollPulse 2.5s ease-in-out infinite",
                }}
              />
            </div>

            {/* HUD esquina superior izquierda */}
            <div
              className="absolute top-6 left-6 z-20 opacity-0"
              style={{ animation: "fadeUp 1.2s ease 1.8s forwards" }}
              aria-hidden
            >
              <div
                className="font-mono uppercase tracking-widest"
                style={{ fontSize: "9px", color: "rgba(212,160,94,0.5)" }}
              >
                <div>REEL · 16MM</div>
                <div>24 FPS</div>
                <div style={{ marginTop: "8px", color: "rgba(139,105,20,0.7)" }}>
                  ● PROYECTANDO
                </div>
              </div>
            </div>

            {/* HUD esquina superior derecha */}
            <div
              className="absolute top-6 right-6 z-20 text-right opacity-0"
              style={{ animation: "fadeUp 1.2s ease 1.8s forwards" }}
              aria-hidden
            >
              <div
                className="font-mono uppercase tracking-widest"
                style={{ fontSize: "9px", color: "rgba(212,160,94,0.5)" }}
              >
                <div>EDICIÓN · XV</div>
                <div>2026</div>
                <div style={{ marginTop: "8px", color: "rgba(139,105,20,0.7)" }}>
                  SCL · CHILE
                </div>
              </div>
            </div>

            {/* Volver */}
            <a
              href="/heroes"
              className="absolute bottom-6 right-6 z-20 font-mono"
              style={{
                fontSize: "9px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(245,230,211,0.3)",
                textDecoration: "none",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A05E")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,230,211,0.3)")}
              aria-label="Volver a galería"
            >
              ← Galería
            </a>
          <HeroPolish accentColor="#8B6914" />
          </section>

          {/* Sección siguiente */}
          <section
            id="programacion"
            className="py-40 px-6 text-center"
            style={{ background: "#1A0F08", borderTop: "1px solid rgba(212,160,94,0.1)" }}
            aria-label="Programación"
          >
            <div className="max-w-3xl mx-auto">
              <span
                className="block mb-10"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  color: "#D4A05E",
                }}
              >
                01 — Programación
              </span>
              <h2
                className="font-serif font-light mb-12"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                  lineHeight: 1.1,
                  color: "#F5E6D3",
                  letterSpacing: "-0.02em",
                }}
              >
                48 películas.
                <br />
                <span style={{ color: "#8B6914", fontStyle: "italic" }}>
                  12 países. Una sala.
                </span>
              </h2>
              <p
                className="font-light mx-auto"
                style={{
                  fontSize: "18px",
                  lineHeight: 1.8,
                  color: "rgba(245,230,211,0.6)",
                  maxWidth: "500px",
                }}
              >
                Selección oficial de cine independiente proyectado en formato
                analógico 16mm. Cada función es única: la luz, el polvo, el
                sonido mecánico del proyector son parte de la experiencia.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
