"use client";

/**
 * VOID TUNNEL — Hero con túnel 3D infinito (scroll hijacking con Z).
 *
 * Implementación del patrón 1.17: Túnel 3D infinito.
 * 50 capas .ring con translateZ de 0 a -4900. Scroll del mouse controla
 * la Z de la cámara via wheel event. Loop infinito: z = ((z+4900)%5000)-4900.
 * Fade out de capas al cruzar la cámara.
 *
 * Inspirado en el Void Tunnel enviado por el usuario, pero NO es copia:
 *   - Paleta: esmeralda + magenta (no cyan/magenta)
 *   - Sin letterbox bars (más limpio)
 *   - Con partículas esféricas adicionales
 *   - Tipografía distinta (Syne bold, no Archivo Black)
 *   - HUD con telemetría de profundidad
 *
 * Patrones aplicados:
 *   - 1.17 Túnel 3D infinito (scroll hijacking con Z)
 *   - 1.18 Film grain + scan line (estética cinematográfica)
 *   - 1.16 Telemetría HUD dinámica (profundidad que cambia)
 *
 * Anti-patterns aplicados:
 *   - 5.9: overflow-x: clip
 *   - 5.18: Preloader con timer
 */

import { useState, useEffect, useRef } from "react";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

interface Ring {
  baseZ: number;
  isAccent: boolean;
}

