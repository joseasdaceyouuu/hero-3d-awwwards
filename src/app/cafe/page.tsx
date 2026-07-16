"use client";

/**
 * CAFÉ ALTURAS — Página web completa para marca de café de especialidad.
 *
 * Secciones:
 * 1. Hero con CoffeeAroma (partículas ascendentes) + LetterReveal + HeroPolish
 * 2. Origen — proceso de cultivo en altitud
 * 3. Productos — grid de variedades de café
 * 4. Proceso — timeline del tueste
 * 5. Testimonios — cards de clientes
 * 6. Newsletter — captura de leads
 * 7. Footer — contacto + redes
 *
 * Paleta: tierra cálida (marrón #6B4423 + crema #F5E6D3 + oliva #8B8B3A)
 * Tipografía: Cormorant Garamond (serif) + Inter (sans)
 * Sin WebGL — Canvas 2D + CSS
 */

import { useState, useEffect, useRef } from "react";
import { LetterReveal } from "@/lib/library/components/LetterReveal";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// COFFEE AROMA — partículas ascendentes con flicker
// ============================================================
function CoffeeAroma() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = 1, width = 0, height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: -(0.2 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 0.15,
      size: 2 + Math.random() * 3,
      opacity: 0.1 + Math.random() * 0.2,
      flicker: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      time += 0.01;

      for (const p of particles) {
        if (!reducedMotion) {
          p.y += p.vy;
          p.x += p.vx + Math.sin(time + p.flicker) * 0.2;
          p.flicker += 0.02;
          if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        }
        const flickerOpacity = p.opacity * (0.7 + Math.sin(p.flicker * 3) * 0.3);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, `rgba(139,139,58,${flickerOpacity})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reducedMotion) rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }} />
  );
}

// ============================================================
// SCROLL REVEAL — revela elementos al hacer scroll
// ============================================================
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ============================================================
// PAGE
// ============================================================
export default function CafePage() {
  const [loaded, setLoaded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useScrollReveal();

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, 0);
    const onScroll = () => {
      const p = Math.min(window.scrollY / window.innerHeight, 1);
      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(1 - p * 1.2);
        overlayRef.current.style.transform = `translateY(${-p * 50}px) scale(${1 - p * 0.04})`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loaded]);

  return (
    <main className="relative min-h-screen flex flex-col" style={{ overflowX: "clip", background: "#2A1F18" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { overflow-x: clip; scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #2A1F18; color: #F5E6D3; }
        .font-serif { font-family: 'Cormorant Garamond', serif; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lineExpand { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
        [data-reveal] { opacity: 0; transform: translateY(40px); transition: all 1s cubic-bezier(0.16,1,0.3,1); }
        .reveal-visible { opacity: 1 !important; transform: translateY(0) !important; }
        a:focus-visible, button:focus-visible { outline: 2px solid #8B8B3A; outline-offset: 4px; }
        ::selection { background: #6B4423; color: #F5E6D3; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#2A1F18", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div className="font-serif italic" style={{ fontSize: "22px", color: "#8B8B3A", letterSpacing: "0.2em", marginBottom: "20px" }}>ALTURAS</div>
          <div style={{ width: "220px", height: "1px", background: "rgba(139,139,58,0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "#8B8B3A", animation: "load 1.8s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* ===== NAV ===== */}
          <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", background: "rgba(42,31,24,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(139,139,58,0.1)" }}>
            <div className="font-serif italic" style={{ fontSize: "20px", color: "#8B8B3A", letterSpacing: "0.1em" }}>Alturas</div>
            <div style={{ display: "flex", gap: "32px" }}>
              {["Origen", "Productos", "Proceso", "Contacto"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: "12px", color: "rgba(245,230,211,0.6)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transition: "color 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#8B8B3A"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(245,230,211,0.6)"}>{item}</a>
              ))}
            </div>
          </nav>

          {/* ===== HERO ===== */}
          <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#2A1F18" }}>
            <CoffeeAroma />
            <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(107,68,35,0.15) 0%, transparent 70%)" }} aria-hidden />
            <div style={{ position: "absolute", inset: 0, zIndex: 3, background: "radial-gradient(ellipse at center, transparent 30%, rgba(42,31,24,0.8) 100%)", pointerEvents: "none" }} aria-hidden />

            <div ref={overlayRef} className="relative z-10 text-center px-6 max-w-4xl">
              <div className="font-serif italic mb-8" style={{ fontSize: "14px", fontWeight: 400, color: "#8B8B3A", letterSpacing: "0.35em", textTransform: "uppercase", opacity: 0, animation: "fadeUp 1.2s ease 0.4s forwards" }}>Tostadores · Valle Central · 2026</div>
              <h1 className="font-serif mb-3" style={{ margin: 0 }}>
                <LetterReveal as="span" text="ALTURAS" variant="reveal" baseDelay={0.6} stagger={0.1} duration={1.4} style={{ fontSize: "clamp(60px,12vw,150px)", fontWeight: 500, lineHeight: 0.95, letterSpacing: "0.04em", color: "#F5E6D3", textShadow: "0 0 60px rgba(139,139,58,0.3)" }} />
              </h1>
              <p className="font-serif italic mb-10" style={{ fontSize: "clamp(17px,2.2vw,24px)", fontWeight: 400, color: "#8B8B3A", opacity: 0, animation: "fadeUp 1.2s ease 1.7s forwards" }}>Café de altura · Tueste artesanal</p>
              <div className="mx-auto mb-12" style={{ width: "70px", height: "1px", background: "linear-gradient(90deg, transparent, #8B8B3A, transparent)", opacity: 0, transform: "scaleX(0)", animation: "lineExpand 1.5s ease 2s forwards" }} aria-hidden />
              <p className="font-serif italic mx-auto mb-14" style={{ fontSize: "clamp(16px,1.8vw,21px)", fontWeight: 400, lineHeight: 1.7, color: "rgba(245,230,211,0.7)", maxWidth: "480px", opacity: 0, animation: "fadeUp 1.2s ease 2.2s forwards" }}>
                <span style={{ color: "#6B4423", opacity: 0.7, marginRight: "4px" }}>&ldquo;</span>Cada grano cuenta la historia del sol que lo maduró.<span style={{ color: "#6B4423", opacity: 0.7, marginLeft: "4px" }}>&rdquo;</span>
              </p>
              <div className="flex justify-center gap-10 flex-wrap mb-14" style={{ opacity: 0, animation: "fadeUp 1.2s ease 2.4s forwards" }}>
                {[{ val: "1.200", label: "MSNM" }, { val: "100%", label: "ARÁBICA" }, { val: "48h", label: "FERMENT." }, { val: "12kg", label: "LOTE" }].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div className="font-serif" style={{ fontSize: "26px", fontWeight: 600, color: "#8B8B3A", lineHeight: 1, marginBottom: "6px" }}>{s.val}</div>
                    <div style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(245,230,211,0.4)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-5 flex-wrap" style={{ opacity: 0, animation: "fadeUp 1.2s ease 2.6s forwards" }}>
                <a href="#productos" style={{ padding: "16px 38px", fontFamily: "'Inter',sans-serif", fontSize: "11px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", color: "#2A1F18", background: "#8B8B3A", border: "1px solid #8B8B3A", transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)", display: "inline-block" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#F5E6D3"; e.currentTarget.style.boxShadow = "0 0 40px rgba(139,139,58,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#8B8B3A"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>Comprar Lote</a>
                <a href="#proceso" style={{ padding: "16px 38px", fontFamily: "'Inter',sans-serif", fontSize: "11px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", color: "#8B8B3A", background: "transparent", border: "1px solid rgba(139,139,58,0.4)", transition: "all 0.5s", display: "inline-block" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B8B3A"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.4)"; e.currentTarget.style.transform = "translateY(0)"; }}>El Proceso</a>
              </div>
            </div>
            <HeroPolish accentColor="#8B8B3A" />
          </section>

          {/* ===== ORIGEN ===== */}
          <section id="origen" className="py-32 px-6" style={{ background: "#2A1F18", borderTop: "1px solid rgba(139,139,58,0.1)" }}>
            <div className="mx-auto max-w-5xl">
              <div data-reveal className="text-center mb-16">
                <span className="font-mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>01 — Origen</span>
                <h2 className="font-serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3", letterSpacing: "-0.02em" }}>A 1.200 metros,<br /><span style={{ color: "#6B4423", fontStyle: "italic" }}>el tiempo es otro.</span></h2>
              </div>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div data-reveal>
                  <p style={{ fontSize: "16px", lineHeight: 1.9, color: "rgba(245,230,211,0.7)", marginBottom: "20px" }}>
                    En las laderas del Valle Central, a 1.200 metros sobre el nivel del mar, el café madura lentamente. La diferencia térmica entre día y noche —hasta 20°C— concentra los azúcares en el grano, creando una complejidad imposible de replicar en altitudes menores.
                  </p>
                  <p style={{ fontSize: "14px", lineHeight: 1.9, color: "rgba(245,230,211,0.5)", marginBottom: "20px" }}>
                    Cultivamos variedades arábica Bourbon y Caturra bajo sombra de inga y poró. Cada árbol se cosecha a mano, seleccionando solo los cerezos en su punto exacto de maduración.
                  </p>
                  <div className="flex gap-8 mt-8">
                    {[{ v: "Bourbon", l: "VARIEDAD" }, { v: "Caturra", l: "VARIEDAD" }, { v: "Sombra", l: "CULTIVO" }].map((s) => (
                      <div key={s.l}><div className="font-serif" style={{ fontSize: "18px", color: "#8B8B3A", fontWeight: 600 }}>{s.v}</div><div style={{ fontSize: "8px", letterSpacing: "0.2em", color: "rgba(245,230,211,0.3)", marginTop: "4px" }}>{s.l}</div></div>
                    ))}
                  </div>
                </div>
                <div data-reveal style={{ aspectRatio: "4/5", background: "linear-gradient(135deg, #3a2a1f, #1a1208), radial-gradient(circle at 60% 30%, rgba(139,139,58,0.15), transparent)", borderRadius: "2px", border: "1px solid rgba(139,139,58,0.1)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="font-serif italic" style={{ fontSize: "120px", color: "rgba(139,139,58,0.08)", fontWeight: 600 }}>1.200m</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== PRODUCTOS ===== */}
          <section id="productos" className="py-32 px-6" style={{ background: "#1F1812" }}>
            <div className="mx-auto max-w-6xl">
              <div data-reveal className="text-center mb-16">
                <span className="font-mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>02 — Productos</span>
                <h2 className="font-serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Nuestros lotes</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { nombre: "Honey Process", desc: "Fermentación 48h, mucílago parcial. Notas a miel, albaricoque y panela.", precio: "$18.500", peso: "250g", color: "#8B5E3C" },
                  { nombre: "Natural Secado", desc: "Secado al sol con cereza intacta. Cuerpo intenso, notas a frutos rojos y chocolate.", precio: "$16.000", peso: "250g", color: "#6B4423" },
                  { nombre: "Washed Clásico", desc: "Desmucilaginado y lavado. Limpieza y brillantez, notas a jazmín y cítricos.", precio: "$15.000", peso: "250g", color: "#8B8B3A" },
                ].map((p, i) => (
                  <div key={i} data-reveal style={{ background: "rgba(42,31,24,0.6)", border: "1px solid rgba(139,139,58,0.15)", padding: "32px", borderRadius: "2px", transition: "all 0.5s", cursor: "pointer" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.4)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.15)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ width: "100%", aspectRatio: "1", background: `linear-gradient(135deg, ${p.color}, #2A1F18)`, marginBottom: "24px", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="font-serif italic" style={{ fontSize: "60px", color: "rgba(245,230,211,0.15)", fontWeight: 600 }}>{i + 1}</span>
                    </div>
                    <h3 className="font-serif" style={{ fontSize: "24px", fontWeight: 600, color: "#F5E6D3", marginBottom: "8px" }}>{p.nombre}</h3>
                    <p style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(245,230,211,0.5)", marginBottom: "20px" }}>{p.desc}</p>
                    <div className="flex justify-between items-center" style={{ borderTop: "1px solid rgba(139,139,58,0.1)", paddingTop: "16px" }}>
                      <div><span className="font-serif" style={{ fontSize: "22px", fontWeight: 700, color: "#8B8B3A" }}>{p.precio}</span><span style={{ fontSize: "10px", color: "rgba(245,230,211,0.3)", marginLeft: "8px" }}>{p.peso}</span></div>
                      <button style={{ padding: "8px 20px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2A1F18", background: "#8B8B3A", border: "none", cursor: "pointer", transition: "all 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F5E6D3"} onMouseLeave={(e) => e.currentTarget.style.background = "#8B8B3A"}>Comprar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== PROCESO ===== */}
          <section id="proceso" className="py-32 px-6" style={{ background: "#2A1F18" }}>
            <div className="mx-auto max-w-4xl">
              <div data-reveal className="text-center mb-16">
                <span className="font-mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>03 — Proceso</span>
                <h2 className="font-serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Del grano a la taza</h2>
              </div>
              <div className="relative">
                <div style={{ position: "absolute", left: "24px", top: 0, bottom: 0, width: "1px", background: "rgba(139,139,58,0.2)" }} aria-hidden />
                {[
                  { n: "01", t: "Cosecha", d: "Selección manual de cerezos en punto de maduración. Solo rojos, nunca verdes.", time: "Marzo - Junio" },
                  { n: "02", t: "Fermentación", d: "48 horas en tanques de fermentación controlada a 22°C. Desarrolla dulzor y complejidad.", time: "48 horas" },
                  { n: "03", t: "Secado", d: "Secado en camas africanas elevadas bajo sol. Volteo manual cada 2 horas durante 15 días.", time: "15 días" },
                  { n: "04", t: "Tueste", d: "Tueste en tambor rotativo a leña. El maestro tster escucha el crack y decide el momento exacto.", time: "52 minutos" },
                  { n: "05", t: "Reposo", d: "El café reposa 7 días después del tueste para desarrollar su perfil completo de sabor.", time: "7 días" },
                ].map((step, i) => (
                  <div key={i} data-reveal className="flex gap-6 mb-12" style={{ transitionDelay: `${i * 100}ms` }}>
                    <div style={{ flexShrink: 0, width: "48px", height: "48px", borderRadius: "50%", background: "#2A1F18", border: "2px solid #8B8B3A", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                      <span className="font-mono" style={{ fontSize: "14px", fontWeight: 700, color: "#8B8B3A" }}>{step.n}</span>
                    </div>
                    <div style={{ flex: 1, paddingTop: "6px" }}>
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <h3 className="font-serif" style={{ fontSize: "22px", fontWeight: 600, color: "#F5E6D3" }}>{step.t}</h3>
                        <span className="font-mono" style={{ fontSize: "10px", color: "rgba(139,139,58,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{step.time}</span>
                      </div>
                      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(245,230,211,0.5)" }}>{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== TESTIMONIOS ===== */}
          <section className="py-32 px-6" style={{ background: "#1F1812" }}>
            <div className="mx-auto max-w-5xl">
              <div data-reveal className="text-center mb-16">
                <span className="font-mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>04 — Testimonios</span>
                <h2 className="font-serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Lo que dicen</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { n: "María José Vega", r: "Barista, Café Origen SCL", t: "El Honey de Alturas tiene una dulzura que no he encontrado en otro café chileno. Lo servimos como espresso y los clientes quedan sorprendidos." },
                  { n: "Tomás Brunner", r: "Q-Grader", t: "Complejidad notable para un café de 1.200msnm. El proceso de fermentación controlada se nota en la taza: limpieza y dulzor en perfecto balance." },
                  { n: "Camila Rojas", r: "Chef pastelera", t: "Uso el Natural de Alturas en mis postres. Las notas a frutos rojos complementan el chocolate de manera excepcional. Un producto de altura literalmente." },
                ].map((t, i) => (
                  <div key={i} data-reveal style={{ background: "rgba(42,31,24,0.6)", border: "1px solid rgba(139,139,58,0.1)", padding: "28px", borderRadius: "2px" }}>
                    <div style={{ fontSize: "40px", color: "rgba(139,139,58,0.2)", lineHeight: 0, marginBottom: "20px", fontFamily: "'Cormorant Garamond', serif" }}>&ldquo;</div>
                    <p className="font-serif italic" style={{ fontSize: "15px", lineHeight: 1.8, color: "rgba(245,230,211,0.7)", marginBottom: "24px" }}>{t.t}</p>
                    <div style={{ borderTop: "1px solid rgba(139,139,58,0.1)", paddingTop: "16px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5E6D3" }}>{t.n}</div>
                      <div style={{ fontSize: "11px", color: "rgba(139,139,58,0.6)", marginTop: "4px" }}>{t.r}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== NEWSLETTER ===== */}
          <section id="contacto" className="py-32 px-6" style={{ background: "#2A1F18" }}>
            <div className="mx-auto max-w-2xl text-center">
              <div data-reveal>
                <span className="font-mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>05 — Newsletter</span>
                <h2 className="font-serif font-light mb-6" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Únete al lote<br /><span style={{ color: "#6B4423", fontStyle: "italic" }}>de los que saben.</span></h2>
                <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(245,230,211,0.5)", maxWidth: "400px", margin: "0 auto 32px" }}>Recibe nuevos lotes, eventos de cata y historias del valle. Una vez al mes, sin spam.</p>
                <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: "8px", maxWidth: "440px", margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
                  <input type="email" placeholder="tu@correo.com" aria-label="Email" style={{ flex: 1, minWidth: "200px", padding: "14px 20px", background: "rgba(42,31,24,0.8)", border: "1px solid rgba(139,139,58,0.3)", color: "#F5E6D3", fontSize: "14px", fontFamily: "'Inter',sans-serif", outline: "none", borderRadius: 0 }} />
                  <button type="submit" style={{ padding: "14px 32px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2A1F18", background: "#8B8B3A", border: "none", cursor: "pointer", transition: "all 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F5E6D3"} onMouseLeave={(e) => e.currentTarget.style.background = "#8B8B3A"}>Suscribir</button>
                </form>
              </div>
            </div>
          </section>

          {/* ===== FOOTER ===== */}
          <footer className="mt-auto" style={{ background: "#1A1208", borderTop: "1px solid rgba(139,139,58,0.1)", padding: "60px 40px 40px" }}>
            <div className="mx-auto max-w-6xl">
              <div className="grid md:grid-cols-4 gap-12 mb-16">
                <div>
                  <div className="font-serif italic" style={{ fontSize: "24px", color: "#8B8B3A", marginBottom: "12px" }}>Alturas</div>
                  <p style={{ fontSize: "12px", lineHeight: 1.7, color: "rgba(245,230,211,0.4)" }}>Tostadores de café de especialidad. Valle Central, Chile. Cultivando a 1.200msnm desde 2019.</p>
                </div>
                <div>
                  <h4 className="font-mono" style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B8B3A", marginBottom: "16px" }}>Productos</h4>
                  {["Honey Process", "Natural Secado", "Washed Clásico", "Suscripción"].map((l) => (
                    <a key={l} href="#productos" style={{ display: "block", fontSize: "13px", color: "rgba(245,230,211,0.4)", textDecoration: "none", marginBottom: "8px", transition: "color 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#8B8B3A"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(245,230,211,0.4)"}>{l}</a>
                  ))}
                </div>
                <div>
                  <h4 className="font-mono" style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B8B3A", marginBottom: "16px" }}>Contacto</h4>
                  <p style={{ fontSize: "13px", color: "rgba(245,230,211,0.4)", lineHeight: 1.8 }}>hola@alturas.cafe<br />+56 9 1234 5678<br />Valle Central, Chile</p>
                </div>
                <div>
                  <h4 className="font-mono" style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B8B3A", marginBottom: "16px" }}>Síguenos</h4>
                  <div className="flex gap-3">
                    {["IG", "FB", "TW"].map((s) => (
                      <a key={s} href="#" aria-label={s} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(139,139,58,0.2)", color: "rgba(245,230,211,0.4)", fontSize: "11px", fontWeight: 600, textDecoration: "none", transition: "all 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B8B3A"; e.currentTarget.style.color = "#8B8B3A"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.2)"; e.currentTarget.style.color = "rgba(245,230,211,0.4)"; }}>{s}</a>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(139,139,58,0.1)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <p className="font-mono" style={{ fontSize: "10px", color: "rgba(245,230,211,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>© 2026 Alturas · Café de especialidad · Valle Central, Chile</p>
                <p className="font-mono" style={{ fontSize: "10px", color: "rgba(245,230,211,0.2)", letterSpacing: "0.1em" }}>Hecho con la skill hero-3d-awwwards</p>
              </div>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
