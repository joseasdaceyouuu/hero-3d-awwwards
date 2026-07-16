"use client";

/**
 * CRONOS — Hero Layout C (grid 3-col asimétrico) con sistema orbital.
 *
 * Inspirado en 'Geremías Samuel Street Workout Elite' pero NO es copia:
 *   - Vertical distinto: relojes lujo (no atleta)
 *   - Paleta distinta: azul medianoche + platino + oro champagne
 *   - SVG central distinto: reloj esquemático (no silueta atleta)
 *   - Stats: precisión,_reserve power, jewels (no años/estáticos)
 *   - Traits: precisión, herencia, ingeniería (no fuerza/disciplina)
 *
 * Patrones aplicados (extraídos del street-workout-elite.html):
 *   - 1.7 Sistema orbital 3D (3 órbitas + planetas + esfera central)
 *   - 1.8 Multi-layer parallax con data-speed (4 capas)
 *   - 1.9 Counter animation (stats que cuentan)
 *   - 1.10 Esfera central con SVG custom (reloj esquemático)
 *   - 1.11 Layout C: Grid asimétrico 3 columnas (1fr 1.2fr 1fr)
 *
 * Anti-patterns aplicados:
 *   - 5.9: overflow-x: clip
 *   - 5.14: window.addEventListener para parallax
 */

