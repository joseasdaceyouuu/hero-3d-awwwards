"use client";

/**
 * MÉRIDA — Hero cinematográfico para vino premium chileno.
 *
 * 4TO HERO — VALIDACIÓN DEL CICLO DE APRENDIZAJE.
 *
 * PATRONES RECUPERADOS DE LA MEMORIA (via LLMKeywordEmbedder):
 *
 * De VERVAIN (relevance 0.690):
 *   - Letter reveal secuencial (1.4f) → título "MÉRIDA" letra por letra
 *   - Deco-line con gradient expansión (1.4j)
 *   - Loader 0% cinematográfico (1.4k)
 *   - Mouse glow con mix-blend-mode: screen (1.4h)
 *
 * De PROFUNDIDAD (relevance 0.690):
 *   - Burst orgánico al cruzar capa (1.4d) → adaptado a gotas de vino
 *   - Cinematográfico + scroll choreography
 *
 * De PIXELVOID (relevance 0.690):
 *   - HUD con stats técnicos (adaptado a vino: añada, terroir, altitud)
 *
 * ADAPTACIÓN ORIGINAL (no copia literal):
 *   - Paleta granate/oro (vino tinto Andes, no oro/negro editorial)
 *   - Partículas tipo GOTAS que caen (no polvo dorado ni glitch)
 *   - Tipografía Playfair Display (serif pero distinta a Cormorant del VERVAIN)
 *   - Mouse glow en tono granate (no oro)
 *   - Scroll choreography: el "vino" cae desde arriba al hacer scroll
 *
 * Anti-patterns aplicados (recuperados de memoria):
 *   - 5.9: overflow-x: clip (no rompe sticky)
 *   - 5.13: as="span" en LetterReveal (no anidar h1)
 *   - 5.14: window.addEventListener para mouse (canvas pointer-events: none)
 *
 * Brief original: "Hero cinematográfico para marca de vino premium chileno
 * con profundidad visual y tipografía serif elegante"
 */

import { useState, useEffect, useRef } from "react";
import { LetterReveal } from "@/lib/library/components/LetterReveal";
import { MouseGlow } from "@/lib/library/components/MouseGlow";
import { Preloader } from "@/lib/library/components/Preloader";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// WINE DROPLETS — adaptación del patrón "Golden dust" + "Connected particles"
// ============================================================
function WineDroplets({ accentColor = "#8B1A2B" }: { accentColor?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropletsRef = useRef<
    Array<{
      x: number;
      y: number;
      vy: number;
      size: number;
      opacity: number;
      life: number;
      maxLife: number;
    }>
  >([]);
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

    // Mouse tracking en window (anti-pattern 5.14)
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseout", onMouseLeave);

    // Inicializar gotas — caen desde arriba como gotas de vino
    const initDroplet = (initial: boolean = false) => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : -10,
      vy: 0.3 + Math.random() * 0.8,
      size: 1 + Math.random() * 2.5,
      opacity: 0.2 + Math.random() * 0.4,
      life: 0,
      maxLife: 300 + Math.random() * 400,
    });

    dropletsRef.current = Array.from({ length: 80 }, () => initDroplet(true));

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      for (const d of dropletsRef.current) {
        if (!reducedMotion) {
          // Caída con gravedad suave
          d.y += d.vy;
          d.vy += 0.003; // aceleración mínima
          d.life++;

          // Mouse repel suave (adaptado de ConnectedParticles)
          const dx = mouseRef.current.x - d.x;
          const dy = mouseRef.current.y - d.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80 && dist > 0) {
            const force = (80 - dist) / 80;
            d.x -= (dx / dist) * force * 0.6;
            d.y -= (dy / dist) * force * 0.6;
          }
        }

        // Reset si sale de pantalla o muere
        if (d.y > height + 20 || d.life > d.maxLife) {
          Object.assign(d, initDroplet(false));
        }

        // Dibujar gota con halo (adaptado de GoldenDust halo)
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size * 4);
        grad.addColorStop(0, accentColor);
        grad.addColorStop(0.4, accentColor + "60");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.globalAlpha = d.opacity;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = d.opacity * 1.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      if (!reducedMotion) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseLeave);
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
        zIndex: 1,
      }}
    />
  );
}

