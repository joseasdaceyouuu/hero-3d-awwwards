"use client";

/**
 * NÓMADA — Hero tipográfico full (Layout H + G).
 *
 * Diversidad estructural: Layout H (tipografía llena 80%) + G (minimalist corner).
 * NO usa layout centrado. NO usa HUD en esquinas. NO usa canvas.
 *
 * Brief: Portfolio de arquitecto minimalista. Solo tipografía + espacio negativo.
 * Paleta blanco/negro puro. Sin animaciones complejas. Sensación editorial extrema.
 *
 * Patrones aplicados:
 *   - LetterReveal (de memoria, variante scale)
 *   - Layout H: tipografía gigante que llena el hero
 *   - Layout G: contenido en esquina inferior izquierda
 *   - Sin canvas, sin partículas, sin HUD
 *   - Solo CSS + tipografía
 */

import { useState, useEffect } from "react";
import { LetterReveal } from "@/lib/library/components/LetterReveal";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

export default function NomadaHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);
  }, [loaded]);

  return (
    <main
      className="relative min-h-screen"
      style={{ overflowX: "clip", background: "#FAFAF7" }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body { font-family: 'Inter', sans-serif; background: #FAFAF7; color: #0A0A0A; }
        .font-serif { font-family: 'Playfair Display', serif; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUpSlow { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        a:focus-visible { outline: 2px solid #0A0A0A; outline-offset: 8px; }
      `}</style>

      {!loaded ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "#FAFAF7", zIndex: 100 }}
        >
          <div
            className="font-serif italic"
            style={{
              fontSize: "24px",
              color: "#0A0A0A",
              letterSpacing: "0.1em",
              opacity: 0,
              animation: "fadeIn 1s ease 0.3s forwards",
            }}
          >
            n.
          </div>
        </div>
      ) : (
        <section
          className="relative w-full h-screen overflow-hidden flex flex-col justify-between"
          aria-label="NÓMADA — Portfolio de arquitectura minimalista"
          style={{ padding: "60px 80px" }}
        >
          {/* TOP: número de proyecto + año (minimalist corner top-right) */}
          <div
            className="flex justify-between items-start"
            style={{
              opacity: 0,
              animation: "fadeIn 1.5s ease 0.3s forwards",
            }}
          >
            <div
              className="font-serif italic"
              style={{
                fontSize: "16px",
                color: "#0A0A0A",
                letterSpacing: "0.05em",
              }}
            >
              Portfolio · 2026
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: "10px",
                color: "rgba(10,10,10,0.4)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              <div>N° 047</div>
              <div style={{ marginTop: "4px" }}>SCL — CHILE</div>
            </div>
          </div>

          {/* CENTER: tipografía gigante que llena (Layout H) */}
          <div className="flex-1 flex flex-col justify-center" style={{ marginTop: "-40px" }}>
            <h1
              className="font-serif"
              style={{
                margin: 0,
                fontSize: "clamp(80px, 18vw, 280px)",
                fontWeight: 800,
                lineHeight: 0.85,
                letterSpacing: "-0.04em",
                color: "#0A0A0A",
                textAlign: "left",
              }}
            >
              <LetterReveal
                as="span"
                text="NÓMADA"
                variant="scale"
                baseDelay={0.5}
                stagger={0.12}
                duration={1.5}
                style={{
                  display: "block",
                }}
              />
            </h1>

            {/* Subtítulo italic pequeño debajo */}
            <p
              className="font-serif italic"
              style={{
                fontSize: "clamp(18px, 2vw, 26px)",
                fontWeight: 400,
                color: "rgba(10,10,10,0.6)",
                marginTop: "20px",
                marginLeft: "8px",
                opacity: 0,
                animation: "fadeUpSlow 1.5s ease 1.6s forwards",
              }}
            >
              Arquitectura que se mueve con el paisaje.
            </p>
          </div>

          {/* BOTTOM: contenido en esquina inferior izquierda (Layout G) */}
          <div
            className="flex justify-between items-end"
            style={{
              opacity: 0,
              animation: "fadeUpSlow 1.5s ease 2s forwards",
            }}
          >
            <div style={{ maxWidth: "380px" }}>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.7,
                  color: "rgba(10,10,10,0.7)",
                  marginBottom: "20px",
                }}
              >
                Proyectos residenciales y culturales en paisajes extremos.
                Cada estructura responde al viento, la luz y la geografía
                que la recibe.
              </p>
              <div className="flex gap-3">
                <a
                  href="#trabajo"
                  aria-label="Ver trabajo"
                  style={{
                    padding: "12px 28px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#FAFAF7",
                    background: "#0A0A0A",
                    display: "inline-block",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(10,10,10,0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#0A0A0A";
                  }}
                >
                  Ver Trabajo
                </a>
                <a
                  href="#contacto"
                  aria-label="Contacto"
                  style={{
                    padding: "12px 28px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#0A0A0A",
                    background: "transparent",
                    border: "1px solid rgba(10,10,10,0.3)",
                    display: "inline-block",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0A0A0A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(10,10,10,0.3)";
                  }}
                >
                  Estudio
                </a>
              </div>
            </div>

            {/* Esquina inferior derecha: índice numérico */}
            <div
              className="font-mono"
              style={{
                fontSize: "10px",
                color: "rgba(10,10,10,0.4)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                textAlign: "right",
                lineHeight: 2,
              }}
              aria-hidden
            >
              <div>01 — CASA DE VIENTO</div>
              <div>02 — REFUGIO ANDINO</div>
              <div>03 — MIRADOR DESIERTO</div>
              <div>04 — CAPILLA MUDA</div>
            </div>
          </div>

          {/* Línea horizontal separadora superior (minimalist detail) */}
          <div
            style={{
              position: "absolute",
              top: "120px",
              left: "80px",
              right: "80px",
              height: "1px",
              background: "rgba(10,10,10,0.1)",
              opacity: 0,
              animation: "fadeIn 2s ease 1s forwards",
            }}
            aria-hidden
          />

          {/* Volver a galería */}
          <a
            href="/heroes"
            className="font-mono"
            style={{
              position: "absolute",
              top: "60px",
              right: "50%",
              transform: "translateX(50%)",
              fontSize: "9px",
              color: "rgba(10,10,10,0.4)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
            aria-label="Volver a galería"
          >
            ← GALERÍA
          </a>
          <HeroPolish accentColor="#FAFAF7" />
        </section>
      )}
    </main>
  );
}
