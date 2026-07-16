"use client";

/**
 * HORIZONTE — Hero con scroll HORIZONTAL (estructura radicalmente distinta).
 *
 * En vez de scroll vertical tradicional, el contenido se desplaza
 * horizontalmente. 4 paneles que se revelan al hacer scroll vertical
 * (translateX basado en scrollY).
 *
 * NUEVA ESTRUCTURA (no existente en la skill):
 *   - Scroll vertical → movimiento horizontal (scroll hijacking)
 *   - 4 paneles cada uno con un tema distinto
 *   - Cada panel: paleta + tipografía + interacción distinta
 *   - Indicador de progreso horizontal
 *   - Snap entre paneles
 *
 * Paneles:
 *   1. AZUL — "Origen" — partículas descendiendo como lluvia
 *   2. ÁMBAR — "Evolución" — gradient text que aparece al entrar
 *   3. ESMERALDA — "Conexión" — líneas conectando puntos
 *   4. MAGENTA — "Futuro" — glitch text effect
 *
 * Anti-patterns: 5.9 (overflow clip), 5.18 (preloader timer)
 */

import { useState, useEffect, useRef } from "react";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

const PANELS = [
  {
    id: 0,
    name: "ORIGEN",
    color: "#00aaff",
    bg: "#020812",
    text: "Donde todo empieza",
    sub: "En el silencio azul del comienzo",
  },
  {
    id: 1,
    name: "EVOLUCIÓN",
    color: "#ffaa00",
    bg: "#0f0802",
    text: "Donde todo cambia",
    sub: "En el fuego ámbar de la transformación",
  },
  {
    id: 2,
    name: "CONEXIÓN",
    color: "#00ff88",
    bg: "#021008",
    text: "Donde todo se une",
    sub: "En la luz esmeralda de los vínculos",
  },
  {
    id: 3,
    name: "FUTURO",
    color: "#ff0055",
    bg: "#0f0208",
    text: "Donde todo converge",
    sub: "En el pulso magenta del mañana",
  },
];

