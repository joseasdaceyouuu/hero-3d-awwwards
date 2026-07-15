"use client";

/**
 * Hero section nivel Awwwards.
 *
 * Stack: Next.js 16 + R3F + GSAP + Lenis (skill hero-3d-awwwards)
 * Arquetipo: 3 (Shaders GLSL) + 5 (Tipografía cinemática)
 *
 * Principios aplicados del skill:
 *   - C9: Una idea dominante (el shader fluid es el foco)
 *   - C10: Paleta ≤ 3 colores (#05050f, #ffffff, #ff0040)
 *   - C11: Timing cinematográfico (1.2s, power4.out)
 *   - C12: WebGL fallback (radial gradient)
 *   - C13: Cursor custom
 *   - C15: Contraste WCAG AA (texto blanco sobre navy oscuro)
 *   - C16: Texto semántico (h1, p, a)
 *   - C18: Keyboard nav (focus-visible en CTA)
 *   - C7: prefers-reduced-motion respetado (en ShaderBackground)
 */

import { ShaderBackground } from "@/components/hero/ShaderBackground";
import { CinematicText } from "@/components/hero/CinematicText";
import { CustomCursor } from "@/components/hero/CustomCursor";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subtle parallax on overlay text as user scrolls
  useEffect(() => {
    if (!heroRef.current || !overlayRef.current) return;

    const onScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const progress = Math.min(scrollY / heroHeight, 1);

      if (overlayRef.current) {
        gsap.to(overlayRef.current, {
          y: progress * -100,
          opacity: 1 - progress * 1.2,
          duration: 0.3,
          ease: "none",
          overwrite: true,
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <CustomCursor />

      {/* ========================================
          HERO SECTION
          ======================================== */}
      <section
        ref={heroRef}
        id="hero"
        className="relative h-screen w-full overflow-hidden"
        aria-label="Hero"
      >
        {/* Shader background (WebGL) */}
        {mounted && <ShaderBackground />}

        {/* Overlay gradient para legibilidad */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(5,5,15,0.4) 0%, transparent 60%)",
          }}
          aria-hidden
        />

        {/* Hero content */}
        <div
          ref={overlayRef}
          className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        >
          {/* Top label */}
          <div
            className="mb-8 opacity-0"
            style={{
              animation: "fadeInUp 0.8s ease-out 0.2s forwards",
            }}
          >
            <span
              className="text-xs uppercase tracking-[0.3em] font-light"
              style={{ color: "#ff0040", letterSpacing: "0.4em" }}
            >
              Creative Studio · 2026
            </span>
          </div>

          {/* Main headline */}
          <CinematicText
            text="FLOW STATE"
            className="font-playfair"
            delay={0.4}
            stagger={0.12}
            duration={1.4}
          />

          {/* Tagline */}
          <p
            className="mt-8 max-w-xl text-base md:text-lg font-light opacity-0"
            style={{
              animation: "fadeInUp 0.8s ease-out 1.2s forwards",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
            }}
          >
            We craft digital experiences where motion meets meaning.
            <br />
            Built for brands that refuse to be invisible.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-12 flex flex-col sm:flex-row gap-4 opacity-0"
            style={{
              animation: "fadeInUp 0.8s ease-out 1.6s forwards",
            }}
          >
            <a
              href="#work"
              data-hover
              className="group relative inline-flex items-center justify-center px-8 py-4 text-sm font-medium uppercase tracking-wider transition-all"
              style={{
                border: "1px solid #ff0040",
                color: "#ffffff",
                background: "transparent",
                overflow: "hidden",
              }}
            >
              <span
                className="absolute inset-0 transform translate-y-full transition-transform duration-500 group-hover:translate-y-0"
                style={{ background: "#ff0040" }}
                aria-hidden
              />
              <span className="relative z-10">View Work</span>
            </a>
            <a
              href="#contact"
              data-hover
              className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium uppercase tracking-wider transition-colors"
              style={{
                color: "rgba(255,255,255,0.7)",
                borderBottom: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              Get in touch
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0"
          style={{
            animation: "fadeIn 1s ease-out 2.4s forwards",
          }}
          aria-hidden
        >
          <div
            className="flex flex-col items-center gap-2"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em]">
              Scroll
            </span>
            <div
              className="h-12 w-px"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,0,64,0.8), transparent)",
                animation: "scrollLine 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </section>

      {/* ========================================
          ABOUT SECTION
          ======================================== */}
      <section
        id="about"
        className="relative py-32 px-6"
        style={{ background: "#05050f" }}
      >
        <div className="mx-auto max-w-4xl">
          <span
            className="text-xs uppercase tracking-[0.4em] mb-8 block"
            style={{ color: "#ff0040" }}
          >
            01 — About
          </span>
          <h2
            className="font-playfair text-4xl md:text-6xl font-bold leading-tight mb-8"
            style={{ letterSpacing: "-0.02em" }}
          >
            We design the
            <br />
            <span style={{ color: "#ff0040" }}>in-between</span> moments.
          </h2>
          <p
            className="text-lg md:text-xl font-light leading-relaxed"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Between the click and the conversion. Between the scroll and the
            story. Between what users expect and what they remember. Our work
            lives in those spaces — the microseconds where attention is won or
            lost, where brands become experiences.
          </p>
        </div>
      </section>

      {/* ========================================
          WORK SECTION
          ======================================== */}
      <section
        id="work"
        className="relative py-32 px-6"
        style={{ background: "#0a0a14" }}
      >
        <div className="mx-auto max-w-6xl">
          <span
            className="text-xs uppercase tracking-[0.4em] mb-8 block"
            style={{ color: "#ff0040" }}
          >
            02 — Selected Work
          </span>
          <h2
            className="font-playfair text-4xl md:text-6xl font-bold leading-tight mb-16"
            style={{ letterSpacing: "-0.02em" }}
          >
            Recent projects
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                title: "Aurora Labs",
                cat: "Brand · Web",
                year: "2026",
                desc: "Identity system and immersive site for a synthetic biology startup.",
              },
              {
                title: "Monolith",
                cat: "Product · 3D",
                year: "2025",
                desc: "Configurator with real-time WebGL rendering for architectural studio.",
              },
              {
                title: "Vessel",
                cat: "Editorial",
                year: "2025",
                desc: "Long-form storytelling platform with scroll-driven narrative.",
              },
              {
                title: "Echo",
                cat: "Mobile · Motion",
                year: "2024",
                desc: "Audio-reactive installation app for contemporary art museum.",
              },
            ].map((project, i) => (
              <a
                key={i}
                href="#"
                data-hover
                className="group block p-8 transition-all duration-500"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <span
                    className="text-xs uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {project.cat}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {project.year}
                  </span>
                </div>
                <h3
                  className="font-playfair text-2xl md:text-3xl font-bold mb-3 transition-colors duration-300 group-hover:text-[#ff0040]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {project.title}
                </h3>
                <p
                  className="text-sm font-light"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {project.desc}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          CONTACT / FOOTER
          ======================================== */}
      <footer
        id="contact"
        className="relative py-32 px-6 text-center"
        style={{ background: "#05050f" }}
      >
        <div className="mx-auto max-w-2xl">
          <span
            className="text-xs uppercase tracking-[0.4em] mb-8 block"
            style={{ color: "#ff0040" }}
          >
            03 — Let&apos;s talk
          </span>
          <h2
            className="font-playfair text-4xl md:text-7xl font-bold leading-tight mb-12"
            style={{ letterSpacing: "-0.03em" }}
          >
            Have a project
            <br />
            <span style={{ color: "#ff0040" }}>in mind?</span>
          </h2>
          <a
            href="mailto:hello@flux.studio"
            data-hover
            className="inline-block text-xl md:text-2xl font-light border-b pb-1 transition-colors hover:text-[#ff0040]"
            style={{ borderColor: "rgba(255,255,255,0.3)" }}
          >
            hello@flux.studio
          </a>
          <p
            className="mt-16 text-xs uppercase tracking-[0.3em]"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            © 2026 FLUX Studio · Built with hero-3d-awwwards skill
          </p>
        </div>
      </footer>

      {/* ========================================
          GLOBAL STYLES (injected)
          ======================================== */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          font-family: var(--font-inter), system-ui, sans-serif;
          background: #05050f;
          overflow-x: hidden;
        }

        .font-playfair {
          font-family: var(--font-playfair), serif;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
            transform: scaleY(0.3);
            transform-origin: bottom;
          }
        }

        /* Hide default cursor on desktop */
        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
        }

        /* Focus visible para accesibilidad (C18) */
        a:focus-visible,
        button:focus-visible {
          outline: 2px solid #ff0040;
          outline-offset: 4px;
        }

        /* Selection color */
        ::selection {
          background: #ff0040;
          color: #ffffff;
        }

        /* Smooth scroll fallback (Lenis handles modern browsers) */
        @media (prefers-reduced-motion: no-preference) {
          html {
            scroll-behavior: smooth;
          }
        }
      `}</style>
    </main>
  );
}
