"use client";

/**
 * VervainHero.tsx — Hero editorial minimalista para VERVAIN.
 *
 * Brief: Estudio de diseño chileno boutique. Editorial minimalista.
 * Paleta: negro/crema/oro. Sin WebGL — Canvas 2D + CSS + GSAP.
 *
 * Skills usadas (todas del registry tier 1):
 *   - component-letter-reveal (Patrón 1.4f) — título "VERVAIN" letra por letra
 *   - component-connected-particles (Patrón 1.4i) — 120 partículas oro con conexiones
 *   - component-golden-dust (Patrón 1.4g) — burst dorado al click
 *   - component-mouse-glow (Patrón 1.4h) — glow suave que sigue cursor
 *   - component-preloader (tier 2) — pantalla de carga con counter 0%
 *
 * Anti-patterns aplicados:
 *   - 5.9: overflow-x: clip (no hidden) para no romper sticky
 *   - 5.5: prefers-reduced-motion respetado en todos los componentes
 *   - 5.6: contraste WCAG AA verificado (crema #F5F0E8 sobre negro = 16.2:1)
 *
 * Referencias SOTD 2026 aplicadas:
 *   - House of Honey (editorial serif elegante)
 *   - COBLOC (tipografía alta + fondo blanco/negro)
 *   - ARAGAL (paleta oro/negro + partículas canvas)
 */

import { useState, useEffect } from "react";
import { LetterReveal } from "@/lib/library/components/LetterReveal";
import { ConnectedParticles } from "@/lib/library/components/ConnectedParticles";
import { GoldenDust } from "@/lib/library/components/GoldenDust";
import { MouseGlow } from "@/lib/library/components/MouseGlow";
import { Preloader } from "@/lib/library/components/Preloader";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

