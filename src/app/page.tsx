"use client";

/**
 * CINEMA — Hero cinematográfico con profundidad 3D real
 *
 * 3 capas a distintas profundidades Z:
 *   - Capa FONDO (Z=-8): shader de niebla atmosférica lenta
 *   - Capa MEDIO (Z=-4): partículas flotantes (plancton/polvo)
 *   - Capa FRENTE (Z=-1): shader principal (oro líquido iridiscente)
 *
 * Cámara que hace dolly al scroll (Z avanza de -12 a -2)
 * Mouse parallax en 3 capas a velocidades distintas (0.02, 0.05, 0.1)
 * Letterbox cinematográfico que se abre al hacer scroll
 * Coreografía de entrada: preloader → título 3D → subtítulo → CTA → HUD
 * Texto con blur-materialize + scale + rotateX
 *
 * Stack: R3F + GSAP ScrollTrigger + Lenis
 * Skills usadas: ShaderBackground, SplitText, MagneticButton, BlendCursor, ScrollCamera
 * Shaders: noise + liquid_metal + postprocessing (inline)
 */

import { lazy, Suspense, useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MemoryDashboard } from "@/components/dashboard/MemoryDashboard";
import { BlendCursor } from "@/lib/library/components/BlendCursor";
import { MagneticButton } from "@/lib/library/components/MagneticButton";
import { Preloader } from "@/lib/library/components/Preloader";

gsap.registerPlugin(ScrollTrigger);

const CinematicCanvas = lazy(() =>
  import("@/components/hero/CinematicCanvas").then((m) => ({ default: m.CinematicCanvas }))
);

