"use client";

/**
 * CAFÉ ALTURAS PREMIUM — Video scroll con 5 escenas DRÁSTICAS.
 *
 * 5 escenas que cambian de forma OBVIA con scroll:
 * 0%: Pantalla negra + "ALTURAS" gigante dorado
 * 20%: Sol naranja ENORME en el centro
 * 40%: 30 partículas doradas flotando
 * 60%: Paisaje con montañas SVG + sol
 * 80%: Producto final + CTA
 *
 * Cada escena tiene colores y formas RADICALMENTE distintas.
 */

import { useState, useEffect } from "react";

export default function CafePremiumPage() {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) setProgress(Math.min(Math.max(window.scrollY / max, 0), 1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [loaded]);

  const p = progress;
  const s1 = Math.max(0, 1 - p * 3.5);
  const s2 = p > 0.12 && p < 0.45 ? 1 : p <= 0.12 ? 0 : Math.max(0, 1 - (p - 0.45) * 4);
  const s3 = p > 0.32 && p < 0.65 ? 1 : p <= 0.32 ? 0 : Math.max(0, 1 - (p - 0.65) * 4);
  const s4 = p > 0.52 && p < 0.85 ? 1 : p <= 0.52 ? 0 : Math.max(0, 1 - (p - 0.85) * 5);
  const s5 = p > 0.78 ? Math.min(1, (p - 0.78) * 5) : 0;

  const bg = p < 0.2 ? "#0a0503" : p < 0.4 ? "#2a1505" : p < 0.6 ? "#1a0f08" : p < 0.8 ? "#3a2510" : "#0a0503";

  return (
    <main style={{ overflowX: "clip", background: bg, transition: "background 0.3s" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { overflow-x: clip; }
        body { overflow-x: clip; font-family: 'Inter', sans-serif; }
        @keyframes load { to { width: 100%; } }
        @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
      `}</style>

      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#0a0503", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontStyle: "italic", color: "#D4A05E", letterSpacing: "0.2em", marginBottom: "20px" }}>ALTURAS</div>
          <div style={{ width: "200px", height: "2px", background: "rgba(212,160,94,0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", height: "100%", width: "0%", background: "#D4A05E", animation: "load 1.5s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* SCENE 1: TÍTULO */}
          <div style={{ position: "fixed", inset: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: s1, transition: "opacity 0.3s" }}>
            <div style={{ position: "absolute", width: `${300 + p * 500}px`, height: `${300 + p * 500}px`, borderRadius: "50%", background: `radial-gradient(circle, rgba(212,160,94,${0.15 + p * 0.3}) 0%, transparent 70%)` }} />
            <div style={{ textAlign: "center", zIndex: 2 }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: `clamp(60px, ${12 - p * 4}vw, ${150 - p * 50}px)`, fontWeight: 500, color: "#F5E6D3", letterSpacing: "0.04em", textShadow: `0 0 ${30 + p * 50}px rgba(212,160,94,${0.5 + p * 0.5})`, transform: `scale(${1 + p * 0.3})`, margin: 0 }}>ALTURAS</h1>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", color: "#D4A05E", letterSpacing: "0.4em", textTransform: "uppercase", marginTop: "16px", opacity: 1 - p * 2 }}>Café de altura · 1200msnm</p>
            </div>
          </div>

          {/* SCENE 2: SOL NARANJA */}
          <div style={{ position: "fixed", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: s2, transition: "opacity 0.3s" }}>
            <div style={{ width: `${200 + (p - 0.12) * 600}px`, height: `${200 + (p - 0.12) * 600}px`, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #FFE5A0 0%, #FF9500 30%, #FF5500 60%, #8B2200 100%)", boxShadow: `0 0 ${100 + p * 200}px rgba(255,149,0,0.6), 0 0 ${200 + p * 400}px rgba(255,85,0,0.3)`, animation: "pulse 3s ease-in-out infinite" }} />
            <div style={{ position: "absolute", textAlign: "center" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 8vw, 80px)", fontWeight: 300, fontStyle: "italic", color: "#1a0503", textShadow: "0 0 20px rgba(255,255,255,0.5)", margin: 0 }}>El sol madura</h2>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "rgba(26,5,3,0.6)", letterSpacing: "0.3em", textTransform: "uppercase", marginTop: "12px" }}>14 horas de luz · 1200msnm</p>
            </div>
          </div>

          {/* SCENE 3: PARTÍCULAS */}
          <div style={{ position: "fixed", inset: 0, zIndex: 3, opacity: s3, transition: "opacity 0.3s", background: "radial-gradient(ellipse at center, #1a0f08 0%, #0a0503 100%)" }}>
            {Array.from({ length: 30 }).map((_, i) => {
              const angle = (i / 30) * Math.PI * 2;
              const dist = 10 + (i % 5) * 8;
              return (
                <div key={i} style={{ position: "absolute", left: `${50 + Math.cos(angle) * dist}%`, top: `${50 + Math.sin(angle) * dist}%`, width: `${4 + (i % 3) * 4}px`, height: `${4 + (i % 3) * 4}px`, borderRadius: "50%", background: i % 3 === 0 ? "#FFE5A0" : "#D4A05E", boxShadow: `0 0 15px ${i % 3 === 0 ? "#FFE5A0" : "#D4A05E"}`, animation: `float ${2 + (i % 3)}s ease-in-out infinite ${i * 0.1}s` }} />
              );
            })}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 8vw, 80px)", fontWeight: 300, fontStyle: "italic", color: "#D4A05E", textShadow: "0 0 40px rgba(212,160,94,0.5)", margin: 0 }}>Libera su esencia</h2>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "rgba(212,160,94,0.5)", letterSpacing: "0.3em", textTransform: "uppercase", marginTop: "12px" }}>48h fermentación · tueste a leña</p>
              </div>
            </div>
          </div>

          {/* SCENE 4: PAISAJE */}
          <div style={{ position: "fixed", inset: 0, zIndex: 4, opacity: s4, transition: "opacity 0.3s", background: "linear-gradient(180deg, #3a2510 0%, #5a3520 40%, #2a1810 100%)" }}>
            <div style={{ position: "absolute", top: "25%", right: "20%", width: "120px", height: "120px", borderRadius: "50%", background: "radial-gradient(circle, #FFE5A0 0%, #FF9500 50%, transparent 100%)", boxShadow: "0 0 80px rgba(255,149,0,0.5)" }} />
            <svg style={{ position: "absolute", bottom: 0, width: "100%", height: "50%" }} viewBox="0 0 1440 400" preserveAspectRatio="none">
              <path d="M0,400 L0,250 L200,150 L400,220 L600,100 L800,180 L1000,80 L1200,200 L1440,120 L1440,400 Z" fill="#1a0f08" opacity="0.9" />
              <path d="M0,400 L0,320 L300,240 L500,300 L700,200 L900,280 L1100,220 L1300,300 L1440,250 L1440,400 Z" fill="#0a0503" opacity="0.8" />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(60,40,20,0.6), transparent)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 8vw, 80px)", fontWeight: 300, fontStyle: "italic", color: "#F5E6D3", textShadow: "0 0 30px rgba(0,0,0,0.8)", margin: 0, textAlign: "center" }}>El valle espera</h2>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "rgba(245,230,211,0.5)", letterSpacing: "0.3em", textTransform: "uppercase", marginTop: "12px" }}>Valle Central · Chile</p>
            </div>
          </div>

          {/* SCENE 5: PRODUCTO */}
          <div style={{ position: "fixed", inset: 0, zIndex: 5, opacity: s5, transition: "opacity 0.3s", background: "radial-gradient(ellipse at center, #2a1810 0%, #0a0503 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: "600px", padding: "0 40px" }}>
              <div style={{ width: "120px", height: "160px", margin: "0 auto 32px", background: "linear-gradient(135deg, #3a2010, #1a0f08)", borderRadius: "8px 8px 4px 4px", border: "2px solid #D4A05E", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212,160,94,0.2)", animation: "float 3s ease-in-out infinite" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "24px", color: "#D4A05E" }}>A</span>
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 400, color: "#F5E6D3", margin: "0 0 16px" }}>Tu café está listo</h2>
              <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(245,230,211,0.5)", marginBottom: "32px" }}>Desde el grano hasta tu taza. 1.200 metros de altitud, 52 minutos de tueste, 7 días de reposo.</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginBottom: "32px", flexWrap: "wrap" }}>
                {[{ v: "1.200", l: "MSNM" }, { v: "100%", l: "ARÁBICA" }, { v: "52min", l: "TUESTE" }, { v: "12kg", l: "LOTE" }].map((s) => (
                  <div key={s.l} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#D4A05E" }}>{s.v}</div>
                    <div style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,230,211,0.3)", marginTop: "4px" }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <a href="/cafe" style={{ display: "inline-block", padding: "16px 40px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#0a0503", background: "#D4A05E", textDecoration: "none", boxShadow: "0 0 30px rgba(212,160,94,0.3)", transition: "all 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 50px rgba(212,160,94,0.6)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(212,160,94,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}>Comprar ahora →</a>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "4px", background: "rgba(212,160,94,0.1)", zIndex: 50 }}>
            <div style={{ height: "100%", width: `${p * 100}%`, background: "linear-gradient(90deg, #D4A05E, #FFE5A0)", boxShadow: "0 0 20px rgba(212,160,94,0.8)" }} />
          </div>

          {/* SCENE INDICATOR */}
          <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 50, fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(212,160,94,0.5)", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            {p < 0.2 && "01 — El grano"}
            {p >= 0.2 && p < 0.4 && "02 — El sol"}
            {p >= 0.4 && p < 0.6 && "03 — La esencia"}
            {p >= 0.6 && p < 0.8 && "04 — El valle"}
            {p >= 0.8 && "05 — Tu café"}
          </div>

          {/* SPACER */}
          <div style={{ height: "500vh", width: "100%", pointerEvents: "none" }} />

          {/* Contenido final */}
          <section style={{ padding: "128px 24px", textAlign: "center", background: "#0a0503", borderTop: "1px solid rgba(212,160,94,0.1)", position: "relative", zIndex: 10 }}>
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#D4A05E", letterSpacing: "0.5em", textTransform: "uppercase", display: "block", marginBottom: "24px" }}>La experiencia</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300, color: "#F5E6D3", lineHeight: 1.1, marginBottom: "24px" }}>Cada scroll,<br /><span style={{ color: "#D4A05E", fontStyle: "italic" }}>una parte del proceso.</span></h2>
              <p style={{ fontSize: "15px", lineHeight: 1.8, color: "rgba(245,230,211,0.5)", maxWidth: "400px", margin: "0 auto" }}>La animación que acabas de ver es controlada por tu scroll. Así de preciso es nuestro tueste.</p>
            </div>
          </section>

          <footer style={{ background: "#0a0503", padding: "40px", textAlign: "center", borderTop: "1px solid rgba(212,160,94,0.1)" }}>
            <p style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(245,230,211,0.2)", letterSpacing: "0.2em", textTransform: "uppercase" }}>© 2026 Alturas · Video scroll · Skill hero-3d-awwwards</p>
          </footer>
        </>
      )}
    </main>
  );
}
