"use client";

/**
 * KINETIC — Hero con entrada desde 4 direcciones.
 *
 * El contenido entra desde los 4 puntos cardinales en secuencia:
 * 1. Título entra desde la IZQUIERDA (translateX -100vw → 0)
 * 2. Subtítulo entra desde la DERECHA (translateX 100vw → 0)
 * 3. Stats entran desde ARRIBA (translateY -100vh → 0)
 * 4. CTA entra desde ABAJO (translateY 100vh → 0)
 * 5. Todo se ensambla en el centro
 *
 * Después del ensamblaje, cada elemento reacciona al cursor:
 * - Título: magnetic effect
 * - Stats: parallax individual
 * - CTA: scale + glow
 *
 * Fondo: grid que se deforma con el cursor (gravity well)
 *
 * NUEVAS TÉCNICAS:
 *   - Entrada secuencial desde 4 direcciones
 *   - Grid que se deforma con cursor (gravity well CSS)
 *   - Parallax individual por elemento
 *   - Reveal con clip-path direccional
 */

import { useState, useEffect, useRef } from "react";

export default function KineticHero() {
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState(0); // 0=preloader, 1=izq, 2=der, 3=arriba, 4=abajo, 5=ensamblado
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, [loaded]);

  // Secuencia de entrada: cada 400ms cambia de fase
  useEffect(() => {
    if (!loaded) return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPhase(1), 100));   // Título desde izq
    timers.push(window.setTimeout(() => setPhase(2), 500));   // Subtítulo desde der
    timers.push(window.setTimeout(() => setPhase(3), 900));   // Stats desde arriba
    timers.push(window.setTimeout(() => setPhase(4), 1300));  // CTA desde abajo
    timers.push(window.setTimeout(() => setPhase(5), 1700));  // Ensamblado
    return () => timers.forEach(clearTimeout);
  }, [loaded]);

  // Mouse tracking
  useEffect(() => {
    if (!loaded) return;
    const onMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [loaded]);

  // Calcular transforms de entrada
  const titleTransform = phase >= 1 ? "translateX(0)" : "translateX(-100vw)";
  const subtitleTransform = phase >= 2 ? "translateX(0)" : "translateX(100vw)";
  const statsTransform = phase >= 3 ? "translateY(0)" : "translateY(-100vh)";
  const ctaTransform = phase >= 4 ? "translateY(0)" : "translateY(100vh)";

  // Parallax post-ensamblaje
  const parallax = phase >= 5;
  const titleParallax = parallax ? `translate(${mouse.x * 8}px, ${mouse.y * 5}px)` : "";
  const subtitleParallax = parallax ? `translate(${mouse.x * -12}px, ${mouse.y * 3}px)` : "";
  const statsParallax = parallax ? `translate(${mouse.x * 5}px, ${mouse.y * -8}px)` : "";
  const ctaParallax = parallax ? `translate(${mouse.x * 3}px, ${mouse.y * -3}px) scale(${1 + Math.abs(mouse.x) * 0.02})` : "";

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#06060a", overflowY: "hidden" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; overflow-y: hidden; height: 100vh; }
        body { background: #06060a; color: #fff; font-family: 'JetBrains Mono', monospace; cursor: crosshair; }
        @keyframes load { to { width: 100%; } }
        @keyframes gridPulse { 0%, 100% { opacity: 0.08; } 50% { opacity: 0.15; } }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#06060a", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, color: "#00f3ff", letterSpacing: "0.15em", marginBottom: "20px" }}>KINETIC</div>
          <div style={{ width: "200px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", height: "100%", width: "0%", background: "#00f3ff", animation: "load 1.5s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <section className="relative w-full h-screen flex items-center justify-center overflow-hidden" ref={containerRef} aria-label="KINETIC — Hero con entrada desde 4 direcciones">
          {/* === FONDO: Grid que se deforma con cursor (gravity well) === */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "-10%",
              zIndex: 1,
              backgroundImage: `
                linear-gradient(rgba(0,243,255,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,243,255,0.08) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
              transform: `perspective(800px) rotateX(${mouse.y * 5}deg) rotateY(${mouse.x * 5}deg) translate(${mouse.x * 20}px, ${mouse.y * 20}px)`,
              transition: "transform 0.1s ease-out",
              animation: "gridPulse 4s ease-in-out infinite",
            }}
          />

          {/* Glow radial que sigue al cursor */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: `${50 + mouse.x * 30}%`,
              top: `${50 + mouse.y * 30}%`,
              width: "600px",
              height: "600px",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, rgba(0,243,255,0.08) 0%, transparent 60%)",
              zIndex: 2,
              transition: "all 0.15s ease-out",
              pointerEvents: "none",
            }}
          />

          {/* === CONTENIDO === */}
          <div className="relative z-10 text-center px-6 max-w-4xl">
            {/* TÍTULO — entra desde IZQUIERDA */}
            <div
              style={{
                transform: `${titleTransform} ${titleParallax}`,
                transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform",
              }}
            >
              {/* Flecha indicadora de dirección */}
              {phase < 1 && (
                <div style={{ position: "fixed", left: "20px", top: "50%", transform: "translateY(-50%)", fontSize: "40px", color: "#00f3ff", opacity: 0.4, animation: "gridPulse 1s ease-in-out infinite" }}>→</div>
              )}
              <h1 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(60px, 12vw, 140px)",
                fontWeight: 800,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                textTransform: "uppercase",
                background: "linear-gradient(135deg, #fff 0%, #00f3ff 50%, #ff0055 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: 0,
              }}>KINETIC</h1>
            </div>

            {/* SUBTÍTULO — entra desde DERECHA */}
            <div
              style={{
                transform: `${subtitleTransform} ${subtitleParallax}`,
                transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "0s",
                willChange: "transform",
              }}
            >
              {phase < 2 && phase >= 1 && (
                <div style={{ position: "fixed", right: "20px", top: "50%", transform: "translateY(-50%)", fontSize: "40px", color: "#ff0055", opacity: 0.4, animation: "gridPulse 1s ease-in-out infinite" }}>←</div>
              )}
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "clamp(14px, 1.8vw, 18px)",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                marginTop: "20px",
              }}>Entrada desde 4 direcciones</p>
            </div>

            {/* Deco line — aparece con el subtítulo */}
            <div style={{
              width: "60px",
              height: "1px",
              background: "linear-gradient(90deg, transparent, #00f3ff, transparent)",
              margin: "40px auto",
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "scaleX(1)" : "scaleX(0)",
              transition: "all 0.5s ease",
            }} aria-hidden />

            {/* STATS — entran desde ARRIBA */}
            <div
              style={{
                transform: `${statsTransform} ${statsParallax}`,
                transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform",
              }}
            >
              {phase < 3 && phase >= 2 && (
                <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", fontSize: "40px", color: "#aaff00", opacity: 0.4, animation: "gridPulse 1s ease-in-out infinite" }}>↓</div>
              )}
              <div className="flex justify-center gap-10 flex-wrap mb-10">
                {[
                  { val: "4", label: "DIRECCIONES", color: "#00f3ff" },
                  { val: "400ms", label: "DELAY", color: "#ff0055" },
                  { val: "0.7s", label: "DURACIÓN", color: "#aaff00" },
                  { val: "∞", label: "PARALLAX", color: "#ffaa00" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA — entra desde ABAJO */}
            <div
              style={{
                transform: `${ctaTransform} ${ctaParallax}`,
                transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform",
              }}
            >
              {phase < 4 && phase >= 3 && (
                <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", fontSize: "40px", color: "#ffaa00", opacity: 0.4, animation: "gridPulse 1s ease-in-out infinite" }}>↑</div>
              )}
              <a
                href="/heroes"
                style={{
                  display: "inline-block",
                  padding: "16px 44px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#06060a",
                  background: "linear-gradient(135deg, #00f3ff, #aaff00)",
                  textDecoration: "none",
                  borderRadius: "0",
                  transition: "all 0.3s",
                  boxShadow: parallax ? `0 0 ${30 + Math.abs(mouse.x) * 30}px rgba(0,243,255,${0.3 + Math.abs(mouse.x) * 0.3})` : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(0,243,255,0.6)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(0,243,255,0.3)"; }}
              >
                Ver Galería →
              </a>
            </div>
          </div>

          {/* === INDICADOR DE FASE === */}
          <div style={{
            position: "fixed",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            gap: "8px",
          }} aria-hidden>
            {["IZQ", "DER", "↑", "↓"].map((dir, i) => (
              <div key={i} style={{
                width: phase > i ? "32px" : "8px",
                height: "4px",
                borderRadius: "2px",
                background: phase > i ? ["#00f3ff", "#ff0055", "#aaff00", "#ffaa00"][i] : "rgba(255,255,255,0.2)",
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: phase > i ? `0 0 10px ${["#00f3ff", "#ff0055", "#aaff00", "#ffaa00"][i]}` : "none",
              }} />
            ))}
          </div>

          {/* === HUD === */}
          <div style={{ position: "fixed", top: "30px", left: "40px", zIndex: 20, fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(0,243,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }} aria-hidden>
            <div>FASE · {phase}/5</div>
            <div>DIRECCIONES · 4</div>
          </div>
          <div style={{ position: "fixed", top: "30px", right: "40px", zIndex: 20, fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,0,85,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "right" }} aria-hidden>
            <div>GRID · GRAVITY WELL</div>
            <div>PARALLAX · {parallax ? "ON" : "OFF"}</div>
          </div>

          {/* === Volver === */}
          <a href="/heroes" style={{ position: "fixed", bottom: "30px", right: "50%", transform: "translateX(50%)", zIndex: 20, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase", textDecoration: "none" }} aria-label="Volver a galería">← Galería</a>

          {/* Descripción de la técnica */}
          {phase >= 5 && (
            <div style={{
              position: "fixed",
              bottom: "60px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 20,
              fontSize: "10px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0,
              animation: "gridPulse 3s ease-in-out 1s infinite",
            }} aria-hidden>
              [ Mueve el cursor — todo reacciona ]
            </div>
          )}
        </section>
      )}
    </main>
  );
}