export default function Home() {
  const [view, setView] = useState<"hero" | "dashboard">("hero");
  const [loaded, setLoaded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const letterboxTop = useRef<HTMLDivElement>(null);
  const letterboxBottom = useRef<HTMLDivElement>(null);
  const heroOuterRef = useRef<HTMLElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLDivElement>(null);

  // Altura total del hero (en pantallas). 4 pantallas = el travelling dura 3 viewport-heights de scroll.
  const HERO_SCREENS = 4;

  useEffect(() => {
    if (!loaded) return;

    // Si el usuario movió el scroll durante el preloader, reseteamos a 0
    // para que el hero empiece en su posición inicial (Z=14, letterbox cerrado).
    window.scrollTo(0, 0);

    // El hero se monta dinámicamente cuando loaded=true. ScrollTrigger necesita
    // saber que ahora existe una sección de 400vh — sin esto, los triggers se
    // calculan contra un layout vacío y el hero "se sale" al primer scroll.
    const refreshTimeout = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);

    // Calcula el progreso del travelling basándose en la posición del hero
    // (no en window.scrollY absoluto). Esto permite que el hero sea más alto que 100vh.
    const computeProgress = () => {
      const hero = heroOuterRef.current;
      if (!hero) return 0;
      const rect = hero.getBoundingClientRect();
      // rect.top va de 0 (hero al top) a -(heroHeight - viewportHeight) (hero terminó)
      const totalScroll = hero.offsetHeight - window.innerHeight;
      if (totalScroll <= 0) return 0;
      const p = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
      return p;
    };

    const onScroll = () => {
      const p = computeProgress();

      // Overlay parallax — se desvanece en el primer 40% del travelling
      const overlayP = Math.min(p / 0.4, 1);
      if (overlayRef.current) {
        gsap.to(overlayRef.current, {
          y: -overlayP * 100,
          opacity: 1 - overlayP,
          scale: 1 - overlayP * 0.05,
          duration: 0.3,
          ease: "none",
          overwrite: true,
        });
      }

      // Letterbox: se abre en el primer 15% (entrada cinematográfica),
      // se vuelve a cerrar en el último 10% (salida a la siguiente escena)
      let letterP = 0;
      if (p < 0.15) letterP = 1 - p / 0.15;           // barra llena → abierta
      else if (p > 0.9) letterP = (p - 0.9) / 0.1;     // abierta → barra llena
      if (letterboxTop.current) {
        letterboxTop.current.style.transform = `translateY(-${(1 - letterP) * 100}%)`;
      }
      if (letterboxBottom.current) {
        letterboxBottom.current.style.transform = `translateY(${(1 - letterP) * 100}%)`;
      }

      // HUD: progreso del travelling (0% → 100%)
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${p})`;
      }
      if (progressTextRef.current) {
        const pct = Math.round(p * 100);
        // Profundidad Z mostrada: 14 → 0.5 (dolly)
        const z = (14 - p * 13.5).toFixed(1);
        progressTextRef.current.textContent = `Z=${z}  ·  ${pct}%`;
      }
    };

    onScroll(); // primera pintada
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(refreshTimeout);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip" }}>
      {!loaded && (
        <Preloader
          variant="percentage"
          duration={1500}
          brandText="CINE"
          accentColor="#d4a574"
          onComplete={() => setLoaded(true)}
        />
      )}

      <div
        className="fixed top-4 right-4 z-50 flex gap-1 p-1 border border-white/10"
        style={{ background: "rgba(10,10,15,0.8)", backdropFilter: "blur(10px)" }}
      >
        <button
          onClick={() => setView("hero")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "hero" ? "bg-[#d4a574] text-[#0a0a0f]" : "text-white/50 hover:text-white"
          }`}
        >
          Hero
        </button>
        <button
          onClick={() => setView("dashboard")}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
            view === "dashboard" ? "bg-[#d4a574] text-[#0a0a0f]" : "text-white/50 hover:text-white"
          }`}
        >
          Memoria
        </button>
      </div>

      {view === "dashboard" ? (
        <MemoryDashboard />
      ) : (
        loaded && (
          <>
            <BlendCursor color="#d4a574" size={20} hoverSize={48} lerp={0.12} />

            {/* HERO OUTER — 400vh de alto para que el travelling dure 3 viewport-heights de scroll.
                El contenido visual (canvas + overlay + letterbox) se queda STICKY en la pantalla
                mientras el usuario hace scroll a través del rango completo del dolly.
                Solo cuando se completa el travelling (p=1) se sale del hero hacia #escena. */}
            <section
              id="hero"
              ref={heroOuterRef}
              className="relative w-full"
              style={{
                height: `${HERO_SCREENS * 100}vh`,
                background: "#080610",
                position: "relative",
                /* Sin overflow aquí — overflow en ancestros rompe sticky */
              }}
              aria-label="Hero Cinematográfico"
            >
              {/* HERO INNER — sticky h-screen, contiene todo lo visual.
                  will-change: transform ayuda al navegador a compositar el sticky
                  sin hacer layout en cada frame. */}
              <div
                className="sticky top-0 h-screen w-full overflow-hidden"
                style={{
                  willChange: "transform",
                  transform: "translateZ(0)",
                }}
              >
                {/* Canvas 3D con 3 capas a distintas profundidades Z */}
                <Suspense
                  fallback={
                    <div className="flex h-screen items-center justify-center" style={{ background: "#080610" }}>
                      <div className="w-8 h-8 border-2 border-[#d4a574] border-t-transparent rounded-full animate-spin" aria-label="Cargando" />
                    </div>
                  }
                >
                  <CinematicCanvas />
                </Suspense>

                {/* Overlay radial para legibilidad del texto */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(8,6,16,0.5) 0%, transparent 60%)",
                    zIndex: 5,
                  }}
                  aria-hidden
                />

                {/* Contenido del hero */}
                <div
                  ref={overlayRef}
                  className="absolute inset-0 z-10 flex h-full flex-col items-center justify-center px-6 text-center"
                >
                  {/* Etiqueta superior */}
                  <div className="mb-8 opacity-0" style={{ animation: "fadeIn 1.5s ease-out 0.5s forwards" }}>
                    <span
                      className="text-[10px] uppercase font-light"
                      style={{ color: "#d4a574", letterSpacing: "0.6em", opacity: 0.95 }}
                    >
                      Profundidad · Capas · Cinematografía
                    </span>
                  </div>

                  {/* Título con coreografía blur-materialize */}
                  <h1
                    className="font-playfair"
                    style={{
                      fontSize: "clamp(2.5rem, 11vw, 9rem)",
                      fontWeight: 200,
                      letterSpacing: "0.02em",
                      lineHeight: 0.95,
                      margin: 0,
                      color: "#ffffff",
                      textShadow:
                        "0 0 30px rgba(212,165,116,0.5), 0 0 60px rgba(212,165,116,0.3), 0 0 120px rgba(212,165,116,0.1)",
                      overflow: "hidden",
                    }}
                    ref={(el) => {
                      if (el) {
                        gsap.set(el, { opacity: 0, scale: 1.2, filter: "blur(40px)", rotateX: 20, y: 30 });
                        setTimeout(() => {
                          gsap.to(el, {
                            opacity: 1, scale: 1, filter: "blur(0px)", rotateX: 0, y: 0,
                            duration: 2.5, ease: "power4.out",
                          });
                        }, 800);
                      }
                    }}
                  >
                    PROFUNDIDAD
                  </h1>

                  {/* Subtítulo */}
                  <p
                    className="mt-10 max-w-xl text-base md:text-lg font-light opacity-0"
                    style={{
                      animation: "fadeIn 2s ease-out 2.8s forwards",
                      color: "rgba(255,255,255,0.95)",
                      lineHeight: 1.8,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Tres capas de luz a distintas profundidades.
                    <br />
                    Una cámara que vuela a través del espacio.
                    <br />
                    Cada scroll, un travelling cinematográfico.
                  </p>

                  {/* CTA */}
                  <div className="mt-14 opacity-0" style={{ animation: "fadeIn 1.5s ease-out 3.8s forwards" }}>
                    <MagneticButton
                      href="#escena"
                      glowColor="rgba(212,165,116,0.5)"
                      borderColor="rgba(212,165,116,0.4)"
                      textColor="#ffffff"
                      scale={1.08}
                      strength={0.5}
                      radius={120}
                      aria-label="Explorar la técnica cinematográfica"
                    >
                      Entrar en Escena
                    </MagneticButton>
                  </div>
                </div>

                {/* Letterbox bars cinematográficos */}
                <div
                  ref={letterboxTop}
                  className="absolute top-0 left-0 right-0 pointer-events-none"
                  style={{ height: "8vh", background: "#000", zIndex: 30 }}
                  aria-hidden
                />
                <div
                  ref={letterboxBottom}
                  className="absolute bottom-0 left-0 right-0 pointer-events-none"
                  style={{ height: "8vh", background: "#000", zIndex: 30 }}
                  aria-hidden
                />

                {/* HUD cinematográfico — esquina superior izquierda */}
                <div className="absolute top-6 left-6 opacity-0 z-20" style={{ animation: "fadeIn 2s ease-out 1.5s forwards" }} aria-hidden>
                  <div className="text-[9px] uppercase tracking-widest font-mono" style={{ color: "rgba(212,165,116,0.5)" }}>
                    <div>ESCENA · 01</div>
                    <div>TOMA · 04</div>
                    <div>LENTE · 35mm</div>
                  </div>
                </div>
                <div className="absolute top-6 right-6 opacity-0 text-right z-20" style={{ animation: "fadeIn 2s ease-out 1.5s forwards" }} aria-hidden>
                  <div className="text-[9px] uppercase tracking-widest font-mono" style={{ color: "rgba(212,165,116,0.5)" }}>
                    <div>FPS · 60</div>
                    <div>CAPAS · 4</div>
                    <div>DEPTH · 14 → 0.5</div>
                  </div>
                </div>

                {/* Barra de progreso del travelling (en lugar del indicador simple) */}
                <div
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 opacity-0"
                  style={{ animation: "fadeIn 2s ease-out 4.5s forwards", width: "min(80vw, 320px)" }}
                  aria-hidden
                >
                  <div className="flex items-center justify-between w-full" style={{ color: "rgba(212,165,116,0.55)" }}>
                    <span className="text-[9px] uppercase tracking-[0.4em]">Travelling</span>
                    <span
                      ref={progressTextRef}
                      className="text-[9px] uppercase tracking-[0.3em] font-mono"
                      style={{ color: "rgba(212,165,116,0.85)" }}
                    >
                      Z=14.0  ·  0%
                    </span>
                  </div>
                  <div
                    className="relative h-px w-full"
                    style={{ background: "rgba(212,165,116,0.15)" }}
                  >
                    <div
                      ref={progressFillRef}
                      className="absolute top-0 left-0 h-full w-full"
                      style={{
                        background: "linear-gradient(to right, rgba(212,165,116,0.4), #d4a574)",
                        transform: "scaleX(0)",
                        transformOrigin: "left",
                        transition: "transform 0.15s linear",
                      }}
                    />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.4em]" style={{ color: "rgba(212,165,116,0.4)" }}>
                    Scroll para viajar a través de las capas
                  </span>
                </div>
              </div>
            </section>

            {/* Sección 1: La Técnica */}
            <section
              id="escena"
              ref={(el) => {
                if (el) {
                  gsap.fromTo(el.querySelectorAll("[data-scroll]"),
                    { opacity: 0, y: 60 },
                    { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", stagger: 0.15,
                      scrollTrigger: { trigger: el, start: "top 70%", scrub: 0.5 } });
                }
              }}
              className="relative py-40 px-6" style={{ background: "#080610" }}
              aria-label="La técnica cinematográfica"
            >
              <div className="mx-auto max-w-4xl">
                <span data-scroll className="text-[10px] uppercase tracking-[0.5em] mb-10 block" style={{ color: "#d4a574" }}>
                  01 — La Arquitectura
                </span>
                <h2 data-scroll className="font-playfair text-4xl md:text-7xl font-light leading-tight mb-12" style={{ letterSpacing: "-0.02em", color: "#ffffff" }}>
                  Tres planos de realidad
                  <br />
                  <span style={{ color: "#d4a574", fontStyle: "italic" }}>
                    a distintas profundidades.
                  </span>
                </h2>
                <p data-scroll className="text-lg md:text-xl font-light leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.9)" }}>
                  Como en el cine, la profundidad se construye con capas. El plano
                  de fondo (Z=-8) crea la atmósfera con niebla procedural. El plano
                  medio (Z=-4) flotan partículas como polvo en un haz de luz. El
                  plano frontal (Z=-1) es la superficie iridiscente que reacciona
                  al contacto.
                </p>
                <p data-scroll className="text-base font-light leading-relaxed mb-12" style={{ color: "rgba(255,255,255,0.5)" }}>
                  La cámara avanza en Z al hacer scroll — un travelling digital que
                  atraviesa las capas. Cada capa responde al mouse a velocidad
                  distinta, creando parallax real, no simulado.
                </p>

                {/* Stats de profundidad */}
                <div data-scroll className="grid grid-cols-3 gap-8 mt-16" style={{ borderTop: "1px solid rgba(212,165,116,0.1)", paddingTop: "2rem" }}>
                  {[
                    { val: "Z=-8", label: "Fondo atmosférico" },
                    { val: "Z=-4", label: "Partículas flotantes" },
                    { val: "Z=-1", label: "Superficie iridiscente" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="font-playfair text-2xl md:text-4xl font-bold mb-2" style={{ color: "#d4a574" }}>
                        {stat.val}
                      </div>
                      <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Sección 2: La Experiencia */}
            <section
              ref={(el) => {
                if (el) {
                  gsap.fromTo(el.querySelectorAll("[data-scroll]"),
                    { opacity: 0, y: 40 },
                    { opacity: 1, y: 0, duration: 1.0, ease: "power3.out", stagger: 0.2,
                      scrollTrigger: { trigger: el, start: "top 75%", scrub: 0.5 } });
                }
              }}
              className="relative py-40 px-6" style={{ background: "#040308" }}
              aria-label="La experiencia cinematográfica"
            >
              <div className="mx-auto max-w-3xl text-center">
                <span data-scroll className="text-[10px] uppercase tracking-[0.5em] mb-10 block" style={{ color: "#d4a574" }}>
                  02 — El Travelling
                </span>
                <h2 data-scroll className="font-playfair text-4xl md:text-7xl font-light leading-tight mb-12" style={{ letterSpacing: "-0.03em", color: "#ffffff" }}>
                  El scroll no desplaza.
                  <br />
                  <span style={{ color: "#d4a574", fontStyle: "italic" }}>
                    Vuela a través del espacio.
                  </span>
                </h2>
                <p data-scroll className="text-lg md:text-xl font-light leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Cuando haces scroll, la cámara se mueve en el eje Z. Las capas
                  pasan de lejos a cerca. El fondo se desvanece, las partículas
                  crecen, la superficie se acerca. Es un travelling cinematográfico
                  renderizado en tiempo real.
                </p>
                <p data-scroll className="text-base font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Vuelve arriba y haz scroll lentamente. Observa las capas.
                </p>
              </div>
            </section>

            {/* Footer */}
            <footer
              ref={(el) => {
                if (el) {
                  gsap.fromTo(el.querySelectorAll("[data-scroll]"),
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 1.0, ease: "power3.out", stagger: 0.15,
                      scrollTrigger: { trigger: el, start: "top 80%", scrub: 0.5 } });
                }
              }}
              className="relative py-40 px-6 text-center" style={{ background: "#080610" }}
              aria-label="Contacto"
            >
              <div className="mx-auto max-w-2xl">
                <span data-scroll className="text-[10px] uppercase tracking-[0.5em] mb-10 block" style={{ color: "#d4a574" }}>
                  03 — Contacto
                </span>
                <h2 data-scroll className="font-playfair text-4xl md:text-6xl font-light leading-tight mb-12" style={{ color: "#ffffff", letterSpacing: "-0.02em" }}>
                  Dirigamos algo
                  <br />
                  <span style={{ color: "#d4a574", fontStyle: "italic" }}>
                    que se sienta como cine.
                  </span>
                </h2>
                <a
                  href="mailto:hello@cine.studio"
                  data-hover data-scroll
                  aria-label="Enviar email"
                  className="inline-block text-lg font-light border-b pb-1 transition-colors hover:text-[#d4a574]"
                  style={{ borderColor: "rgba(212,165,116,0.3)", color: "rgba(255,255,255,0.9)" }}
                >
                  hello@cine.studio
                </a>
                <p data-scroll className="mt-20 text-[10px] uppercase tracking-[0.4em]" style={{ color: "rgba(255,255,255,0.2)" }}>
                  © 2026 CINE · 3 capas Z + cámara dolly + coreografía sincronizada
                </p>
              </div>
            </footer>
          </>
        )
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body { font-family: var(--font-inter), system-ui, sans-serif; background: #080610; }
        .font-playfair { font-family: var(--font-playfair), serif; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scrollLine {
          0%, 100% { transform: scaleY(1); transform-origin: top; }
          50% { transform: scaleY(0.2); transform-origin: bottom; }
        }
        @media (pointer: fine) { * { cursor: none !important; } }
        a:focus-visible, button:focus-visible {
          outline: 2px solid #d4a574; outline-offset: 4px;
          box-shadow: 0 0 20px rgba(212,165,116,0.4);
        }
        ::selection { background: #d4a574; color: #080610; }
      `}</style>
    </main>
  );
}