// ============================================================
// PAGE
// ============================================================
export default function MeridaHero() {
  const [loaded, setLoaded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);

    // Scroll choreography — adaptado del PROFUNDIDAD
    const onScroll = () => {
      const p = Math.min(window.scrollY / window.innerHeight, 1);
      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(1 - p * 1.2);
        overlayRef.current.style.transform = `translateY(${-p * 60}px) scale(${1 - p * 0.05})`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#0F0507" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Inter:wght@200;300;400;500;600&display=swap');
        
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body {
          font-family: 'Inter', sans-serif;
          background: #0F0507;
          color: #E8D5C4;
          -webkit-font-smoothing: antialiased;
        }
        .font-serif { font-family: 'Playfair Display', serif; }
        
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
        
        a:focus-visible, button:focus-visible {
          outline: 2px solid #C9A05E;
          outline-offset: 4px;
          box-shadow: 0 0 20px rgba(201,160,94,0.3);
        }
        ::selection { background: #8B1A2B; color: #E8D5C4; }
        
        @media (pointer: fine) { * { cursor: none !important; } }
      `}</style>

      {!loaded ? (
        <Preloader
          variant="percentage"
          duration={2200}
          brandText="MÉRIDA"
          accentColor="#C9A05E"
          onComplete={() => setLoaded(true)}
        />
      ) : (
        <>
          {/* Mouse glow en tono granate (adaptado del VERVAIN) */}
          <MouseGlow color="#8B1A2B" size={450} intensity={0.06} />

          <section
            className="relative w-full h-screen overflow-hidden flex items-center justify-center"
            aria-label="MÉRIDA — Vino premium de altura"
          >
            {/* Gotas de vino cayendo (adaptación de GoldenDust + ConnectedParticles) */}
            <WineDroplets accentColor="#8B1A2B" />

            {/* Overlay radial para legibilidad */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 2,
                background:
                  "radial-gradient(ellipse at center, transparent 30%, rgba(15,5,7,0.7) 100%)",
              }}
              aria-hidden
            />

            {/* Contenido */}
            <div
              ref={overlayRef}
              className="relative z-10 text-center px-6 max-w-4xl"
            >
              {/* Tag superior */}
              <div
                className="font-serif italic mb-8"
                style={{
                  fontSize: "16px",
                  fontWeight: 400,
                  color: "#C9A05E",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards",
                }}
              >
                Valle de Uco · Mendoza · 2026
              </div>

              {/* Título con letter reveal — patrón 1.4f recuperado del VERVAIN */}
              <h1 className="font-serif mb-3" style={{ margin: 0 }}>
                <LetterReveal
                  as="span"
                  text="MÉRIDA"
                  variant="reveal"
                  baseDelay={0.7}
                  stagger={0.12}
                  duration={1.4}
                  style={{
                    fontSize: "clamp(70px, 13vw, 160px)",
                    fontWeight: 500,
                    lineHeight: 0.95,
                    letterSpacing: "0.04em",
                    color: "#E8D5C4",
                    textShadow:
                      "0 0 60px rgba(139,26,43,0.4), 0 0 120px rgba(201,160,94,0.15)",
                  }}
                />
              </h1>

              {/* Subtítulo */}
              <p
                className="font-serif italic mb-10"
                style={{
                  fontSize: "clamp(18px, 2.5vw, 26px)",
                  fontWeight: 400,
                  color: "#C9A05E",
                  letterSpacing: "0.02em",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.8s forwards",
                }}
              >
                Malbec de altura · 1.450 msnm
              </p>

              {/* Deco-line con gradient — patrón 1.4j recuperado del VERVAIN */}
              <div
                className="mx-auto mb-12"
                style={{
                  width: "80px",
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, #C9A05E, transparent)",
                  opacity: 0,
                  transform: "scaleX(0)",
                  animation: "lineExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 2.1s forwards",
                }}
                aria-hidden
              />

              {/* Quote */}
              <p
                className="font-serif italic mx-auto mb-14"
                style={{
                  fontSize: "clamp(17px, 2vw, 22px)",
                  fontWeight: 400,
                  lineHeight: 1.7,
                  color: "rgba(232,213,196,0.75)",
                  maxWidth: "520px",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2.3s forwards",
                }}
              >
                <span style={{ color: "#8B1A2B", opacity: 0.6, marginRight: "4px" }}>&ldquo;</span>
                Donde el sol andino madura cada uva
                <br />
                y el frío de la noche la transforma en vino.
                <span style={{ color: "#8B1A2B", opacity: 0.6, marginLeft: "4px" }}>&rdquo;</span>
              </p>

              {/* HUD — adaptado del PIXELVOID (estadísticas técnicas del vino) */}
              <div
                className="flex justify-center gap-10 flex-wrap mb-14"
                style={{
                  opacity: 0,
                  animation: "fadeUp 1.2s ease 2.5s forwards",
                }}
              >
                {[
                  { val: "1.450", label: "MSNM", color: "#C9A05E" },
                  { val: "14°", label: "SOL/DÍA", color: "#8B1A2B" },
                  { val: "100%", label: "MALBEC", color: "#C9A05E" },
                  { val: "18m", label: "BARRICA", color: "#8B1A2B" },
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
                        color: "rgba(232,213,196,0.4)",
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
                  href="#reserva"
                  aria-label="Reservar cosecha"
                  style={{
                    padding: "16px 40px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#0F0507",
                    background: "#C9A05E",
                    border: "1px solid #C9A05E",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#E8D5C4";
                    e.currentTarget.style.boxShadow = "0 0 40px rgba(201,160,94,0.4)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#C9A05E";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Reservar Cosecha
                </a>
                <a
                  href="#historia"
                  aria-label="Conocer la historia"
                  style={{
                    padding: "16px 40px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#C9A05E",
                    background: "transparent",
                    border: "1px solid rgba(201,160,94,0.4)",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C9A05E";
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(201,160,94,0.2)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,160,94,0.4)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  La Historia
                </a>
              </div>
            </div>

            {/* Scroll indicator — patrón 1.4j (mismo que VERVAIN/ARAGAL) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5"
              style={{
                bottom: "40px",
                zIndex: 10,
                opacity: 0,
                animation: "fadeUp 1s ease 3.2s forwards",
              }}
              aria-hidden
            >
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.4em",
                  textTransform: "uppercase",
                  color: "rgba(232,213,196,0.4)",
                }}
              >
                Descubrir
              </span>
              <div
                style={{
                  width: "1px",
                  height: "50px",
                  background: "linear-gradient(to bottom, #C9A05E, transparent)",
                  animation: "scrollPulse 2.5s ease-in-out infinite",
                }}
              />
            </div>

            {/* HUD esquina superior izquierda */}
            <div
              className="absolute top-6 left-6 z-20 opacity-0"
              style={{ animation: "fadeUp 1.2s ease 2s forwards" }}
              aria-hidden
            >
              <div
                className="font-mono uppercase tracking-widest"
                style={{ fontSize: "9px", color: "rgba(201,160,94,0.5)" }}
              >
                <div>COSECHA · 2026</div>
                <div>VALLE DE UCO</div>
                <div style={{ marginTop: "8px", color: "rgba(139,26,43,0.7)" }}>
                  ● EDICIÓN LIMITADA
                </div>
              </div>
            </div>

            {/* HUD esquina superior derecha */}
            <div
              className="absolute top-6 right-6 z-20 text-right opacity-0"
              style={{ animation: "fadeUp 1.2s ease 2s forwards" }}
              aria-hidden
            >
              <div
                className="font-mono uppercase tracking-widest"
                style={{ fontSize: "9px", color: "rgba(201,160,94,0.5)" }}
              >
                <div>BOTELLAS · 480</div>
                <div>MALBEC · 100%</div>
                <div style={{ marginTop: "8px", color: "rgba(139,26,43,0.7)" }}>
                  14.2% VOL
                </div>
              </div>
            </div>

            {/* Volver */}
            <a
              href="/"
              className="absolute bottom-6 right-6 z-20 font-mono"
              style={{
                fontSize: "9px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(232,213,196,0.4)",
                textDecoration: "none",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A05E")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(232,213,196,0.4)")}
              aria-label="Volver al inicio"
            >
              ← INDEX
            </a>
          <HeroPolish accentColor="#8B1A2B" />
          </section>

          {/* Sección siguiente */}
          <section
            id="historia"
            className="py-40 px-6 text-center"
            style={{ background: "#0F0507", borderTop: "1px solid rgba(201,160,94,0.1)" }}
            aria-label="La historia"
          >
            <div className="max-w-3xl mx-auto">
              <span
                className="block mb-10"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  color: "#C9A05E",
                }}
              >
                01 — El Terroir
              </span>
              <h2
                className="font-serif font-light mb-12"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                  lineHeight: 1.1,
                  color: "#E8D5C4",
                  letterSpacing: "-0.02em",
                }}
              >
                A 1.450 metros,
                <br />
                <span style={{ color: "#8B1A2B", fontStyle: "italic" }}>
                  el tiempo es otro.
                </span>
              </h2>
              <p
                className="font-light mx-auto"
                style={{
                  fontSize: "18px",
                  lineHeight: 1.8,
                  color: "rgba(232,213,196,0.6)",
                  maxWidth: "500px",
                }}
              >
                Cada botella de MÉRIDA es el resultado de 18 meses en barrica
                francesa y la paciencia de quienes saben que el vino no se
                fabrica — se espera.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