export default function HorizonteHero() {
  const [loaded, setLoaded] = useState(false);
  const [currentPanel, setCurrentPanel] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);

    const onScroll = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const progress = Math.min(window.scrollY / maxScroll, 1);
      const totalPanels = PANELS.length;
      const panelWidth = window.innerWidth;
      const translateX = -progress * (totalPanels - 1) * panelWidth;

      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${translateX}px)`;
      }

      // Panel actual
      const panel = Math.min(Math.floor(progress * totalPanels), totalPanels - 1);
      setCurrentPanel(panel);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loaded]);

  // Set body height para permitir scroll
  useEffect(() => {
    if (!loaded) return;
    document.body.style.height = `${PANELS.length * 100}vh`;
    return () => {
      document.body.style.height = "";
    };
  }, [loaded]);

  return (
    <main className="relative" style={{ overflowX: "clip", background: "#020812" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { overflow-x: clip; }
        body { overflow-x: clip; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rainDrop {
          0% { transform: translateY(-100vh); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 1px); }
          40% { transform: translate(2px, -1px); }
          60% { transform: translate(-1px, 2px); }
          80% { transform: translate(1px, -2px); }
        }
        a:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#020812", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: 800, color: "#00aaff", letterSpacing: "0.15em", marginBottom: "20px" }}>HORIZONTE</div>
          <div style={{ width: "250px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "#00aaff", animation: "load 1.8s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* Track horizontal — se mueve con scroll vertical */}
          <div
            ref={trackRef}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              display: "flex",
              height: "100vh",
              transition: "transform 0.1s linear",
              willChange: "transform",
            }}
          >
            {PANELS.map((panel, i) => (
              <div
                key={panel.id}
                style={{
                  width: "100vw",
                  height: "100vh",
                  background: panel.bg,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Glow radial del color del panel */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${panel.color}15 0%, transparent 70%)`,
                  }}
                  aria-hidden
                />

                {/* Panel 0: lluvia de partículas */}
                {i === 0 && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
                    {Array.from({ length: 30 }).map((_, j) => (
                      <div
                        key={j}
                        style={{
                          position: "absolute",
                          left: `${(j / 30) * 100}%`,
                          top: 0,
                          width: "1px",
                          height: "40px",
                          background: `linear-gradient(to bottom, transparent, ${panel.color}80)`,
                          animation: `rainDrop ${2 + Math.random() * 3}s linear ${Math.random() * 3}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Panel 1: gradient text */}
                {/* Panel 2: líneas conectando */}
                {i === 2 && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
                    <svg width="100%" height="100%" style={{ opacity: 0.3 }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <line
                          key={j}
                          x1={`${10 + j * 12}%`}
                          y1={`${20 + (j % 3) * 25}%`}
                          x2={`${30 + j * 10}%`}
                          y2={`${70 - (j % 3) * 20}%`}
                          stroke={panel.color}
                          strokeWidth="1"
                          opacity={0.4}
                        />
                      ))}
                    </svg>
                  </div>
                )}

                {/* Panel 3: glitch */}
                {/* Contenido del panel */}
                <div style={{ zIndex: 10, textAlign: "center", padding: "0 40px" }}>
                  {/* Número de panel */}
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "12px",
                      color: panel.color,
                      letterSpacing: "0.4em",
                      textTransform: "uppercase",
                      marginBottom: "24px",
                      opacity: 0.7,
                    }}
                  >
                    0{i + 1} / 0{PANELS.length} — {panel.name}
                  </div>

                  {/* Título */}
                  <h1
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "clamp(2.5rem, 8vw, 6rem)",
                      fontWeight: 800,
                      lineHeight: 0.9,
                      letterSpacing: "-0.03em",
                      color: i === 1
                        ? "transparent"
                        : "#fff",
                      background: i === 1
                        ? `linear-gradient(180deg, #fff 0%, ${panel.color} 100%)`
                        : "none",
                      WebkitBackgroundClip: i === 1 ? "text" : "border-box",
                      WebkitTextFillColor: i === 1 ? "transparent" : "#fff",
                      textShadow: i === 3 ? `2px 0 ${panel.color}, -2px 0 #00aaff` : "none",
                      animation: i === 3 ? "glitch 0.3s steps(2) infinite" : "none",
                      margin: 0,
                    }}
                  >
                    {panel.text}
                  </h1>

                  {/* Subtítulo */}
                  <p
                    className="font-mono"
                    style={{
                      fontSize: "clamp(13px, 1.5vw, 16px)",
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.15em",
                      marginTop: "20px",
                      maxWidth: "400px",
                    }}
                  >
                    {panel.sub}
                  </p>
                </div>

                {/* Esquina inferior: número grande */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "40px",
                    right: "60px",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "clamp(4rem, 12vw, 10rem)",
                    fontWeight: 800,
                    color: panel.color,
                    opacity: 0.08,
                    lineHeight: 1,
                    pointerEvents: "none",
                  }}
                  aria-hidden
                >
                  0{i + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Barra de progreso horizontal */}
          <div
            style={{
              position: "fixed",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(80vw, 400px)",
              height: "2px",
              background: "rgba(255,255,255,0.1)",
              zIndex: 50,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((currentPanel + 1) / PANELS.length) * 100}%`,
                background: PANELS[currentPanel].color,
                transition: "all 0.3s ease",
                boxShadow: `0 0 10px ${PANELS[currentPanel].color}`,
              }}
            />
          </div>

          {/* Dots de paneles */}
          <div
            style={{
              position: "fixed",
              bottom: "50px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "12px",
              zIndex: 50,
            }}
          >
            {PANELS.map((p, i) => (
              <div
                key={p.id}
                style={{
                  width: currentPanel === i ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: currentPanel === i ? p.color : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s",
                  boxShadow: currentPanel === i ? `0 0 10px ${p.color}` : "none",
                }}
              />
            ))}
          </div>

          {/* Hint de scroll */}
          <div
            style={{
              position: "fixed",
              top: "30px",
              right: "40px",
              zIndex: 50,
              fontSize: "10px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
            aria-hidden
          >
            ↓ SCROLL PARA NAVEGAR →
          </div>

          {/* Volver */}
          <a
            href="/heroes"
            style={{
              position: "fixed",
              top: "30px",
              left: "40px",
              zIndex: 50,
              fontSize: "10px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
            aria-label="Volver a galería"
          >
            ← Galería
          </a>
        </>
      )}
            <HeroPolish accentColor="#020812" />
      </main>
  );
}