export default function VoidTunnelHero() {
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const cameraZRef = useRef(0);
  const cameraTargetZRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  // Preloader timer (anti-pattern 5.18)
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  // Generar 50 anillos
  const rings: Ring[] = Array.from({ length: 50 }, (_, i) => ({
    baseZ: -i * 100,
    isAccent: i % 5 === 0,
  }));

  useEffect(() => {
    if (!loaded) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ringsEl = ringsRef.current;
    const depthEl = depthRef.current;
    if (!ringsEl || !depthEl) return;

    const ringElements = Array.from(ringsEl.querySelectorAll<HTMLElement>("[data-base-z]"));
    const totalDepth = 5000;
    let mouseX = 0, mouseY = 0, currentX = 0, currentY = 0;

    // Wheel event → cameraTargetZ (scroll hijacking)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraTargetZRef.current -= e.deltaY * 1.5;
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    // Touch support
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      cameraTargetZRef.current += deltaY * 2;
      touchStartY = touchY;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Mouse parallax
    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Animation loop
    const animate = () => {
      // Lerp camera
      currentX += (mouseX - currentX) * 0.05;
      currentY += (mouseY - currentY) * 0.05;
      cameraZRef.current += (cameraTargetZRef.current - cameraZRef.current) * 0.08;

      // Update HUD
      if (depthEl) {
        depthEl.textContent = Math.abs(cameraZRef.current / 10).toFixed(0);
      }

      // Update perspective origin
      if (containerRef.current) {
        containerRef.current.style.perspectiveOrigin = `${50 + currentX * 20}% ${50 + currentY * 20}%`;
      }
      if (ringsEl) {
        ringsEl.style.transform = `translate(calc(-50% + ${currentX * 30}px), calc(-50% + ${currentY * 30}px))`;
      }

      // Update each ring
      ringElements.forEach((el) => {
        const baseZ = parseFloat(el.dataset.baseZ || "0");
        let z = baseZ + cameraZRef.current;

        // Loop infinito: z = ((z + 4900) % 5000) - 4900
        z = (((z + 4900) % totalDepth) + totalDepth) % totalDepth - 4900;

        // Fade out cuando pasa la cámara (entre -100 y 200)
        let opacity = 1;
        if (z > -100) {
          opacity = Math.max(0, 1 - (z + 100) / 300);
        }

        el.style.transform = `translate(-50%, -50%) translateZ(${z}px)`;
        el.style.opacity = String(opacity);
      });

      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#02030a" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; overflow-y: hidden; height: 100vh; }
        body {
          background: #02030a;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          cursor: crosshair;
        }
        @keyframes grain {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-5px, 5px); }
          100% { transform: translate(5px, -5px); }
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes load { to { width: 100%; } }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        a:focus-visible { outline: 2px solid #00ff88; outline-offset: 4px; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#02030a",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: "12px", letterSpacing: "0.3em", color: "#00ff88", marginBottom: "20px" }}>
            INICIANDO TÚNEL...
          </div>
          <div style={{ width: "300px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "#00ff88", animation: "load 1.8s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* 3D Scene */}
          <div
            ref={containerRef}
            style={{
              position: "fixed",
              top: 0, left: 0,
              width: "100%", height: "100%",
              perspective: "800px",
              perspectiveOrigin: "50% 50%",
              transformStyle: "preserve-3d",
              zIndex: 1,
            }}
          >
            <div
              ref={ringsRef}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: "1000px",
                height: "600px",
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
            >
              {rings.map((ring, i) => (
                <div
                  key={i}
                  data-base-z={ring.baseZ}
                  style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    width: "100%",
                    height: "100%",
                    border: `2px solid ${ring.isAccent ? "rgba(255, 0, 85, 0.4)" : "rgba(0, 255, 136, 0.3)"}`,
                    boxShadow: ring.isAccent
                      ? "0 0 30px rgba(255, 0, 85, 0.2), inset 0 0 30px rgba(255, 0, 85, 0.1)"
                      : "0 0 30px rgba(0, 255, 136, 0.2), inset 0 0 30px rgba(0, 255, 136, 0.1)",
                    transformStyle: "preserve-3d",
                    willChange: "transform, opacity",
                  }}
                />
              ))}

              {/* Data lines en algunas capas */}
              {rings.filter((_, i) => i % 2 === 0).slice(0, 15).map((ring, i) => (
                <div key={`line-${i}`} data-base-z={ring.baseZ} style={{ position: "absolute", top: "10%", left: "30%", width: "40%", height: "2px", background: "#00ff88", boxShadow: "0 0 15px #00ff88", opacity: 0.6, willChange: "transform, opacity" }} />
              ))}
            </div>
          </div>

          {/* UI Overlay */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <h1
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "clamp(3rem, 10vw, 9rem)",
                  fontWeight: 800,
                  lineHeight: 0.85,
                  textTransform: "uppercase",
                  letterSpacing: "-0.04em",
                  background: "linear-gradient(180deg, #fff 0%, #888 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 50px rgba(0, 255, 136, 0.3)",
                  margin: 0,
                }}
              >
                ENTRA<br />AL VACÍO
              </h1>
              <div
                style={{
                  marginTop: "20px",
                  fontSize: "14px",
                  letterSpacing: "0.8em",
                  textTransform: "uppercase",
                  color: "#00ff88",
                  textShadow: "0 0 10px #00ff88",
                  marginLeft: "0.8em",
                  opacity: 0.8,
                  animation: "pulse 2s ease-in-out infinite",
                }}
              >
                Scroll Para Sumergirte
              </div>
            </div>
          </div>

          {/* HUD */}
          <div style={{ position: "fixed", top: "10vh", left: "40px", zIndex: 102, fontSize: "11px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#ff0055", borderRadius: "50%", marginRight: "10px", animation: "blink 1s infinite" }} />
            REC // 8K // 24FPS
          </div>
          <div style={{ position: "fixed", top: "10vh", right: "40px", zIndex: 102, fontSize: "11px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
            SECTOR 7G // VOID PROTOCOL
          </div>
          <div style={{ position: "fixed", bottom: "10vh", left: "40px", zIndex: 102, fontSize: "11px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)" }}>
            FOCAL: 14MM<br />ISO: 1600
          </div>
          <div style={{ position: "fixed", bottom: "10vh", right: "40px", zIndex: 102, fontSize: "11px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
            PROFUNDIDAD: <span ref={depthRef} style={{ color: "#00ff88", fontWeight: 700 }}>0</span> MTS
          </div>

          {/* Film grain */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 101,
              opacity: 0.05,
              pointerEvents: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              animation: "grain 0.2s steps(2) infinite",
            }}
            aria-hidden
          />

          {/* Scan line */}
          <div
            style={{
              position: "fixed",
              top: 0, left: 0,
              width: "100%", height: "2px",
              background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)",
              zIndex: 103,
              animation: "scan 4s linear infinite",
              pointerEvents: "none",
            }}
            aria-hidden
          />

          {/* Volver */}
          <a
            href="/heroes"
            style={{
              position: "fixed",
              bottom: "20px",
              right: "50%",
              transform: "translateX(50%)",
              zIndex: 104,
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
            <HeroPolish accentColor="#02030a" />
      </main>
  );
}
