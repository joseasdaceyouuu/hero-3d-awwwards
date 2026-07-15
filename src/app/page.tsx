"use client";

/**
 * AURORA — Hero con aurora boreal procedural
 *
 * Cortinas de luz celestial + estrellas + reflejo en agua.
 * Completamente diferente al SILENT LIGHT (fog) y COSMIC (particles).
 *
 * Técnica:
 *   - 3 cortinas de aurora con altitudes y velocidades distintas
 *   - Cada cortina: fbm noise modulado por gaussiana vertical
 *   - Stars procedurales con twinkle
 *   - Reflejo en agua con distorsión por noise
 *   - Mouse desplaza las cortinas (viento solar)
 *   - Paleta: verde aurora + magenta + cyan + deep blue night
 *
 * Principios del skill:
 *   - C9: Una idea dominante (la aurora)
 *   - C10: Paleta natural (verde/magenta/cyan + deep blue)
 *   - C11: Timing cinematográfico (3s, power3.out)
 *   - C7: prefers-reduced-motion respetado
 *   - C12: WebGL fallback
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AuroraBorealis } from "@/components/hero/AuroraBorealis";
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
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* View toggle */}
      <div
        className="fixed top-4 right-4 z-50 flex gap-1 p-1 border border-white/10"
        style={{ background: "rgba(2,5,15,0.8)", backdropFilter: "blur(10px)" }}
      >
        <button
          onClick={() => setView("hero")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "hero"
              ? "bg-[#00ff9d] text-[#02050f]"
              : "text-white/50 hover:text-white"
          }`}
        >
          Hero
        </button>
        <button
          onClick={() => setView("dashboard")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "dashboard"
              ? "bg-[#00ff9d] text-[#02050f]"
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
          <CustomCursor cursorColor="#00ff9d" />

          {/* ========================================
              HERO SECTION — Aurora Borealis
              ======================================== */}
          <section
            ref={heroRef}
            id="hero"
            className="relative h-screen w-full overflow-hidden"
            aria-label="Aurora Borealis Hero"
            style={{
              background:
                "linear-gradient(to bottom, #02050f 0%, #0a1a3a 40%, #050a1a 100%)",
            }}
          >
            {/* Shader background */}
            {mounted && <AuroraBorealis />}

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
                    color: "#00ff9d",
                    letterSpacing: "0.6em",
                  }}
                >
                  69°N · Celestial · 2026
                </span>
              </div>

              {/* Main headline */}
              <h1
                className="font-playfair opacity-0"
                style={{
                  fontSize: "clamp(2.5rem, 11vw, 9rem)",
                  fontWeight: 200,
                  letterSpacing: "0.02em",
                  lineHeight: 0.95,
                  margin: 0,
                  color: "#ffffff",
                  textShadow:
                    "0 0 30px rgba(0,255,157,0.4), 0 0 60px rgba(255,0,170,0.3), 0 0 100px rgba(0,200,255,0.2)",
                }}
                ref={(el) => {
                  if (el) {
                    gsap.set(el, { opacity: 0, y: 20 });
                    setTimeout(() => {
                      gsap.to(el, {
                        opacity: 1,
                        y: 0,
                        duration: 3,
                        ease: "power3.out",
                      });
                    }, 1200);
                  }
                }}
              >
                NORTHERN LIGHTS
              </h1>

              {/* Tagline */}
              <p
                className="mt-10 max-w-xl text-base md:text-lg font-light opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 3s forwards",
                  color: "rgba(255,255,255,0.95)",
                  lineHeight: 1.8,
                  letterSpacing: "0.04em",
                }}
              >
                Where the sky breathes color.
                <br />
                A moment between earth and cosmos.
              </p>

              {/* CTA */}
              <div
                className="mt-14 opacity-0"
                style={{ animation: "fadeIn 1.5s ease-out 3.8s forwards" }}
              >
                <a
                  href="#phenomenon"
                  data-hover
                  className="group relative inline-flex items-center justify-center px-10 py-4 text-xs font-light uppercase tracking-wider transition-all"
                  style={{
                    border: "1px solid rgba(0,255,157,0.4)",
                    color: "#ffffff",
                    background: "transparent",
                    overflow: "hidden",
                  }}
                >
                  <span
                    className="absolute inset-0 transform translate-y-full transition-transform duration-700 group-hover:translate-y-0"
                    style={{ background: "rgba(0,255,157,0.15)" }}
                    aria-hidden
                  />
                  <span className="relative z-10">Witness the Phenomenon</span>
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
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <span className="text-[10px] uppercase tracking-[0.4em]">
                  Descend
                </span>
                <div
                  className="h-16 w-px"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,255,157,0.6), transparent)",
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
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <div>LAT 69.6492° N</div>
                <div>LON 18.9553° E</div>
                <div>KP INDEX 5.8</div>
              </div>
            </div>
            <div
              className="absolute top-6 right-6 opacity-0 text-right"
              style={{ animation: "fadeIn 2s ease-out 1s forwards" }}
              aria-hidden
            >
              <div
                className="text-[9px] uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <div>SOLAR WIND · 480 km/s</div>
                <div>MAG FIELD · Bz -8</div>
                <div>VISIBILITY · HIGH</div>
              </div>
            </div>
          </section>

          {/* ========================================
              PHENOMENON SECTION
              ======================================== */}
          <section
            id="phenomenon"
            className="relative py-40 px-6"
            style={{ background: "#02050f" }}
          >
            <div className="mx-auto max-w-4xl">
              <span
                className="text-[10px] uppercase tracking-[0.5em] mb-10 block opacity-0"
                style={{
                  animation: "fadeIn 1.5s ease-out 0.2s forwards",
                  color: "#00ff9d",
                }}
              >
                01 — The Science
              </span>
              <h2
                className="font-playfair text-4xl md:text-7xl font-light leading-tight mb-12 opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.4s forwards",
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                Solar wind meets
                <br />
                <span style={{ color: "#00ff9d", fontStyle: "italic" }}>
                  magnetic field.
                </span>
              </h2>
              <p
                className="text-lg md:text-xl font-light leading-relaxed mb-8 opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.6s forwards",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                Three layers of light, each at a different altitude, each moving
                at its own velocity. Charged particles from the sun, channeled
                by Earth&apos;s magnetic field, excite oxygen and nitrogen
                atoms. Green at 100km. Magenta at 200km. Cyan at 300km. Every
                pixel is a collision, rendered live.
              </p>
              <p
                className="text-base font-light leading-relaxed opacity-0"
                style={{
                  animation: "fadeIn 2s ease-out 0.8s forwards",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                Move your cursor. The solar wind shifts. The curtains drift.
              </p>
            </div>
          </section>

          {/* ========================================
              STATS SECTION
              ======================================== */}
          <section
            className="relative py-32 px-6"
            style={{ background: "#050a1a" }}
          >
            <div className="mx-auto max-w-4xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { val: "3", label: "Light Curtains", color: "#00ff9d" },
                  { val: "100km", label: "Green Altitude", color: "#00ff9d" },
                  { val: "200km", label: "Magenta Altitude", color: "#ff00aa" },
                  { val: "300km", label: "Cyan Altitude", color: "#00c8ff" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="text-center opacity-0"
                    style={{ animation: `fadeIn 1.5s ease-out ${0.2 + i * 0.1}s forwards` }}
                  >
                    <div
                      className="font-playfair text-3xl md:text-5xl font-bold mb-2"
                      style={{ color: stat.color }}
                    >
                      {stat.val}
                    </div>
                    <div
                      className="text-xs uppercase tracking-widest"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================
              FOOTER
              ======================================== */}
          <footer
            className="relative py-40 px-6 text-center"
            style={{ background: "#02050f" }}
          >
            <div className="mx-auto max-w-2xl">
              <span
                className="text-[10px] uppercase tracking-[0.5em] mb-10 block"
                style={{ color: "#00ff9d" }}
              >
                02 — Experience
              </span>
              <h2
                className="font-playfair text-4xl md:text-7xl font-light leading-tight mb-12"
                style={{
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                Chase the
                <br />
                <span style={{ color: "#00ff9d", fontStyle: "italic" }}>
                  impossible.
                </span>
              </h2>
              <a
                href="mailto:hello@northernlights.studio"
                data-hover
                className="inline-block text-lg font-light border-b pb-1 transition-colors hover:text-[#00ff9d]"
                style={{
                  borderColor: "rgba(0,255,157,0.3)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                hello@northernlights.studio
              </a>
              <p
                className="mt-20 text-[10px] uppercase tracking-[0.4em]"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                © 2026 Northern Lights · Built with hero-3d-awwwards skill v5
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
              background: #02050f;
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
              outline: 2px solid #00ff9d;
              outline-offset: 4px;
            }

            ::selection {
              background: #00ff9d;
              color: #02050f;
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