import { useState, useEffect, useRef } from "react";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// ORBITAL SYSTEM — adaptación del sistema orbital
// ============================================================
function OrbitalSystem() {
  const orbitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Parallax 3D del sistema orbital
    const onMouseMove = (e: MouseEvent) => {
      const rect = orbit.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      orbit.style.transform = `perspective(1000px) rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg)`;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <div
      ref={orbitRef}
      style={{
        position: "relative",
        width: "500px",
        height: "500px",
        transition: "transform 0.3s ease-out",
      }}
    >
      {/* Órbita exterior */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid rgba(212,184,150,0.2)",
          borderRadius: "50%",
          animation: "orbitRotate 30s linear infinite",
        }}
      >
        {[
          { size: 70, pos: "top:-35px;left:50%;transform:translateX(-50%)" },
          { size: 55, pos: "top:15%;right:-27px" },
          { size: 60, pos: "bottom:15%;right:-30px" },
          { size: 50, pos: "bottom:-25px;left:50%;transform:translateX(-50%)" },
          { size: 55, pos: "bottom:15%;left:-27px" },
          { size: 45, pos: "top:15%;left:-22px" },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, rgba(212,184,150,0.4) 0%, rgba(20,30,50,0.9) 70%)",
              border: "1px solid rgba(212,184,150,0.3)",
              boxShadow: "0 0 15px rgba(212,184,150,0.2)",
              [p.pos.split(":")[0] as any]: p.pos.split(":")[1].split(";")[0],
              ...(p.pos
                .split(";")
                .reduce((acc, style) => {
                  const [k, v] = style.split(":");
                  if (k && v) acc[k.trim()] = v.trim();
                  return acc;
                }, {} as Record<string, string>)),
            }}
          />
        ))}
      </div>

      {/* Órbita media */}
      <div
        style={{
          position: "absolute",
          inset: "60px",
          border: "1px solid rgba(212,184,150,0.15)",
          borderRadius: "50%",
          animation: "orbitRotate 20s linear infinite reverse",
        }}
      >
        {[
          { size: 45, pos: "top:-22px;left:50%;transform:translateX(-50%)" },
          { size: 40, pos: "bottom:10%;right:-20px" },
          { size: 42, pos: "bottom:-21px;left:50%;transform:translateX(-50%)" },
          { size: 38, pos: "top:30%;left:-19px" },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, rgba(180,200,220,0.5) 0%, rgba(15,25,45,0.95) 70%)",
              border: "1px solid rgba(180,200,220,0.4)",
              boxShadow: "0 0 10px rgba(180,200,220,0.15)",
              ...(p.pos
                .split(";")
                .reduce((acc, style) => {
                  const [k, v] = style.split(":");
                  if (k && v) acc[k.trim()] = v.trim();
                  return acc;
                }, {} as Record<string, string>)),
            }}
          />
        ))}
      </div>

      {/* Órbita interior */}
      <div
        style={{
          position: "absolute",
          inset: "120px",
          border: "1px solid rgba(212,184,150,0.1)",
          borderRadius: "50%",
          animation: "orbitRotate 15s linear infinite",
        }}
      />

      {/* Esfera central: reloj esquemático SVG */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 30%, #1a2540 0%, #0a1525 50%, #050a18 100%)",
          border: "2px solid rgba(212,184,150,0.4)",
          boxShadow:
            "0 0 60px rgba(212,184,150,0.2), 0 0 120px rgba(100,130,180,0.15), inset 0 0 60px rgba(0,0,0,0.5)",
          zIndex: 5,
          animation: "sphereFloat 6s ease-in-out infinite",
          overflow: "hidden",
        }}
      >
        {/* SVG del reloj esquemático */}
        <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%" }}>
          <defs>
            <radialGradient id="dialGrad" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#1a2540" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4b896" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8a7560" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Esfera del reloj */}
          <circle cx="200" cy="200" r="170" fill="url(#dialGrad)" />
          <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(212,184,150,0.3)" strokeWidth="1" />

          {/* Marcas de horas (12 marcas) */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 200 + Math.cos(angle - Math.PI / 2) * 155;
            const y1 = 200 + Math.sin(angle - Math.PI / 2) * 155;
            const x2 = 200 + Math.cos(angle - Math.PI / 2) * 145;
            const y2 = 200 + Math.sin(angle - Math.PI / 2) * 145;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(212,184,150,0.6)"
                strokeWidth={i % 3 === 0 ? "3" : "1.5"}
                strokeLinecap="round"
              />
            );
          })}

          {/* Manecillas */}
          <line x1="200" y1="200" x2="200" y2="120" stroke="url(#handGrad)" strokeWidth="3" strokeLinecap="round" />
          <line x1="200" y1="200" x2="280" y2="200" stroke="url(#handGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="200" y1="200" x2="220" y2="180" stroke="#d4b896" strokeWidth="1" strokeLinecap="round" />

          {/* Centro */}
          <circle cx="200" cy="200" r="6" fill="#d4b896" />
          <circle cx="200" cy="200" r="3" fill="#0a1525" />
        </svg>

        {/* Estrellas pulsantes */}
        {[
          { top: "20%", left: "25%", delay: "0s" },
          { top: "35%", right: "20%", delay: "0.3s" },
          { bottom: "30%", left: "30%", delay: "0.6s" },
          { bottom: "20%", right: "25%", delay: "0.9s" },
          { top: "50%", left: "15%", delay: "1.2s" },
          { top: "15%", right: "35%", delay: "1.5s" },
        ].map((s, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              color: "#d4b896",
              fontSize: "10px",
              animation: "starPulse 2s ease-in-out infinite",
              animationDelay: s.delay,
              ...s,
            }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COUNTER ANIMATION — stats que cuentan
// ============================================================
function Counter({ target, duration = 2000, delay = 800 }: { target: number; duration?: number; delay?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const start = performance.now() + delay;
    const increment = target / (duration / 16);

    const update = (now: number) => {
      if (now < start) {
        requestAnimationFrame(update);
        return;
      }
      setValue((prev) => {
        const next = prev + increment;
        return next >= target ? target : next;
      });
      if (performance.now() - start < duration) {
        requestAnimationFrame(update);
      } else {
        setValue(target);
      }
    };
    requestAnimationFrame(update);
  }, [target, duration, delay]);

  return <span ref={ref}>{Math.floor(value)}</span>;
}

// ============================================================
// PAGE — Layout C: Grid 3 columnas
// ============================================================
export default function CronosHero() {
  const [loaded, setLoaded] = useState(false);
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Preloader timer — simular carga de 1.8s
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);

    // Multi-layer parallax (anti-pattern 5.14: window listener)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let mx = 0, my = 0, cx = 0, cy = 0;
    const onMouseMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    let raf: number;
    const animate = () => {
      cx += (mx - cx) * 0.04;
      cy += (my - cy) * 0.04;
      const layers = parallaxRef.current?.querySelectorAll<HTMLElement>("[data-speed]");
      layers?.forEach((layer) => {
        const speed = parseFloat(layer.dataset.speed || "0");
        layer.style.transform = `translate(${cx * speed * 80}px, ${cy * speed * 40}px)`;
      });
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
    };
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#050a18" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body { font-family: 'Inter', sans-serif; background: #050a18; color: #f1f4f9; }
        .font-serif { font-family: 'Cormorant Garamond', serif; }
        @keyframes orbitRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sphereFloat { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-10px); } }
        @keyframes starPulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        a:focus-visible { outline: 2px solid #d4b896; outline-offset: 4px; }
      `}</style>

      {!loaded ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "#050a18", zIndex: 100 }}
        >
          <div className="font-serif italic" style={{ fontSize: "24px", color: "#d4b896", letterSpacing: "0.1em" }}>
            CRONOS
          </div>
        </div>
      ) : (
        <section
          className="relative w-full min-h-screen flex flex-col"
          aria-label="CRONOS — Relojes de lujo"
          ref={parallaxRef}
        >
          {/* === BACKGROUND LAYERS (multi-layer parallax) === */}
          <div
            data-speed="0.01"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background:
                "radial-gradient(ellipse at 50% 20%, #0a1525 0%, #050a18 50%, #000005 100%)",
            }}
          />
          <div
            data-speed="0.03"
            style={{
              position: "absolute",
              inset: "-10%",
              zIndex: 2,
              background:
                "radial-gradient(ellipse 800px 500px at 70% 30%, rgba(100,130,180,0.25) 0%, transparent 70%), radial-gradient(ellipse 600px 400px at 30% 60%, rgba(212,184,150,0.15) 0%, transparent 70%), radial-gradient(ellipse 500px 300px at 80% 70%, rgba(180,200,220,0.1) 0%, transparent 70%)",
              animation: "orbitRotate 20s ease-in-out infinite alternate",
            }}
          />
          <div
            data-speed="0.06"
            style={{
              position: "absolute",
              inset: "-5%",
              zIndex: 3,
              opacity: 0.6,
              background:
                "radial-gradient(ellipse 700px 350px at 20% 80%, rgba(100,130,180,0.2) 0%, transparent 70%), radial-gradient(ellipse 900px 450px at 60% 20%, rgba(212,184,150,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            data-speed="0.1"
            style={{
              position: "absolute",
              inset: "-3%",
              zIndex: 4,
              opacity: 0.4,
              background:
                "radial-gradient(ellipse 500px 250px at 40% 90%, rgba(100,130,180,0.15) 0%, transparent 70%), radial-gradient(ellipse 600px 300px at 10% 40%, rgba(212,184,150,0.1) 0%, transparent 70%)",
            }}
          />

          {/* Vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Navbar */}
          <nav
            style={{
              position: "relative",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.5rem 3rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "1.5px solid #d4b896",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 700,
                  fontSize: "12px",
                  color: "#d4b896",
                }}
              >
                C
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#f1f4f9",
                }}
              >
                Cronos
              </div>
            </div>
            <ul style={{ display: "flex", listStyle: "none", gap: "2.5rem", margin: 0, padding: 0 }}>
              {["Colección", "Movimiento", "Herencia", "Contacto"].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase()}`}
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 400,
                      fontSize: "13px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(241,244,249,0.6)",
                      textDecoration: "none",
                      transition: "color 0.3s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f1f4f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(241,244,249,0.6)")}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* === HERO CONTENT: Grid 3 columnas (Layout C) === */}
          <div
            style={{
              position: "relative",
              zIndex: 50,
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr 1fr",
              alignItems: "center",
              padding: "0 3rem 3rem",
              gap: "2rem",
              maxWidth: "1600px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {/* LEFT: nombre + badge + tagline + CTA + stats */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                animation: "fadeInLeft 1s cubic-bezier(0.16,1,0.3,1) 0.3s both",
              }}
            >
              <h1
                className="font-serif"
                style={{
                  margin: 0,
                  fontSize: "clamp(3rem, 7vw, 6.5rem)",
                  fontWeight: 500,
                  lineHeight: 0.95,
                  letterSpacing: "-0.02em",
                }}
              >
                <span style={{ display: "block", color: "#f1f4f9" }}>Cronos</span>
                <span
                  style={{
                    display: "block",
                    color: "#d4b896",
                    fontStyle: "italic",
                    fontWeight: 400,
                  }}
                >
                  Aureum
                </span>
              </h1>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 20px",
                  border: "1px solid rgba(212,184,150,0.5)",
                  color: "#d4b896",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 500,
                  fontSize: "14px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  width: "fit-content",
                }}
              >
                <span style={{ width: "4px", height: "4px", background: "#d4b896", borderRadius: "50%" }} />
                Edición Limitada
                <span style={{ width: "4px", height: "4px", background: "#d4b896", borderRadius: "50%" }} />
              </div>

              <p
                className="font-serif"
                style={{
                  fontStyle: "italic",
                  fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)",
                  fontWeight: 300,
                  lineHeight: 1.3,
                  color: "rgba(212,184,150,0.9)",
                  maxWidth: "320px",
                  margin: 0,
                }}
              >
                El tiempo, esculpido en oro.
              </p>

              <a
                href="#coleccion"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 32px",
                  background: "transparent",
                  border: "1.5px solid #d4b896",
                  color: "#f1f4f9",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  width: "fit-content",
                  transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#d4b896";
                  e.currentTarget.style.color = "#050a18";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(212,184,150,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#f1f4f9";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Descubrir Colección →
              </a>

              {/* Stats con counter animation */}
              <div style={{ display: "flex", gap: "2.5rem", marginTop: "1rem" }}>
                {[
                  { val: 72, label: "Horas reserva", suffix: "h" },
                  { val: 28800, label: "VPH", suffix: "" },
                  { val: 100, label: "Años herencia", suffix: "" },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div
                      className="font-serif"
                      style={{
                        fontWeight: 600,
                        fontSize: "2.2rem",
                        lineHeight: 1,
                        color: "#d4b896",
                      }}
                    >
                      <Counter target={s.val} />
                      {s.suffix}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "rgba(241,244,249,0.5)",
                        maxWidth: "80px",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER: Orbital System */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "500px",
                animation: "fadeInScale 1.2s cubic-bezier(0.16,1,0.3,1) 0.5s both",
              }}
            >
              <OrbitalSystem />
            </div>

            {/* RIGHT: Traits */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "2.5rem",
                animation: "fadeInRight 1s cubic-bezier(0.16,1,0.3,1) 0.6s both",
              }}
            >
              {[
                { label: "Precisión", desc: "±2 seg/día" },
                { label: "Herencia", desc: "Suiza, 1923" },
                { label: "Ingeniería", desc: "Calibre in-house" },
              ].map((t) => (
                <div
                  key={t.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "4px",
                    textAlign: "right",
                  }}
                >
                  <div
                    className="font-serif italic"
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 500,
                      color: "#d4b896",
                    }}
                  >
                    {t.label}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(241,244,249,0.5)",
                    }}
                  >
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volver */}
          <a
            href="/heroes"
            className="font-serif"
            style={{
              position: "absolute",
              bottom: "2rem",
              right: "3rem",
              zIndex: 100,
              fontSize: "11px",
              color: "rgba(241,244,249,0.4)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
            aria-label="Volver a galería"
          >
            ← Galería
          </a>
          <HeroPolish accentColor="#0a1525" />
        </section>
      )}
    </main>
  );
}
