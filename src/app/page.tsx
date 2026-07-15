"use client";

/**
 * VOLUMETRIC FOG — Hero atmosférico cinematográfico inmersivo
 *
 * Inspiración: Blade Runner 2049, Active Theory.
 *
 * Técnica:
 *   - 4 capas de niebla procedural en fragment shader (parallax depth)
 *   - God rays simulados vía ray-marching simplificado (16 samples)
 *   - Mouse "aparta" la niebla radialmente
 *   - Letterbox bars animadas por scroll (cinematográfico)
 *   - Texto emerge de la bruma con CSS mask + GSAP
 *   - Paleta amber/sepia + deep black
 *
 * Principios del skill:
 *   - C9: Una idea dominante (la niebla volumétrica)
 *   - C10: Paleta 3 colores (#05050a + #d4a574 + #f5e6d3)
 *   - C11: Timing cinematográfico (3s, power3.out)
 *   - C7: prefers-reduced-motion respetado
 *   - C12: WebGL fallback
 *   - C15: Contraste WCAG AA
 *   - C16: HTML semántico
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { VolumetricFog } from "@/components/hero/VolumetricFog";
import { EmergentSilhouette } from "@/components/hero/EmergentSilhouette";
import { CustomCursor } from "@/components/hero/CustomCursor";
import { MemoryDashboard } from "@/components/dashboard/MemoryDashboard";

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"hero" | "dashboard">("hero");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll-driven overlay parallax + letterbox animation
  useEffect(() => {
    if (!overlayRef.current) return;

    const onScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const progress = Math.min(scrollY / heroHeight, 1);

      gsap.to(overlayRef.current, {
        y: -progress * 100,
        opacity: 1 - progress * 1.3,
        scale: 1 - progress * 0.05,
        duration: 0.3,
        ease: "none",
        overwrite: true,
      });

      // Animate letterbox bars — open as user scrolls
      const topBar = document.getElementById("letterbox-top");
      const bottomBar = document.getElementById("letterbox-bottom");
      if (topBar) {
        topBar.style.transform = `translateY(-${progress * 100}%)`;
      }
      if (bottomBar) {
        bottomBar.style.transform = `translateY(${progress * 100}%)`;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* View toggle */}
      <div
        className="fixed top-4 right-4 z-50 flex gap-1 p-1 border border-white/10"
        style={{ background: "rgba(5,5,10,0.8)", backdropFilter: "blur(10px)" }}
      >
        <button
          onClick={() => setView("hero")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "hero"
              ? "bg-[#d4a574] text-[#05050a]"
              : "text-white/50 hover:text-white"
          }`}
        >
          Hero
        </button>
        <button
          onClick={() => setView("dashboard")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "dashboard"
              ? "bg-[#d4a574] text-[#05050a]"
              : "text-white/50 hover:text-white"
          }`}
        >
          Memory
        </button>
      </div>

      {view === "dashboard" ? (
        <MemoryDashboard />
      ) : (
        <>
          <CustomCursor cursorColor="#d4a574" />

          {/* ========================================
              HERO SECTION — Volumetric Fog
              ======================================== */}
          <section
            ref={heroRef}
            id="hero"
            className="relative h-screen w-full overflow-hidden"
            aria-label="Volumetric Fog Hero"
          >
            {/* Shader background */}
            {mounted && <VolumetricFog />}

            {/* Letterbox bars — CSS overlay (cinematográfico) */}
            <div
              className="absolute top-0 left-0 right-0 z-20 pointer-events-none transition-all duration-700"
              style={{
                height: "8vh",
                background: "#000",
                transform: "translateY(0)",
              }}
              aria-hidden
              id="letterbox-top"
            />
            <div
              className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none transition-all duration-700"
              style={{
                height: "8vh",
                background: "#000",
                transform: "translateY(0)",
              }}
              aria-hidden
              id="letterbox-bottom"
            />

            {/* Hero content */}
            <div
              ref={overlayRef}
              className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
            >
              {/* Top label */}
              <div
                className="mb-10 opacity-0"
                style={{ animation: "fadeIn 1.5s ease-out 0.3s forwards" }}
              >
                <span
                  className="text-[10px] uppercase font-light"
                  style={{
                    color: "rgba(212,165,116,0.7)",
                    letterSpacing: "0.6em",
                  }}
                >
                  Atmospheric · Cinematic · 2026
                </span>
              </div>

              {/* Main headline — emerges from fog */}
              <EmergentSilhouette
                text="SILENT LIGHT"
                className="font-playfair"
                delay={1.2}
                duration={3.0}
              />

              {/* Tagline */}
              <p
                className="mt-10 max-w-xl text-base md:text-lg font-light opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 3s forwards",
                  color: "rgba(245,230,211,0.6)",
                  lineHeight: 1.8,
                  letterSpacing: "0.04em",
                }}
              >
                Light through matter. Silence through form.
                <br />
                A study in atmospheric depth.
              </p>

              {/* CTA */}
              <div
                className="mt-14 opacity-0"
                style={{ animation: "fadeIn 1.5s ease-out 3.8s forwards" }}
              >
                <a
                  href="#depth"
                  data-hover
                  className="group relative inline-flex items-center justify-center px-10 py-4 text-xs font-light uppercase tracking-wider transition-all"
                  style={{
                    border: "1px solid rgba(212,165,116,0.4)",
                    color: "#f5e6d3",
                    background: "transparent",
                    overflow: "hidden",
                  }}
                >
                  <span
                    className="absolute inset-0 transform translate-y-full transition-transform duration-700 group-hover:translate-y-0"
                    style={{ background: "rgba(212,165,116,0.15)" }}
                    aria-hidden
                  />
                  <span className="relative z-10">Enter the Mist</span>
                </a>
              </div>
            </div>

            {/* Scroll indicator */}
            <div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0"
              style={{ animation: "fadeIn 2s ease-out 4.5s forwards" }}
              aria-hidden
            >
              <div
                className="flex flex-col items-center gap-3"
                style={{ color: "rgba(245,230,211,0.3)" }}
              >
                <span className="text-[10px] uppercase tracking-[0.4em]">
                  Descend
                </span>
                <div
                  className="h-16 w-px"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(212,165,116,0.6), transparent)",
                    animation: "scrollLine 2.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            {/* HUD corners */}
            <div
              className="absolute top-6 left-6 opacity-0"
              style={{ animation: "fadeIn 2s ease-out 1s forwards" }}
              aria-hidden
            >
              <div
                className="text-[9px] uppercase tracking-widest"
                style={{ color: "rgba(245,230,211,0.3)" }}
              >
                <div>FOG DENSITY · 0.847</div>
                <div>LIGHT ANGLE · 32°</div>
              </div>
            </div>
            <div
              className="absolute top-6 right-6 opacity-0 text-right"
              style={{ animation: "fadeIn 2s ease-out 1s forwards" }}
              aria-hidden
            >
              <div
                className="text-[9px] uppercase tracking-widest"
                style={{ color: "rgba(245,230,211,0.3)" }}
              >
                <div>SCENE · 01</div>
                <div>TAKE · 04</div>
              </div>
            </div>
          </section>

          {/* ========================================
              DEPTH SECTION
              ======================================== */}
          <section
            id="depth"
            className="relative py-40 px-6"
            style={{ background: "#05050a" }}
          >
            <div className="mx-auto max-w-4xl">
              <span
                className="text-[10px] uppercase tracking-[0.5em] mb-10 block opacity-0"
                style={{
                  animation: "fadeIn 1.5s ease-out 0.2s forwards",
                  color: "rgba(212,165,116,0.7)",
                }}
              >
                01 — The Technique
              </span>
              <h2
                className="font-playfair text-4xl md:text-7xl font-light leading-tight mb-12 opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.4s forwards",
                  letterSpacing: "-0.02em",
                  color: "#f5e6d3",
                }}
              >
                Four layers of
                <br />
                <span style={{ color: "#d4a574", fontStyle: "italic" }}>
                  calculated haze.
                </span>
              </h2>
              <p
                className="text-lg md:text-xl font-light leading-relaxed mb-8 opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.6s forwards",
                  color: "rgba(245,230,211,0.6)",
                }}
              >
                Each layer of fog drifts at its own velocity, sampled from a
                four-octave simplex noise field. Sixteen ray-marched samples
                simulate the scattering of light through the volume — a
                technique borrowed from offline rendering, collapsed into a
                single fragment shader that runs at sixty frames per second.
              </p>
              <p
                className="text-base font-light leading-relaxed opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.8s forwards",
                  color: "rgba(245,230,211,0.4)",
                }}
              >
                Move your cursor. The mist parts around it — not a sprite
                effect, but a radial density subtraction computed per-pixel.
              </p>
            </div>
          </section>

          {/* ========================================
              CINEMA SECTION
              ======================================== */}
          <section
            className="relative py-40 px-6"
            style={{ background: "#08080d" }}
          >
            <div className="mx-auto max-w-4xl text-center">
              <span
                className="text-[10px] uppercase tracking-[0.5em] mb-10 block opacity-0"
                style={{
                  animation: "fadeIn 1.5s ease-out 0.2s forwards",
                  color: "rgba(212,165,116,0.7)",
                }}
              >
                02 — The Feel
              </span>
              <h2
                className="font-playfair text-4xl md:text-7xl font-light leading-tight mb-12 opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.4s forwards",
                  letterSpacing: "-0.02em",
                  color: "#f5e6d3",
                }}
              >
                Not animation.
                <br />
                <span style={{ color: "#d4a574", fontStyle: "italic" }}>
                  Atmosphere.
                </span>
              </h2>
              <p
                className="text-lg md:text-xl font-light leading-relaxed opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.6s forwards",
                  color: "rgba(245,230,211,0.6)",
                  lineHeight: 1.8,
                }}
              >
                The difference between a website and a place is whether the air
                has weight. This hero calculates the weight of its own light,
                drifts at the pace of patience, and waits for you to disturb
                it. Every pixel is a decision about what is visible and what
                is hidden.
              </p>
            </div>
          </section>

          {/* ========================================
              FOOTER
              ======================================== */}
          <footer
            className="relative py-40 px-6 text-center"
            style={{ background: "#05050a" }}
          >
            <div className="mx-auto max-w-2xl">
              <span
                className="text-[10px] uppercase tracking-[0.5em] mb-10 block"
                style={{ color: "rgba(212,165,116,0.7)" }}
              >
                03 — The Work
              </span>
              <h2
                className="font-playfair text-4xl md:text-7xl font-light leading-tight mb-12"
                style={{
                  letterSpacing: "-0.02em",
                  color: "#f5e6d3",
                }}
              >
                Build something
                <br />
                <span style={{ color: "#d4a574", fontStyle: "italic" }}>
                  worth the silence.
                </span>
              </h2>
              <a
                href="mailto:hello@silentlight.studio"
                data-hover
                className="inline-block text-lg font-light border-b pb-1 transition-colors hover:text-[#d4a574]"
                style={{
                  borderColor: "rgba(212,165,116,0.3)",
                  color: "rgba(245,230,211,0.7)",
                }}
              >
                hello@silentlight.studio
              </a>
              <p
                className="mt-20 text-[10px] uppercase tracking-[0.4em]"
                style={{ color: "rgba(245,230,211,0.2)" }}
              >
                © 2026 Silent Light · Built with hero-3d-awwwards skill v5
              </p>
            </div>
          </footer>

          {/* ========================================
              GLOBAL STYLES
              ======================================== */}
          <style jsx global>{`
            * {
              box-sizing: border-box;
            }

            body {
              font-family: var(--font-inter), system-ui, sans-serif;
              background: #05050a;
              overflow-x: hidden;
            }

            .font-playfair {
              font-family: var(--font-playfair), serif;
            }

            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes scrollLine {
              0%,
              100% {
                transform: scaleY(1);
                transform-origin: top;
              }
              50% {
                transform: scaleY(0.2);
                transform-origin: bottom;
              }
            }

            @media (pointer: fine) {
              * {
                cursor: none !important;
              }
            }

            a:focus-visible,
            button:focus-visible {
              outline: 2px solid #d4a574;
              outline-offset: 4px;
            }

            ::selection {
              background: #d4a574;
              color: #05050a;
            }

            @media (prefers-reduced-motion: no-preference) {
              html {
                scroll-behavior: smooth;
              }
            }
          `}</style>
        </>
      )}
    </main>
  );
}
