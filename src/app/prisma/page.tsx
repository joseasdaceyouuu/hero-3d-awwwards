"use client";

/**
 * PRISMA — Hero multi-escena con interacciones radicalmente distintas.
 *
 * 3 ESCENAS que el usuario cambia con navegación:
 *
 * Escena 1 — "PARTÍCULAS": partículas que forman el texto "PRISMA" y se
 *   dispersan cuando el cursor se acerca. Al alejarlo, se reforman.
 *
 * Escena 2 — "MAGNÉTICO": elementos UI (título, stats, CTA) que se atraen
 *   físicamente al cursor con efecto magnético. Distorsión al hover.
 *
 * Escena 3 — "SPLIT MORPH": pantalla dividida vertical, lado izq oscuro
 *   lado der claro, que se desliza al mover el cursor. Texto overlay que
 *   cambia de color según el lado.
 *
 * NAVEGACIÓN: 3 dots en la esquina inferior derecha. Click para cambiar.
 * Transición: fade + scale entre escenas (0.6s cubic-bezier).
 *
 * Patrones NUEVOS (no existentes en la skill):
 *   - Partículas que forman texto (text-to-particles)
 *   - Efecto magnético real (elementos atraídos al cursor)
 *   - Multi-scene hero con transiciones
 *   - Split-screen interactivo con cursor
 *
 * Anti-patterns aplicados:
 *   - 5.9: overflow-x: clip
 *   - 5.13: as="span" en LetterReveal
 *   - 5.18: Preloader con timer
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// SCENE 1: PARTICLE TEXT — partículas que forman "PRISMA"
// ============================================================
function ParticleTextScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      tx: number; // target x
      ty: number; // target y
      vx: number;
      vy: number;
      size: number;
      color: string;
    }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      generateParticles();
    };

    // Generar partículas desde texto usando canvas temporal
    const generateParticles = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d")!;

      tempCtx.fillStyle = "white";
      tempCtx.font = `bold ${Math.min(width * 0.15, 180)}px Syne, sans-serif`;
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillText("PRISMA", width / 2, height / 2);

      const imageData = tempCtx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const particles: typeof particlesRef.current = [];
      const step = 4; // densidad de partículas

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 128) {
            // Pixel es parte del texto
            const colors = ["#00f3ff", "#ff0055", "#aaff00", "#ffaa00"];
            particles.push({
              x: Math.random() * width,
              y: Math.random() * height,
              tx: x,
              ty: y,
              vx: 0,
              vy: 0,
              size: 1.5 + Math.random() * 1.5,
              color: colors[Math.floor(Math.random() * colors.length)],
            });
          }
        }
      }

      particlesRef.current = particles;
    };

    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking en window (anti-pattern 5.14)
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseout", onMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      for (const p of particlesRef.current) {
        // Repeler del cursor
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 80;

        if (dist < repelRadius && dist > 0) {
          const force = (repelRadius - dist) / repelRadius;
          p.vx += (dx / dist) * force * 4;
          p.vy += (dy / dist) * force * 4;
        }

        // Atraer al target (formar texto)
        p.vx += (p.tx - p.x) * 0.04;
        p.vy += (p.ty - p.y) * 0.04;

        // Fricción
        p.vx *= 0.88;
        p.vy *= 0.88;

        p.x += p.vx;
        p.y += p.vy;

        // Dibujar
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      />
      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center"
        style={{ zIndex: 10 }}
      >
        <p
          className="font-mono"
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          [ Mueve el cursor para dispersar las partículas ]
        </p>
      </div>
    </div>
  );
}

// ============================================================
// SCENE 2: MAGNETIC — elementos atraídos al cursor
// ============================================================
function MagneticElement({
  children,
  strength = 0.3,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    [strength]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0, 0)";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      ref={ref}
      onMouseLeave={handleMouseLeave}
      style={{ transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)", willChange: "transform" }}
    >
      {children}
    </div>
  );
}

function MagneticScene() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      {/* Título magnético */}
      <MagneticElement strength={0.15}>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(3rem, 10vw, 8rem)",
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            color: "#00f3ff",
            textShadow: "0 0 60px rgba(0,243,255,0.3)",
            margin: 0,
          }}
        >
          MAGNÉTICO
        </h1>
      </MagneticElement>

      {/* Subtítulo magnético */}
      <MagneticElement strength={0.08}>
        <p
          className="font-mono"
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Los elementos se atraen a tu cursor
        </p>
      </MagneticElement>

      {/* Stats magnéticas */}
      <div className="flex gap-8 mt-8">
        {[
          { val: "150%", label: "ATRACCIÓN" },
          { val: "0.4s", label: "EASING" },
          { val: "∞", label: "RANGO" },
        ].map((s) => (
          <MagneticElement key={s.label} strength={0.25}>
            <div style={{ textAlign: "center" }}>
              <div
                className="font-mono"
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#ff0055",
                  lineHeight: 1,
                }}
              >
                {s.val}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: "4px",
                }}
              >
                {s.label}
              </div>
            </div>
          </MagneticElement>
        ))}
      </div>

      {/* CTA magnético */}
      <MagneticElement strength={0.35}>
        <button
          style={{
            padding: "18px 44px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#02030a",
            background: "#aaff00",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 30px rgba(170,255,0,0.4)",
            transition: "box-shadow 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 50px rgba(170,255,0,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 0 30px rgba(170,255,0,0.4)";
          }}
        >
          Sentir la Fuerza →
        </button>
      </MagneticElement>

      <p
        className="font-mono absolute bottom-20"
        style={{
          fontSize: "11px",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        [ Mueve el cursor — todo es magnético ]
      </p>
    </div>
  );
}

