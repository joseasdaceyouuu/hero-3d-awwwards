"use client";

/**
 * COSMIC RESONANCE — Hero nivel Awwwards SOTD
 *
 * Combina 3 técnicas avanzadas simultáneamente:
 *   1. Shader procedural con curl noise (CosmicBackground) — fondo tipo fluid
 *   2. 2000 partículas instanced siguiendo curl noise (ParticleField)
 *   3. Tipografía con SVG displacement filter que reacciona al mouse (DistortedText)
 *
 * Stack: Next.js 16 + R3F + GSAP + Lenis + SVG filters
 * Paleta: #030014 (deep) + #ffffff (stars) + #00d4ff (cyan accent)
 *
 * Principios del skill aplicados:
 *   - C9: Una idea dominante — el curl noise conecta fondo + partículas + texto
 *   - C10: Paleta ≤ 3 colores
 *   - C11: Timing cinematográfico (1.4s, power4.out)
 *   - C7: prefers-reduced-motion respetado
 *   - C12: WebGL fallback (radial gradient)
 *   - C13: Cursor custom
 *   - C15: Contraste WCAG AA
 *   - C16: HTML semántico
 *   - C18: focus-visible
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CosmicBackground } from "@/components/hero/CosmicBackground";
import { ParticleField } from "@/components/hero/ParticleField";
import { DistortedText } from "@/components/hero/DistortedText";
import { CustomCursor } from "@/components/hero/CustomCursor";

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  // Scroll-driven parallax sobre overlay
  useEffect(() => {
    if (!overlayRef.current) return;

    const onScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const progress = Math.min(scrollY / heroHeight, 1);

      gsap.to(overlayRef.current, {
        y: -progress * 150,
        opacity: 1 - progress * 1.5,
        scale: 1 - progress * 0.08,
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
      <CustomCursor />

      {/* ========================================
          HERO SECTION — Cosmic Resonance
          ======================================== */}
      <section
        ref={heroRef}
        id="hero"
        className="relative h-screen w-full overflow-hidden"
        aria-label="Cosmic Resonance Hero"
      >
        {/* Layer 1: Cosmic shader background */}
        {mounted && <CosmicBackground />}

        {/* Layer 2: 2000 particles following curl noise */}
        {mounted && !reducedMotion && <ParticleField reducedMotion={reducedMotion} />}

        {/* Layer 3: Gradient overlay para legibilidad */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(3,0,20,0.5) 0%, transparent 60%)",
          }}
          aria-hidden
        />

        {/* Layer 4: Hero content */}
        <div
          ref={overlayRef}
          className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        >
          {/* Top label */}
          <div
            className="mb-8 opacity-0"
            style={{ animation: "fadeInUp 0.8s ease-out 0.2s forwards" }}
          >
            <span
              className="text-xs uppercase font-light"
              style={{ color: "#00d4ff", letterSpacing: "0.5em" }}
            >
              Generative · Interactive · 2026
            </span>
          </div>

          {/* Main headline with SVG distortion */}
          <DistortedText
            text="COSMIC RESONANCE"
            className="font-playfair"
            delay={0.4}
            stagger={0.1}
            duration={1.6}
            accentColor="#00d4ff"
          />

          {/* Tagline */}
          <p
            className="mt-10 max-w-2xl text-base md:text-lg font-light opacity-0"
            style={{
              animation: "fadeInUp 0.8s ease-out 1.4s forwards",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.7,
              letterSpacing: "0.02em",
            }}
          >
            Two thousand particles dancing through curl noise fields.
            <br />
            Type that breathes with your cursor. A web that feels alive.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-14 flex flex-col sm:flex-row gap-6 opacity-0"
            style={{ animation: "fadeInUp 0.8s ease-out 1.8s forwards" }}
          >
            <a
              href="#experience"
              data-hover
              className="group relative inline-flex items-center justify-center px-10 py-4 text-sm font-medium uppercase tracking-wider transition-all"
              style={{
                border: "1px solid #00d4ff",
                color: "#ffffff",
                background: "transparent",
                overflow: "hidden",
              }}
            >
              <span
                className="absolute inset-0 transform translate-y-full transition-transform duration-500 group-hover:translate-y-0"
                style={{ background: "#00d4ff" }}
                aria-hidden
              />
              <span className="relative z-10 group-hover:text-[#030014] transition-colors duration-300">
                Begin Experience
              </span>
            </a>
            <a
              href="#tech"
              data-hover
              className="inline-flex items-center justify-center px-10 py-4 text-sm font-medium uppercase tracking-wider transition-colors hover:text-[#00d4ff]"
              style={{
                color: "rgba(255,255,255,0.6)",
                borderBottom: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              The Technology
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0"
          style={{ animation: "fadeIn 1s ease-out 2.6s forwards" }}
          aria-hidden
        >
          <div
            className="flex flex-col items-center gap-2"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em]">
              Explore
            </span>
            <div
              className="h-12 w-px"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,212,255,0.8), transparent)",
                animation: "scrollLine 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* Corner HUD elements — Awwwards detail */}
        <div
          className="absolute top-6 left-6 opacity-0"
          style={{ animation: "fadeIn 1s ease-out 0.4s forwards" }}
          aria-hidden
        >
          <div
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <div>LAT 51.5074° N</div>
            <div>LON 0.1278° W</div>
          </div>
        </div>
        <div
          className="absolute top-6 right-6 opacity-0 text-right"
          style={{ animation: "fadeIn 1s ease-out 0.4s forwards" }}
          aria-hidden
        >
          <div
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <div>SYS · ONLINE</div>
            <div>FPS · 60</div>
          </div>
        </div>
      </section>

      {/* ========================================
          TECHNOLOGY SECTION
          ======================================== */}
      <section
        id="tech"
        className="relative py-32 px-6"
        style={{ background: "#030014" }}
      >
        <div className="mx-auto max-w-6xl">
          <span
            className="text-xs uppercase tracking-[0.4em] mb-8 block"
            style={{ color: "#00d4ff" }}
          >
            01 — The Technology
          </span>
          <h2
            className="font-playfair text-4xl md:text-6xl font-bold leading-tight mb-16"
            style={{ letterSpacing: "-0.02em" }}
          >
            Three layers,
            <br />
            <span style={{ color: "#00d4ff" }}>one vision.</span>
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Curl Noise Field",
                tech: "WebGL · GLSL",
                desc: "Procedural shader computing curl noise in real-time. Creates a divergence-free vector field that drives the entire visual — the same mathematics used in fluid dynamics simulations.",
              },
              {
                num: "02",
                title: "Particle System",
                tech: "GPU Instancing",
                desc: "2,000 particles, one draw call. Each particle samples the curl noise in its vertex shader and flows independently. Mouse position exerts radial repulsion force.",
              },
              {
                num: "03",
                title: "Distorted Type",
                tech: "SVG Filters",
                desc: "feTurbulence + feDisplacementMap applied to typography. The displacement scale and frequency react to mouse position — the text literally breathes with your cursor.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-8 transition-all duration-500 hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div
                  className="text-xs uppercase tracking-widest mb-4"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {item.tech}
                </div>
                <div
                  className="font-playfair text-5xl font-bold mb-4"
                  style={{ color: "#00d4ff", opacity: 0.3 }}
                >
                  {item.num}
                </div>
                <h3
                  className="text-xl font-bold mb-4"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm font-light leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          EXPERIENCE SECTION
          ======================================== */}
      <section
        id="experience"
        className="relative py-32 px-6"
        style={{ background: "#08001c" }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <span
            className="text-xs uppercase tracking-[0.4em] mb-8 block"
            style={{ color: "#00d4ff" }}
          >
            02 — The Experience
          </span>
          <h2
            className="font-playfair text-4xl md:text-7xl font-bold leading-tight mb-12"
            style={{ letterSpacing: "-0.03em" }}
          >
            Move your cursor.
            <br />
            <span style={{ color: "#00d4ff" }}>Watch it respond.</span>
          </h2>
          <p
            className="text-lg md:text-xl font-light leading-relaxed mb-12"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Every pixel is computed. Every particle has a trajectory. Every
            letter has a force field. This is not video. This is not
            animation. This is mathematics, rendered live, in your browser,
            at sixty frames per second.
          </p>
          <div
            className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto"
            style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2rem" }}
          >
            {[
              { val: "2000", label: "Particles" },
              { val: "60", label: "FPS Target" },
              { val: "1", label: "Draw Call" },
            ].map((stat, i) => (
              <div key={i}>
                <div
                  className="font-playfair text-4xl md:text-5xl font-bold mb-2"
                  style={{ color: "#00d4ff" }}
                >
                  {stat.val}
                </div>
                <div
                  className="text-xs uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.5)" }}
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
        className="relative py-32 px-6 text-center"
        style={{ background: "#030014" }}
      >
        <div className="mx-auto max-w-2xl">
          <span
            className="text-xs uppercase tracking-[0.4em] mb-8 block"
            style={{ color: "#00d4ff" }}
          >
            03 — Connect
          </span>
          <h2
            className="font-playfair text-4xl md:text-7xl font-bold leading-tight mb-12"
            style={{ letterSpacing: "-0.03em" }}
          >
            Let&apos;s build
            <br />
            <span style={{ color: "#00d4ff" }}>the impossible.</span>
          </h2>
          <a
            href="mailto:hello@cosmic.studio"
            data-hover
            className="inline-block text-xl md:text-2xl font-light border-b pb-1 transition-colors hover:text-[#00d4ff]"
            style={{ borderColor: "rgba(255,255,255,0.3)" }}
          >
            hello@cosmic.studio
          </a>
          <p
            className="mt-16 text-xs uppercase tracking-[0.3em]"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            © 2026 Cosmic Resonance · Built with hero-3d-awwwards skill v5
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
          background: #030014;
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

        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
        }

        a:focus-visible,
        button:focus-visible {
          outline: 2px solid #00d4ff;
          outline-offset: 4px;
        }

        ::selection {
          background: #00d4ff;
          color: #030014;
        }

        @media (prefers-reduced-motion: no-preference) {
          html {
            scroll-behavior: smooth;
          }
        }
      `}</style>
    </main>
  );
}