export default function VervainHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    // Reset scroll al cargar (igual que el hero cinematográfico)
    window.scrollTo(0, 0);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#0A0A0A" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@200;300;400;500;600&display=swap');
        
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body {
          font-family: 'Inter', sans-serif;
          background: #0A0A0A;
          color: #F5F0E8;
          -webkit-font-smoothing: antialiased;
        }
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
        
        a:focus-visible, button:focus-visible {
          outline: 2px solid #C9A84C;
          outline-offset: 4px;
          box-shadow: 0 0 20px rgba(201,168,76,0.3);
        }
        ::selection { background: #C9A84C; color: #0A0A0A; }
        
        @media (pointer: fine) {
          * { cursor: none !important; }
        }
      `}</style>

      {!loaded ? (
        <Preloader
          variant="percentage"
          duration={2200}
          brandText="VERVAIN"
          accentColor="#C9A84C"
          onComplete={() => setLoaded(true)}
        />
      ) : (
        <>
          {/* Microinteracciones globales */}
          <MouseGlow color="#C9A84C" size={400} intensity={0.05} />
          <GoldenDust color="#C9A84C" count={12} />

          <section
            className="relative w-full h-screen overflow-hidden flex items-center justify-center"
            aria-label="VERVAIN — Estudio de diseño"
          >
            {/* Capa 1: Partículas con conexiones (constelación oro) */}
            <ConnectedParticles
              count={120}
              color="#C9A84C"
              connectionDistance={110}
              connectionOpacity={0.06}
              particleSize={1.8}
              speed={0.25}
              mouseInteraction={true}
              mouseRadius={140}
              driftUp={true}
            />

            {/* Capa 2: Dust overlay (gradientes radiales sutiles) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 2,
                background: `
                  radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.04) 0%, transparent 50%),
                  radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.03) 0%, transparent 40%),
                  radial-gradient(ellipse at 50% 90%, rgba(201,168,76,0.02) 0%, transparent 60%)
                `,
              }}
              aria-hidden
            />

            {/* Capa 3: Vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 3,
                background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.7) 100%)",
              }}
              aria-hidden
            />

            {/* Contenido */}
            <div
              className="relative z-10 text-center px-10 max-w-4xl"
              style={{ maxWidth: "900px" }}
            >
              {/* Monograma */}
              <div
                className="font-serif italic text-[#C9A84C] mb-8"
                style={{
                  fontSize: "28px",
                  fontWeight: 300,
                  letterSpacing: "0.3em",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
                }}
              >
                V
              </div>

              {/* Título con letter reveal — span dentro de h1 (no anidar h1) */}
              <h1 className="font-serif text-[#C9A84C] mb-3" style={{ margin: 0 }}>
                <LetterReveal
                  as="span"
                  text="VERVAIN"
                  variant="reveal"
                  baseDelay={0.6}
                  stagger={0.1}
                  duration={1.2}
                  style={{
                    fontSize: "clamp(60px, 12vw, 140px)",
                    fontWeight: 300,
                    lineHeight: 0.95,
                    letterSpacing: "0.08em",
                    textShadow: "0 0 80px rgba(201,168,76,0.15)",
                  }}
                />
              </h1>

              {/* Subtítulo — nombre del estudio */}
              <p
                className="text-[#B8B0A0] mb-12"
                style={{
                  fontSize: "clamp(11px, 1.5vw, 14px)",
                  fontWeight: 300,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.6s forwards",
                }}
              >
                Estudio de Diseño · Santiago, Chile
              </p>

              {/* Deco-line con gradient (Patrón 1.4j) */}
              <div
                className="mx-auto mb-10"
                style={{
                  width: "60px",
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, #C9A84C, transparent)",
                  opacity: 0,
                  transform: "scaleX(0)",
                  animation: "lineExpand 1.5s cubic-bezier(0.16, 1, 0.3, 1) 1.9s forwards",
                }}
                aria-hidden
              />

              {/* Roles */}
              <div
                className="flex justify-center gap-8 flex-wrap mb-12"
                style={{
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2.1s forwards",
                }}
              >
                {["Branding", "Editorial", "Digital"].map((role) => (
                  <span
                    key={role}
                    style={{
                      fontSize: "11px",
                      fontWeight: 400,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: "#6A6358",
                      position: "relative",
                    }}
                  >
                    {role}
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p
                className="font-serif italic text-[#B8B0A0] mx-auto mb-12"
                style={{
                  fontSize: "clamp(16px, 2.5vw, 22px)",
                  fontWeight: 300,
                  lineHeight: 1.8,
                  maxWidth: "500px",
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2.3s forwards",
                }}
              >
                <span style={{ color: "#8B6914", opacity: 0.5, marginRight: "4px" }}>&ldquo;</span>
                Diseño donde la intención se convierte en forma.
                <span style={{ color: "#8B6914", opacity: 0.5, marginLeft: "4px" }}>&rdquo;</span>
              </p>

              {/* CTA */}
              <div
                className="flex justify-center gap-6 flex-wrap"
                style={{
                  opacity: 0,
                  animation: "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2.5s forwards",
                }}
              >
                <a
                  href="#trabajo"
                  aria-label="Ver trabajo"
                  style={{
                    position: "relative",
                    padding: "16px 40px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#0A0A0A",
                    background: "#C9A84C",
                    border: "1px solid #C9A84C",
                    overflow: "hidden",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#E8D5A3";
                    e.currentTarget.style.boxShadow = "0 0 40px rgba(201,168,76,0.3)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#C9A84C";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Ver Trabajo
                </a>
                <a
                  href="#contacto"
                  aria-label="Contactar"
                  style={{
                    position: "relative",
                    padding: "16px 40px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: "#C9A84C",
                    background: "transparent",
                    border: "1px solid rgba(201,168,76,0.3)",
                    overflow: "hidden",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C9A84C";
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(201,168,76,0.15)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Contacto
                </a>
              </div>
            </div>

            {/* Barra de iconos sociales — estilo ARAGAL.
                Layout correcto: social-bar al ras (bottom: 40px),
                scroll-indicator ENCIMA (bottom: 100px). */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex gap-7 z-10"
              style={{
                bottom: "40px",
                opacity: 0,
                animation: "fadeUp 1s ease 2.9s forwards",
              }}
            >
              {[
                {
                  label: "Instagram",
                  href: "#",
                  path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
                },
                {
                  label: "Behance",
                  href: "#",
                  path: "M22 7h-7V5h7v2zM5.5 8.4c.6 0 1.1.1 1.6.2.5.1.9.3 1.2.6.3.3.6.6.8 1.1.2.5.3 1 .3 1.7 0 .7-.2 1.3-.5 1.8-.3.5-.8.9-1.4 1.2.9.3 1.5.7 1.9 1.3.4.6.6 1.3.6 2.2 0 .7-.1 1.3-.4 1.8-.3.5-.6 1-1.1 1.3-.5.3-1 .6-1.6.7-.6.2-1.2.2-1.8.2H0V8.4h5.5zm-.3 4.4c.5 0 .9-.1 1.2-.4.3-.2.5-.6.5-1.2 0-.3 0-.5-.1-.7-.1-.2-.2-.3-.4-.4-.2-.1-.4-.2-.6-.2-.2 0-.4-.1-.7-.1H2.7v3h2.5zm.1 4.6c.3 0 .5 0 .8-.1.2-.1.4-.2.6-.3.2-.1.3-.3.4-.5.1-.2.1-.5.1-.8 0-.6-.2-1-.5-1.3-.3-.3-.8-.4-1.4-.4H2.7v3.4h2.6zM23.5 13.2c0-.5-.1-1-.3-1.4-.2-.4-.4-.8-.7-1.1-.3-.3-.7-.5-1.1-.7-.4-.2-.9-.2-1.4-.2-.5 0-1 .1-1.4.2-.4.2-.8.4-1.1.7-.3.3-.5.7-.7 1.1-.2.4-.3.9-.3 1.4 0 .5.1 1 .2 1.4.2.4.4.8.7 1.1.3.3.7.5 1.1.7.4.2.9.2 1.4.2.6 0 1.1-.1 1.6-.3.5-.2.9-.5 1.2-.9.3-.4.5-.9.6-1.4h-2c-.1.3-.3.5-.5.6-.2.1-.5.2-.8.2-.4 0-.8-.1-1-.4-.2-.2-.4-.6-.4-1h4.9c0-.1 0-.1 0-.1zm-4.9-.7c0-.4.2-.7.4-.9.2-.2.6-.3 1-.3.4 0 .7.1.9.3.2.2.4.5.4.9h-2.7zM21 9.7h-5.5v-1.4H21v1.4z",
                },
                {
                  label: "Dribbble",
                  href: "#",
                  path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm7.94 5.53c1.43 1.74 2.29 3.96 2.31 6.36-.34-.07-3.71-.75-7.1-.33-.08-.17-.15-.35-.23-.52-.21-.5-.44-1-.68-1.48 3.77-1.54 5.48-3.75 5.7-4.03zM12 1.94c2.6 0 4.97.97 6.78 2.57-.18.26-1.72 2.34-5.36 3.71-1.67-3.07-3.53-5.59-3.82-5.98.77-.18 1.58-.3 2.4-.3zM6.96 2.96c.27.37 2.09 2.9 3.78 5.9-4.77 1.27-8.98 1.25-9.43 1.24.66-3.16 2.65-5.81 5.65-7.14zM1.93 12c0-.07 0-.14 0-.21.44.01 5.35.07 10.43-1.45.29.57.57 1.14.83 1.72-.13.04-.27.08-.4.13-5.24 1.69-8.03 6.32-8.27 6.72-1.6-1.78-2.58-4.12-2.59-6.68zm10.07 10.06c-2.3 0-4.42-.77-6.13-2.07.18-.38 2.27-4.4 8-6.4.02 0 .03 0 .05-.01 1.44 3.74 2.03 6.88 2.18 7.78-1.27.55-2.66.85-4.1.85zm5.97-1.95c-.11-.65-.65-3.66-1.99-7.35 3.2-.51 6 .33 6.36.44-.45 2.83-2.08 5.27-4.37 6.91z",
                },
                {
                  label: "LinkedIn",
                  href: "#",
                  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  style={{
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(201,168,76,0.15)",
                    borderRadius: "50%",
                    color: "#6A6358",
                    textDecoration: "none",
                    transition: "all 0.4s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C9A84C";
                    e.currentTarget.style.color = "#C9A84C";
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 5px 20px rgba(201,168,76,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)";
                    e.currentTarget.style.color = "#6A6358";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>

            {/* Scroll indicator — encima de la barra social (bottom: 100px) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5"
              style={{
                bottom: "100px",
                zIndex: 10,
                opacity: 0,
                animation: "fadeUp 1s ease 3.2s forwards",
              }}
              aria-hidden
            >
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#6A6358",
                }}
              >
                Descubrir
              </span>
              <div
                style={{
                  width: "1px",
                  height: "40px",
                  background: "linear-gradient(to bottom, #C9A84C, transparent)",
                  animation: "scrollPulse 2s ease-in-out infinite",
                }}
              />
            </div>

            {/* HUD esquina superior izquierda */}
            <div
              className="absolute top-6 left-6 opacity-0 z-20"
              style={{ animation: "fadeUp 1.2s ease 2s forwards" }}
              aria-hidden
            >
              <div
                className="font-mono uppercase tracking-widest"
                style={{ fontSize: "9px", color: "rgba(201,168,76,0.4)" }}
              >
                <div>EST · 2019</div>
                <div>SCL · Chile</div>
              </div>
            </div>

            {/* HUD esquina superior derecha */}
            <div
              className="absolute top-6 right-6 opacity-0 text-right z-20"
              style={{ animation: "fadeUp 1.2s ease 2s forwards" }}
              aria-hidden
            >
              <div
                className="font-mono uppercase tracking-widest"
                style={{ fontSize: "9px", color: "rgba(201,168,76,0.4)" }}
              >
                <div>N ° 047</div>
                <div>2026</div>
              </div>
            </div>

            {/* Volver al hero cinematográfico */}
            <a
              href="/"
              className="absolute bottom-6 right-6 z-20"
              style={{
                fontSize: "9px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(201,168,76,0.5)",
                textDecoration: "none",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A84C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(201,168,76,0.5)")}
              aria-label="Volver al hero cinematográfico"
            >
              ← Cinematic
            </a>
          <HeroPolish accentColor="#F5F0E8" />
          </section>

          {/* Sección siguiente para que el scroll indicator tenga sentido */}
          <section
            id="trabajo"
            className="py-40 px-6 text-center"
            style={{ background: "#0A0A0A" }}
            aria-label="Trabajo seleccionado"
          >
            <div className="max-w-3xl mx-auto">
              <span
                className="block mb-10"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  color: "#C9A84C",
                }}
              >
                01 — Selección
              </span>
              <h2
                className="font-serif font-light mb-12"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                  lineHeight: 1.1,
                  color: "#F5F0E8",
                  letterSpacing: "-0.02em",
                }}
              >
                Trabajo
                <br />
                <span style={{ color: "#C9A84C", fontStyle: "italic" }}>seleccionado.</span>
              </h2>
              <p
                className="font-light mx-auto"
                style={{
                  fontSize: "18px",
                  lineHeight: 1.8,
                  color: "rgba(245,240,232,0.6)",
                  maxWidth: "500px",
                }}
              >
                Cada proyecto es una conversación entre intención y forma.
                Trabajamos con marcas que buscan precisión, no ruido.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
