"use client";

/**
 * VIDEO SCROLL HERO — Video real controlado por scroll frame-a-frame.
 *
 * LA técnica premium de Awwwards SOTD: el video se reproduce/retrocede
 * según el scroll del usuario. Como Apple AirPods, Nike, etc.
 *
 * Técnica:
 * 1. <video> preload="auto" sin controls ni autoplay
 * 2. scrollY → calcular frame del video (currentTime = progress * duration)
 * 3. requestAnimationFrame loop para suavizar el scrubbing
 * 4. Video position: fixed (siempre visible durante el scroll)
 * 5. body height = N * 100vh (espacio virtual para scroll)
 *
 * Overlay:
 * - Texto que aparece/desaparece en momentos del video
 * - Progress bar
 * - Scene indicator
 * - Color tint que cambia con el progreso
 */

import { useState, useEffect, useRef } from "react";

export default function VideoScrollHero() {
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);

    const video = videoRef.current;
    if (!video) return;

    // Esperar a que el video esté listo
    const onCanPlay = () => {
      setVideoReady(true);
      video.pause();
    };
    video.addEventListener("canplaythrough", onCanPlay);

    // Scroll → video currentTime
    let targetTime = 0;
    let raf: number;

    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0 && video.duration) {
        const p = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
        targetTime = p * video.duration;
        setProgress(p);
      }
    };

    // Loop de suavizado — interpola hacia targetTime
    const tick = () => {
      if (video.duration && videoReady) {
        const current = video.currentTime;
        const diff = targetTime - current;
        // Suavizar: mover 15% de la diferencia por frame
        if (Math.abs(diff) > 0.01) {
          video.currentTime = current + diff * 0.15;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      video.removeEventListener("canplaythrough", onCanPlay);
      cancelAnimationFrame(raf);
    };
  }, [loaded, videoReady]);

  // Texto overlay según progreso
  const overlays = [
    { t: 0.0, title: "Dragon Ball", sub: "El camino de la serpiente" },
    { t: 0.3, title: "Entrenamiento", sub: "Cada frame cuenta" },
    { t: 0.6, title: "La técnica", sub: "Controlada por tu scroll" },
    { t: 0.85, title: "El resultado", sub: "Video scroll premium" },
  ];
  let currentOverlay = overlays[0];
  for (const o of overlays) {
    if (progress >= o.t) currentOverlay = o;
  }
  const overlayOpacity = Math.min(1, 1 - Math.abs(progress - currentOverlay.t - 0.1) * 3);

  return (
    <main style={{ overflowX: "clip", background: "#000" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { overflow-x: clip; }
        body { overflow-x: clip; font-family: 'Inter', sans-serif; }
        @keyframes load { to { width: 100%; } }
        @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, color: "#fff", letterSpacing: "0.15em", marginBottom: "20px" }}>VIDEO SCROLL</div>
          <div style={{ width: "200px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", height: "100%", width: "0%", background: "#fff", animation: "load 1.5s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* VIDEO — position fixed, siempre visible */}
          <video
            ref={videoRef}
            src="/cafe-scroll-web.mp4"
            preload="auto"
            playsInline
            muted
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100vh",
              objectFit: "cover",
              zIndex: 1,
              pointerEvents: "none",
            }}
            aria-label="Video controlado por scroll. Desplaza para navegar frame a frame."
          />

          {/* Overlay gradient para legibilidad */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
            background: `linear-gradient(180deg, rgba(0,0,0,${0.5 + progress * 0.2}) 0%, transparent 30%, transparent 70%, rgba(0,0,0,${0.6 + progress * 0.2}) 100%)`,
          }} />

          {/* Texto overlay */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 3,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
            opacity: overlayOpacity,
            transition: "opacity 0.3s",
          }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(40px, 10vw, 100px)",
                fontWeight: 800,
                color: "#fff",
                textShadow: "0 0 60px rgba(0,0,0,0.8)",
                margin: 0,
                letterSpacing: "-0.04em",
              }}>{currentOverlay.title}</h1>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "clamp(12px, 1.5vw, 16px)",
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                marginTop: "16px",
                textShadow: "0 0 20px rgba(0,0,0,0.8)",
              }}>{currentOverlay.sub}</p>
            </div>
          </div>

          {/* HUD */}
          <div style={{ position: "fixed", top: "30px", left: "40px", zIndex: 20, fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }} aria-hidden>
            <div>VIDEO SCROLL · ON</div>
            <div>SCRUBBING · 15% LERP</div>
            <div style={{ marginTop: "8px", color: videoReady ? "#00ff88" : "#ffaa00" }}>
              {videoReady ? "● VIDEO READY" : "○ LOADING..."}
            </div>
          </div>
          <div style={{ position: "fixed", top: "30px", right: "40px", zIndex: 20, fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "right" }} aria-hidden>
            <div>FRAME · {Math.round(progress * 100)}%</div>
            <div>TIME · {videoRef.current?.duration ? (progress * videoRef.current.duration).toFixed(1) : "0.0"}s</div>
          </div>

          {/* Progress bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "4px", background: "rgba(255,255,255,0.1)", zIndex: 50 }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg, #fff, #00ff88)", boxShadow: "0 0 20px rgba(255,255,255,0.8)" }} />
          </div>

          {/* Scene indicator */}
          <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 50, fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            {currentOverlay.title}
          </div>

          {/* Scroll hint */}
          {progress < 0.03 && (
            <div style={{ position: "fixed", bottom: "50px", left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", animation: "pulse 2s ease-in-out infinite" }}>
              <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.6)", letterSpacing: "0.3em", textTransform: "uppercase" }}>Scroll para reproducir</span>
              <svg width="20" height="30" viewBox="0 0 20 30" fill="none">
                <rect x="1" y="1" width="18" height="28" rx="9" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="3" fill="#fff" />
              </svg>
            </div>
          )}

          {/* SPACER — 5 viewports para scroll */}
          <div style={{ height: "500vh", width: "100%", pointerEvents: "none" }} />

          {/* Contenido después */}
          <section style={{ padding: "128px 24px", textAlign: "center", background: "#000", position: "relative", zIndex: 10 }}>
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "#00ff88", letterSpacing: "0.5em", textTransform: "uppercase", display: "block", marginBottom: "24px" }}>Video Scroll Scrubbing</span>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: "24px" }}>El scroll<br /><span style={{ color: "#00ff88", fontStyle: "italic" }}>controla el video.</span></h2>
              <p style={{ fontSize: "15px", lineHeight: 1.8, color: "rgba(255,255,255,0.5)", maxWidth: "400px", margin: "0 auto 32px" }}>
                Cada pixel de scroll corresponde a un frame del video.
                Suavizado con interpolación lineal al 15% por frame para
                que el movimiento se sienta fluido, no mecánico.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "32px", flexWrap: "wrap" }}>
                {[{ v: "1080p", l: "RESOLUCIÓN" }, { v: "15%", l: "LERP" }, { v: "500vh", l: "SCROLL" }, { v: "60fps", l: "SMOOTH" }].map((s) => (
                  <div key={s.l} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: 700, color: "#00ff88" }}>{s.v}</div>
                    <div style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <a href="/heroes" style={{ display: "inline-block", marginTop: "32px", padding: "16px 40px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#000", background: "#00ff88", textDecoration: "none", boxShadow: "0 0 30px rgba(0,255,136,0.3)" }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 0 50px rgba(0,255,136,0.6)"} onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 0 30px rgba(0,255,136,0.3)"}>← Ver galería</a>
            </div>
          </section>

          <footer style={{ background: "#000", padding: "40px", textAlign: "center" }}>
            <p style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.2em", textTransform: "uppercase" }}>© 2026 · Video scroll scrubbing · Skill hero-3d-awwwards</p>
          </footer>
        </>
      )}
    </main>
  );
}