// ============================================================
// SCENE 3: SPLIT MORPH — pantalla dividida interactivo
// ============================================================
function SplitMorphScene() {
  const [splitPos, setSplitPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(10, Math.min(90, x)));
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Lado oscuro (izq) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: "#02030a",
          clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`,
          transition: "clip-path 0.1s linear",
        }}
      >
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(3rem, 9vw, 7rem)",
            fontWeight: 800,
            textTransform: "uppercase",
            color: "#00f3ff",
            textShadow: "0 0 40px rgba(0,243,255,0.3)",
            transform: `translateX(${-50 + splitPos * 0.3}%)`,
            transition: "transform 0.1s linear",
          }}
        >
          OSCURO
        </h1>
      </div>

      {/* Lado claro (der) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: "#f5f5f0",
          clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`,
          transition: "clip-path 0.1s linear",
        }}
      >
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(3rem, 9vw, 7rem)",
            fontWeight: 800,
            textTransform: "uppercase",
            color: "#02030a",
            transform: `translateX(${50 - (100 - splitPos) * 0.3}%)`,
            transition: "transform 0.1s linear",
          }}
        >
          CLARO
        </h1>
      </div>

      {/* Línea divisoria */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${splitPos}%`,
          width: "2px",
          background: "linear-gradient(to bottom, transparent, #ff0055, transparent)",
          boxShadow: "0 0 20px #ff0055",
          transition: "left 0.1s linear",
          zIndex: 5,
        }}
      />

      {/* Indicador */}
      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2"
        style={{ zIndex: 10 }}
      >
        <p
          className="font-mono"
          style={{
            fontSize: "11px",
            color: "#ff0055",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            textShadow: "0 0 10px rgba(255,0,85,0.5)",
          }}
        >
          [ Mueve el cursor para dividir ]
        </p>
      </div>
    </div>
  );
}

// ============================================================
// SCENE NAVIGATION — dots para cambiar de escena
// ============================================================
const SCENES = [
  { id: 0, name: "PARTÍCULAS", color: "#aaff00" },
  { id: 1, name: "MAGNÉTICO", color: "#00f3ff" },
  { id: 2, name: "SPLIT", color: "#ff0055" },
];

// ============================================================
// PAGE
// ============================================================
export default function PrismaHero() {
  const [loaded, setLoaded] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Preloader timer (anti-pattern 5.18)
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  const changeScene = (newScene: number) => {
    if (newScene === currentScene) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentScene(newScene);
      setTransitioning(false);
    }, 300);
  };

  // Keyboard nav: flechas izq/der para cambiar escena
  useEffect(() => {
    if (!loaded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") changeScene((currentScene + 1) % 3);
      if (e.key === "ArrowLeft") changeScene((currentScene - 1 + 3) % 3);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loaded, currentScene]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#02030a" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; overflow-y: hidden; height: 100vh; }
        body { background: #02030a; color: #fff; font-family: 'JetBrains Mono', monospace; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        a:focus-visible { outline: 2px solid #aaff00; outline-offset: 4px; }
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
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "32px",
              fontWeight: 800,
              color: "#aaff00",
              letterSpacing: "0.1em",
              marginBottom: "20px",
            }}
          >
            PRISMA
          </div>
          <div
            style={{
              width: "250px",
              height: "2px",
              background: "rgba(255,255,255,0.1)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "0%",
                background: "#aaff00",
                animation: "load 1.8s ease-in-out forwards",
              }}
            />
          </div>
        </div>
      )}

      {loaded && (
        <>
          <section
            className="relative w-full h-screen overflow-hidden"
            aria-label="PRISMA — Multi-scene hero"
          >
            {/* Scene container con transición */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: transitioning ? 0 : 1,
                transform: transitioning ? "scale(0.95)" : "scale(1)",
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {currentScene === 0 && <ParticleTextScene />}
              {currentScene === 1 && <MagneticScene />}
              {currentScene === 2 && <SplitMorphScene />}
            </div>

            {/* Top bar */}
            <header
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "30px 40px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                PRISMA
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                ESCENA {currentScene + 1} / 3 — {SCENES[currentScene].name}
              </div>
            </header>

            {/* Scene navigation — dots */}
            <nav
              style={{
                position: "fixed",
                bottom: "40px",
                right: "40px",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
              aria-label="Navegación de escenas"
            >
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => changeScene(scene.id)}
                  aria-label={`Escena ${scene.id + 1}: ${scene.name}`}
                  style={{
                    width: currentScene === scene.id ? "40px" : "12px",
                    height: "12px",
                    borderRadius: "6px",
                    background:
                      currentScene === scene.id ? scene.color : "rgba(255,255,255,0.2)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow:
                      currentScene === scene.id ? `0 0 15px ${scene.color}` : "none",
                  }}
                />
              ))}
            </nav>

            {/* Scene labels — lado izquierdo */}
            <div
              style={{
                position: "fixed",
                bottom: "40px",
                left: "40px",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => changeScene(scene.id)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color:
                      currentScene === scene.id
                        ? scene.color
                        : "rgba(255,255,255,0.2)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "color 0.3s",
                    textAlign: "left",
                  }}
                >
                  0{scene.id + 1} — {scene.name}
                </button>
              ))}
            </div>

            {/* Keyboard hint */}
            <div
              style={{
                position: "fixed",
                bottom: "40px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 50,
              }}
            >
              <p
                className="font-mono"
                style={{
                  fontSize: "9px",
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                }}
              >
                ← → para cambiar de escena
              </p>
            </div>

            {/* Volver */}
            <a
              href="/heroes"
              style={{
                position: "fixed",
                top: "30px",
                right: "50%",
                transform: "translateX(50%)",
                zIndex: 50,
                fontSize: "9px",
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
              aria-label="Volver a galería"
            >
              ← Galería
            </a>
          <HeroPolish accentColor="#ff0055" />
          </section>
        </>
      )}
    </main>
  );
}
