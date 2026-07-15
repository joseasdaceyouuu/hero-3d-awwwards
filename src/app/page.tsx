"use client";

/**
 * CHROME SURFACE — Hero generado por Creator agent (GLM-5.2)
 *
 * Este hero fue generado automáticamente por el sistema de memoria:
 *   - 41 patrones inyectados (de 3 heroes anteriores + estándares 2026)
 *   - 13 anti-patterns a evitar
 *   - GLM-5.2 como Creator agent
 *
 * Cumple (según Creator):
 *   - PERF-1: IntersectionObserver pause-offscreen ✅
 *   - PERF-5: React.lazy + Suspense ✅
 *   - C15: Text opacity 0.95 para WCAG AA ✅
 *   - C18: focus-visible CSS ✅
 *   - C7: prefers-reduced-motion ✅
 *   - C12: WebGL fallback ✅
 *   - C9: Una idea dominante (chrome surface) ✅
 *   - C10: Paleta ≤ 3 colores (#0a0a0f, #c0c0c0, #00d4ff) ✅
 *   - C11: Timing 1.5s con power3.out ✅
 */

import { useEffect, useRef, useState, lazy, Suspense } from "react";
import gsap from "gsap";
import { MemoryDashboard } from "@/components/dashboard/MemoryDashboard";

// PERF-5: React.lazy + Suspense for WebGL component
const ChromeHero = lazy(() =>
  import("@/components/hero/ChromeHero").then((m) => ({
    default: m.ChromeHero,
  }))
);

export default function Home() {
  const [view, setView] = useState<"hero" | "dashboard">("hero");

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* View toggle */}
      <div
        className="fixed top-4 right-4 z-50 flex gap-1 p-1 border border-white/10"
        style={{ background: "rgba(10,10,15,0.8)", backdropFilter: "blur(10px)" }}
      >
        <button
          onClick={() => setView("hero")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "hero"
              ? "bg-[#c0c0c0] text-[#0a0a0f]"
              : "text-white/50 hover:text-white"
          }`}
        >
          Hero
        </button>
        <button
          onClick={() => setView("dashboard")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "dashboard"
              ? "bg-[#c0c0c0] text-[#0a0a0f]"
              : "text-white/50 hover:text-white"
          }`}
        >
          Memory
        </button>
      </div>

      {view === "dashboard" ? (
        <MemoryDashboard />
      ) : (
        <Suspense
          fallback={
            <div
              className="flex h-screen items-center justify-center"
              style={{ background: "#0a0a0f" }}
            >
              <div
                className="w-8 h-8 border-2 border-[#c0c0c0] border-t-transparent rounded-full animate-spin"
                aria-label="Loading"
              />
            </div>
          }
        >
          <ChromeHero />
        </Suspense>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          font-family: var(--font-inter), system-ui, sans-serif;
          background: #0a0a0f;
          overflow-x: hidden;
        }

        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
        }

        a:focus-visible,
        button:focus-visible {
          outline: 2px solid #c0c0c0;
          outline-offset: 4px;
        }

        ::selection {
          background: #c0c0c0;
          color: #0a0a0f;
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
