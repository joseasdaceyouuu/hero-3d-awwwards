"use client";

/**
 * ALTURAS COFFEE — Landing page profesional completa.
 *
 * Secciones:
 * 1. Nav fijo con scroll progress
 * 2. Hero con video scroll scrubbing (video real)
 * 3. Marca — storytelling con parallax
 * 4. Productos — grid con hover + quick view
 * 5. Proceso — timeline interactivo
 * 6. Origen — mapa + altitud
 * 7. Sostenibilidad — cards con stats
 * 8. Testimonios — carrusel
 * 9. Suscripción — planes pricing
 * 10. Newsletter — captura
 * 11. Footer completo
 *
 * Paleta: tierra cálida (#2A1F18 + #6B4423 + #F5E6D3 + #8B8B3A)
 */

import { useState, useEffect, useRef } from "react";
import { LetterReveal } from "@/lib/library/components/LetterReveal";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

function CafeLanding() {
  const [loaded, setLoaded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeProduct, setActiveProduct] = useState<number | null>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);

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
      if (max > 0) setScrollProgress(Math.min(window.scrollY / max, 1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loaded]);

  // Scroll reveal
  useEffect(() => {
    if (!loaded) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("r"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll("[data-r]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loaded]);

  const products = [
    { n: "Honey Process", d: "Fermentación 48h. Notas a miel, albaricoque y panela.", p: "$18.500", w: "250g", c: "#8B5E3C", tag: "Bestseller" },
    { n: "Natural Secado", d: "Secado al sol con cereza. Cuerpo intenso, frutos rojos.", p: "$16.000", w: "250g", c: "#6B4423", tag: "Intenso" },
    { n: "Washed Clásico", d: "Desmucilaginado. Limpieza, jazmín y cítricos.", p: "$15.000", w: "250g", c: "#8B8B3A", tag: "Premium" },
    { n: "Espresso Blend", d: "Mezcla Honey + Natural para espresso. Cuerpo cremoso.", p: "$14.000", w: "250g", c: "#4A3020", tag: "Nuevo" },
    { n: "Cold Brew", d: "Tueste claro especializado para extracción en frío.", p: "$17.000", w: "250g", c: "#5A4030", tag: "Verano" },
    { n: "Decaf CO2", d: "Descafeinado con CO2. 99% sin cafeína, 100% sabor.", p: "$19.000", w: "250g", c: "#7A5A3A", tag: "Sin cafeína" },
  ];

  const process = [
    { n: "01", t: "Cosecha", d: "Selección manual de cerezos rojos. Solo maduros.", time: "Mar - Jun" },
    { n: "02", t: "Fermentación", d: "48h en tanques a 22°C. Desarrolla dulzor.", time: "48 horas" },
    { n: "03", t: "Secado", d: "Camas africanas, volteo cada 2h, 15 días.", time: "15 días" },
    { n: "04", t: "Tueste", d: "Tambor a leña. El maestro escucha el crack.", time: "52 min" },
    { n: "05", t: "Reposo", d: "7 días para desarrollar perfil completo.", time: "7 días" },
    { n: "06", t: "Empaque", d: "Bolsas con válvula desgasificadora. Sello de origen.", time: "En vivo" },
  ];

  const testimonials = [
    { n: "María José Vega", r: "Barista, Café Origen SCL", t: "El Honey de Alturas tiene una dulzura única. Lo servimos como espresso y sorprende a todos.", img: "MJ" },
    { n: "Tomás Brunner", r: "Q-Grader certificado", t: "Complejidad notable para 1.200msnm. Fermentación controlada se nota: limpieza y dulzor en balance.", img: "TB" },
    { n: "Camila Rojas", r: "Chef pastelera", t: "Uso el Natural en mis postres. Las notas a frutos rojos complementan el chocolate perfectamente.", img: "CR" },
  ];

  const plans = [
    { n: "Descubrimiento", p: "$12.000", per: "/mes", d: "1 bolsa 250g", f: ["1 variedad rotativa", "Guía de preparación", "Envío estándar"], c: false },
    { n: "Suscriptor", p: "$32.000", per: "/mes", d: "3 bolsas 250g", f: ["3 variedades fijas", "Descuento 15%", "Envío prioritario", "Eventos de cata"], c: true },
    { n: "Connoisseur", p: "$55.000", per: "/mes", d: "6 bolsas 250g", f: ["6 micro-lotes", "Descuento 25%", "Envío express", "Catas con el maestro", "Lotes exclusivos"], c: false },
  ];

  return (
    <main className="relative flex min-h-screen flex-col" style={{ overflowX: "clip", background: "#2A1F18" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { overflow-x: clip; scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #2A1F18; color: #F5E6D3; }
        .serif { font-family: 'Cormorant Garamond', serif; }
        .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lineExp { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        [data-r] { opacity: 0; transform: translateY(40px); transition: all 0.8s cubic-bezier(0.16,1,0.3,1); }
        [data-r].r { opacity: 1 !important; transform: translateY(0) !important; }
        a:focus-visible, button:focus-visible { outline: 2px solid #8B8B3A; outline-offset: 4px; }
        ::selection { background: #6B4423; color: #F5E6D3; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1a1208; }
        ::-webkit-scrollbar-thumb { background: #6B4423; border-radius: 4px; }
      `}</style>

      {/* PRELOADER */}
      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#2A1F18", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div className="serif italic" style={{ fontSize: "28px", color: "#8B8B3A", letterSpacing: "0.2em", marginBottom: "20px" }}>ALTURAS</div>
          <div style={{ width: "220px", height: "1px", background: "rgba(139,139,58,0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", height: "100%", width: "0%", background: "#8B8B3A", animation: "load 1.5s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* SCROLL PROGRESS BAR */}
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", zIndex: 60 }}>
            <div style={{ height: "100%", width: `${scrollProgress * 100}%`, background: "linear-gradient(90deg, #8B8B3A, #D4A05E, #F5E6D3)", transition: "width 0.05s" }} />
          </div>

          {/* NAV */}
          <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", background: scrollProgress > 0.05 ? "rgba(42,31,24,0.9)" : "transparent", backdropFilter: scrollProgress > 0.05 ? "blur(12px)" : "none", borderBottom: scrollProgress > 0.05 ? "1px solid rgba(139,139,58,0.1)" : "none", transition: "all 0.3s" }}>
            <div className="serif italic" style={{ fontSize: "22px", color: "#8B8B3A", letterSpacing: "0.1em", cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Alturas</div>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }} className="hidden md:flex">
              {["Origen", "Productos", "Proceso", "Planes", "Contacto"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: "12px", color: "rgba(245,230,211,0.6)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transition: "color 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#8B8B3A"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(245,230,211,0.6)"}>{item}</a>
              ))}
              <a href="#productos" style={{ padding: "8px 24px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2A1F18", background: "#8B8B3A", textDecoration: "none", transition: "all 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F5E6D3"} onMouseLeave={(e) => e.currentTarget.style.background = "#8B8B3A"}>Comprar</a>
            </div>
            <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} style={{ background: "none", border: "none", color: "#F5E6D3", fontSize: "24px", cursor: "pointer" }} aria-label="Menú">☰</button>
          </nav>

          {/* MOBILE MENU */}
          {mobileMenu && (
            <div style={{ position: "fixed", top: "64px", left: 0, right: 0, background: "rgba(42,31,24,0.95)", backdropFilter: "blur(12px)", zIndex: 49, padding: "20px 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {["Origen", "Productos", "Proceso", "Planes", "Contacto"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: "#F5E6D3", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase" }}>{item}</a>
              ))}
            </div>
          )}

          {/* HERO */}
          <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#2A1F18" }}>
            {/* CoffeeAroma particles */}
            <CoffeeAroma />
            {/* Background gradient */}
            <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(107,68,35,0.15) 0%, transparent 70%)" }} aria-hidden />
            <div style={{ position: "absolute", inset: 0, zIndex: 3, background: "radial-gradient(ellipse at center, transparent 30%, rgba(42,31,24,0.8) 100%)", pointerEvents: "none" }} aria-hidden />

            <div className="relative z-10 text-center px-6 max-w-4xl" style={{ animation: "fadeUp 1.5s ease 0.3s both" }}>
              <div className="serif italic mb-6" style={{ fontSize: "15px", fontWeight: 400, color: "#8B8B3A", letterSpacing: "0.35em", textTransform: "uppercase" }}>Tostadores · Valle Central · 2026</div>
              <h1 className="serif mb-3" style={{ margin: 0 }}>
                <LetterReveal as="span" text="ALTURAS" variant="reveal" baseDelay={0.4} stagger={0.1} duration={1.4} style={{ fontSize: "clamp(60px,12vw,150px)", fontWeight: 500, lineHeight: 0.95, letterSpacing: "0.04em", color: "#F5E6D3", textShadow: "0 0 60px rgba(139,139,58,0.3)" }} />
              </h1>
              <p className="serif italic mb-10" style={{ fontSize: "clamp(17px,2.2vw,24px)", fontWeight: 400, color: "#8B8B3A", opacity: 0, animation: "fadeUp 1.2s ease 1.5s forwards" }}>Café de altura · Tueste artesanal</p>
              <div className="mx-auto mb-12" style={{ width: "70px", height: "1px", background: "linear-gradient(90deg, transparent, #8B8B3A, transparent)", opacity: 0, transform: "scaleX(0)", animation: "lineExp 1.5s ease 1.8s forwards" }} aria-hidden />
              <p className="serif italic mx-auto mb-14" style={{ fontSize: "clamp(16px,1.8vw,21px)", fontWeight: 400, lineHeight: 1.7, color: "rgba(245,230,211,0.7)", maxWidth: "480px", opacity: 0, animation: "fadeUp 1.2s ease 2s forwards" }}>
                <span style={{ color: "#6B4423", opacity: 0.7, marginRight: "4px" }}>&ldquo;</span>Cada grano cuenta la historia del sol que lo maduró.<span style={{ color: "#6B4423", opacity: 0.7, marginLeft: "4px" }}>&rdquo;</span>
              </p>
              <div className="flex justify-center gap-10 flex-wrap mb-14" style={{ opacity: 0, animation: "fadeUp 1.2s ease 2.2s forwards" }}>
                {[{ v: "1.200", l: "MSNM" }, { v: "100%", l: "ARÁBICA" }, { v: "52min", l: "TUESTE" }, { v: "12kg", l: "LOTE" }].map((s) => (
                  <div key={s.l} style={{ textAlign: "center" }}>
                    <div className="serif" style={{ fontSize: "28px", fontWeight: 600, color: "#8B8B3A", lineHeight: 1, marginBottom: "6px" }}>{s.v}</div>
                    <div style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(245,230,211,0.4)" }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-5 flex-wrap" style={{ opacity: 0, animation: "fadeUp 1.2s ease 2.4s forwards" }}>
                <a href="#productos" style={{ padding: "16px 38px", fontSize: "11px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", color: "#2A1F18", background: "#8B8B3A", border: "1px solid #8B8B3A", transition: "all 0.5s", display: "inline-block" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#F5E6D3"; e.currentTarget.style.boxShadow = "0 0 40px rgba(139,139,58,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#8B8B3A"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>Comprar Café</a>
                <a href="#proceso" style={{ padding: "16px 38px", fontSize: "11px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none", color: "#8B8B3A", background: "transparent", border: "1px solid rgba(139,139,58,0.4)", transition: "all 0.5s", display: "inline-block" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B8B3A"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.4)"; e.currentTarget.style.transform = "translateY(0)"; }}>Ver Proceso</a>
              </div>
            </div>
            <HeroPolish accentColor="#8B8B3A" />
          </section>

          {/* MARCA / STORYTELLING */}
          <section className="py-32 px-6" style={{ background: "#1F1812", borderTop: "1px solid rgba(139,139,58,0.1)" }}>
            <div className="mx-auto max-w-5xl">
              <div data-r className="text-center mb-16">
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>01 — Nuestra Historia</span>
                <h2 className="serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3", letterSpacing: "-0.02em" }}>No vendemos café.<br /><span style={{ color: "#6B4423", fontStyle: "italic" }}>Vendemos un ritual.</span></h2>
              </div>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div data-r>
                  <p style={{ fontSize: "16px", lineHeight: 1.9, color: "rgba(245,230,211,0.7)", marginBottom: "20px" }}>Empezamos en 2019 con 12 plantas de Bourbon y una pregunta: ¿qué pasaría si cuidamos cada etapa del proceso como si fuera la única? La respuesta está en cada taza: un café que sabe a paciencia, a altitud, a sol andino.</p>
                  <p style={{ fontSize: "14px", lineHeight: 1.9, color: "rgba(245,230,211,0.5)", marginBottom: "24px" }}>Hoy cultivamos 4 variedades en 3 hectáreas a 1.200msnm. Cada lote es único, numerado y trazable. Sabes exactamente qué cerezo, qué día y qué manos lo tocaron.</p>
                  <div className="flex gap-8">
                    {[{ v: "2019", l: "FUNDACIÓN" }, { v: "4", l: "VARIEDADES" }, { v: "3", l: "HECTÁREAS" }].map((s) => (
                      <div key={s.l}><div className="serif" style={{ fontSize: "22px", color: "#8B8B3A", fontWeight: 600 }}>{s.v}</div><div style={{ fontSize: "8px", letterSpacing: "0.2em", color: "rgba(245,230,211,0.3)", marginTop: "4px" }}>{s.l}</div></div>
                    ))}
                  </div>
                </div>
                <div data-r style={{ aspectRatio: "4/5", background: "linear-gradient(135deg, #3a2a1f, #1a1208), radial-gradient(circle at 60% 30%, rgba(139,139,58,0.15), transparent)", border: "1px solid rgba(139,139,58,0.1)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="serif italic" style={{ fontSize: "100px", color: "rgba(139,139,58,0.08)", fontWeight: 600 }}>2019</span>
                </div>
              </div>
            </div>
          </section>

          {/* PRODUCTOS */}
          <section id="productos" className="py-32 px-6" style={{ background: "#2A1F18" }}>
            <div className="mx-auto max-w-6xl">
              <div data-r className="text-center mb-16">
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>02 — Productos</span>
                <h2 className="serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Nuestros lotes</h2>
                <p style={{ fontSize: "14px", color: "rgba(245,230,211,0.4)", marginTop: "12px" }}>Cada lote es numerado y trazable</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {products.map((p, i) => (
                  <div key={i} data-r style={{ background: "rgba(42,31,24,0.6)", border: "1px solid rgba(139,139,58,0.15)", borderRadius: "2px", transition: "all 0.5s", cursor: "pointer", overflow: "hidden", position: "relative" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.4)"; e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)"; setActiveProduct(i); }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.15)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; setActiveProduct(null); }}>
                    {/* Tag */}
                    {p.tag && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 10px", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2A1F18", background: "#8B8B3A", zIndex: 2 }}>{p.tag}</div>}
                    {/* Image placeholder */}
                    <div style={{ width: "100%", aspectRatio: "1", background: `linear-gradient(135deg, ${p.c}, #2A1F18)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <span className="serif italic" style={{ fontSize: "50px", color: "rgba(245,230,211,0.12)", fontWeight: 600 }}>{i + 1}</span>
                      {activeProduct === i && <div style={{ position: "absolute", inset: 0, background: "rgba(42,31,24,0.7)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeUp 0.3s ease" }}><span style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B8B3A", fontWeight: 600 }}>Ver detalles →</span></div>}
                    </div>
                    {/* Info */}
                    <div style={{ padding: "24px" }}>
                      <h3 className="serif" style={{ fontSize: "22px", fontWeight: 600, color: "#F5E6D3", marginBottom: "8px" }}>{p.n}</h3>
                      <p style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(245,230,211,0.5)", marginBottom: "20px" }}>{p.d}</p>
                      <div className="flex justify-between items-center" style={{ borderTop: "1px solid rgba(139,139,58,0.1)", paddingTop: "16px" }}>
                        <div><span className="serif" style={{ fontSize: "20px", fontWeight: 700, color: "#8B8B3A" }}>{p.p}</span><span style={{ fontSize: "10px", color: "rgba(245,230,211,0.3)", marginLeft: "8px" }}>{p.w}</span></div>
                        <button style={{ padding: "8px 20px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2A1F18", background: "#8B8B3A", border: "none", cursor: "pointer", transition: "all 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F5E6D3"} onMouseLeave={(e) => e.currentTarget.style.background = "#8B8B3A"}>Agregar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PROCESO */}
          <section id="proceso" className="py-32 px-6" style={{ background: "#1F1812" }}>
            <div className="mx-auto max-w-4xl">
              <div data-r className="text-center mb-16">
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>03 — Proceso</span>
                <h2 className="serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Del grano a la taza</h2>
              </div>
              <div className="relative">
                <div style={{ position: "absolute", left: "24px", top: 0, bottom: 0, width: "1px", background: "rgba(139,139,58,0.2)" }} aria-hidden />
                {process.map((step, i) => (
                  <div key={i} data-r className="flex gap-6 mb-10" style={{ transitionDelay: `${i * 80}ms` }}>
                    <div style={{ flexShrink: 0, width: "48px", height: "48px", borderRadius: "50%", background: "#1F1812", border: "2px solid #8B8B3A", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}><span className="mono" style={{ fontSize: "13px", fontWeight: 700, color: "#8B8B3A" }}>{step.n}</span></div>
                    <div style={{ flex: 1, paddingTop: "6px" }}>
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <h3 className="serif" style={{ fontSize: "20px", fontWeight: 600, color: "#F5E6D3" }}>{step.t}</h3>
                        <span className="mono" style={{ fontSize: "10px", color: "rgba(139,139,58,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{step.time}</span>
                      </div>
                      <p style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(245,230,211,0.5)" }}>{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ORIGEN */}
          <section id="origen" className="py-32 px-6" style={{ background: "#2A1F18", borderTop: "1px solid rgba(139,139,58,0.1)" }}>
            <div className="mx-auto max-w-5xl">
              <div data-r className="text-center mb-16">
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>04 — Origen</span>
                <h2 className="serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>A 1.200 metros,<br /><span style={{ color: "#6B4423", fontStyle: "italic" }}>el tiempo es otro.</span></h2>
              </div>
              <div data-r className="grid md:grid-cols-3 gap-6">
                {[
                  { t: "Altitud", v: "1.200msnm", d: "La diferencia térmica día/noche de hasta 20°C concentra azúcares en el grano." },
                  { t: "Suelo", v: "Volcánico", d: "Suelos de origen volcánico con alto contenido de minerales y drenaje natural." },
                  { t: "Variedad", v: "Bourbon", d: "Cultivamos Bourbon, Caturra y Catuaí bajo sombra de inga y poró." },
                  { t: "Cosecha", v: "Manual", d: "Selección manual de cerezos en punto de maduración. Solo rojos, nunca verdes." },
                  { t: "Lluvia", v: "1.400mm", d: "Precipitación anual ideal para café arábica de specialty." },
                  { t: "Temperatura", v: "18-24°C", d: "Rango térmico perfecto para desarrollo lento del grano." },
                ].map((s, i) => (
                  <div key={i} style={{ background: "rgba(42,31,24,0.6)", border: "1px solid rgba(139,139,58,0.1)", padding: "28px", borderRadius: "2px", transition: "all 0.4s" }} onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(139,139,58,0.3)"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(139,139,58,0.1)"}>
                    <div className="mono" style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(139,139,58,0.5)", marginBottom: "8px" }}>{s.t}</div>
                    <div className="serif" style={{ fontSize: "28px", fontWeight: 600, color: "#8B8B3A", marginBottom: "12px" }}>{s.v}</div>
                    <p style={{ fontSize: "13px", lineHeight: 1.7, color: "rgba(245,230,211,0.4)" }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SOSTENIBILIDAD */}
          <section className="py-32 px-6" style={{ background: "#1F1812" }}>
            <div className="mx-auto max-w-4xl">
              <div data-r className="text-center mb-16">
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>05 — Sostenibilidad</span>
                <h2 className="serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Café con conciencia</h2>
              </div>
              <div data-r className="grid md:grid-cols-4 gap-6">
                {[
                  { v: "100%", l: "ORGÁNICO", d: "Sin pesticidas ni químicos sintéticos" },
                  { v: "0", l: "EMISIONES", d: "Compensamos toda nuestra huella de carbono" },
                  { v: "12", l: "FAMILIAS", d: "Trabajadores locales con salario justo" },
                  { v: "3", l: "HECTÁREAS", d: "Bajo sombra de inga y poró nativos" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div className="serif" style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 700, color: "#8B8B3A", lineHeight: 1, marginBottom: "8px" }}>{s.v}</div>
                    <div className="mono" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(245,230,211,0.6)", marginBottom: "8px" }}>{s.l}</div>
                    <p style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(245,230,211,0.35)" }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TESTIMONIOS */}
          <section className="py-32 px-6" style={{ background: "#2A1F18" }}>
            <div className="mx-auto max-w-4xl">
              <div data-r className="text-center mb-16">
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>06 — Testimonios</span>
                <h2 className="serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Lo que dicen</h2>
              </div>
              <div data-r style={{ background: "rgba(42,31,24,0.6)", border: "1px solid rgba(139,139,58,0.1)", padding: "40px", borderRadius: "2px", position: "relative" }}>
                <div style={{ fontSize: "60px", color: "rgba(139,139,58,0.15)", lineHeight: 0, marginBottom: "20px", fontFamily: "'Cormorant Garamond', serif" }}>&ldquo;</div>
                <p className="serif italic" style={{ fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.8, color: "rgba(245,230,211,0.8)", marginBottom: "32px" }}>{testimonials[activeTestimonial].t}</p>
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #8B8B3A, #6B4423)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2A1F18", fontWeight: 700, fontSize: "16px" }}>{testimonials[activeTestimonial].img}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5E6D3" }}>{testimonials[activeTestimonial].n}</div>
                      <div style={{ fontSize: "11px", color: "rgba(139,139,58,0.6)", marginTop: "2px" }}>{testimonials[activeTestimonial].r}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {testimonials.map((_, i) => (
                      <button key={i} onClick={() => setActiveTestimonial(i)} aria-label={`Testimonio ${i+1}`} style={{ width: activeTestimonial === i ? "28px" : "8px", height: "4px", borderRadius: "2px", background: activeTestimonial === i ? "#8B8B3A" : "rgba(245,230,211,0.2)", border: "none", cursor: "pointer", transition: "all 0.3s" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PLANES / SUSCRIPCIÓN */}
          <section id="planes" className="py-32 px-6" style={{ background: "#1F1812" }}>
            <div className="mx-auto max-w-5xl">
              <div data-r className="text-center mb-16">
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>07 — Suscripción</span>
                <h2 className="serif font-light" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Café en tu puerta<br /><span style={{ color: "#6B4423", fontStyle: "italic" }}>cada mes.</span></h2>
              </div>
              <div data-r className="grid md:grid-cols-3 gap-6">
                {plans.map((plan, i) => (
                  <div key={i} style={{ background: plan.c ? "rgba(139,139,58,0.08)" : "rgba(42,31,24,0.6)", border: plan.c ? "2px solid #8B8B3A" : "1px solid rgba(139,139,58,0.15)", borderRadius: "2px", padding: "36px 28px", position: "relative", transition: "all 0.4s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    {plan.c && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "4px 16px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2A1F18", background: "#8B8B3A" }}>Más popular</div>}
                    <h3 className="serif" style={{ fontSize: "24px", fontWeight: 600, color: "#F5E6D3", marginBottom: "8px" }}>{plan.n}</h3>
                    <p style={{ fontSize: "12px", color: "rgba(245,230,211,0.4)", marginBottom: "24px" }}>{plan.d}</p>
                    <div className="flex items-baseline gap-2 mb-28">
                      <span className="serif" style={{ fontSize: "36px", fontWeight: 700, color: "#8B8B3A" }}>{plan.p}</span>
                      <span style={{ fontSize: "13px", color: "rgba(245,230,211,0.4)" }}>{plan.per}</span>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0" }}>
                      {plan.f.map((feat, j) => (
                        <li key={j} style={{ fontSize: "13px", color: "rgba(245,230,211,0.6)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8B8B3A", flexShrink: 0 }} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <button style={{ width: "100%", padding: "14px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: plan.c ? "#2A1F18" : "#8B8B3A", background: plan.c ? "#8B8B3A" : "transparent", border: plan.c ? "none" : "1px solid rgba(139,139,58,0.4)", cursor: "pointer", transition: "all 0.3s" }} onMouseEnter={(e) => { if (plan.c) e.currentTarget.style.background = "#F5E6D3"; else { e.currentTarget.style.background = "rgba(139,139,58,0.1)"; e.currentTarget.style.borderColor = "#8B8B3A"; } }} onMouseLeave={(e) => { if (plan.c) e.currentTarget.style.background = "#8B8B3A"; else { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(139,139,58,0.4)"; } }}>Suscribirse</button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* NEWSLETTER */}
          <section id="contacto" className="py-32 px-6" style={{ background: "#2A1F18", borderTop: "1px solid rgba(139,139,58,0.1)" }}>
            <div className="mx-auto max-w-2xl text-center">
              <div data-r>
                <span className="mono block mb-6" style={{ fontSize: "10px", letterSpacing: "0.5em", textTransform: "uppercase", color: "#8B8B3A" }}>08 — Newsletter</span>
                <h2 className="serif font-light mb-6" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#F5E6D3" }}>Únete al lote<br /><span style={{ color: "#6B4423", fontStyle: "italic" }}>de los que saben.</span></h2>
                <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(245,230,211,0.5)", maxWidth: "400px", margin: "0 auto 32px" }}>Nuevos lotes, eventos de cata y historias del valle. Una vez al mes, sin spam.</p>
                <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: "8px", maxWidth: "440px", margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
                  <input type="email" placeholder="tu@correo.com" aria-label="Email" style={{ flex: 1, minWidth: "200px", padding: "14px 20px", background: "rgba(42,31,24,0.8)", border: "1px solid rgba(139,139,58,0.3)", color: "#F5E6D3", fontSize: "14px", outline: "none" }} />
                  <button type="submit" style={{ padding: "14px 32px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2A1F18", background: "#8B8B3A", border: "none", cursor: "pointer", transition: "all 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F5E6D3"} onMouseLeave={(e) => e.currentTarget.style.background = "#8B8B3A"}>Suscribir</button>
                </form>
                <p style={{ fontSize: "10px", color: "rgba(245,230,211,0.2)", marginTop: "16px" }}>Al suscribirte aceptas recibir comunicaciones de Alturas Coffee.</p>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="mt-auto" style={{ background: "#1A1208", borderTop: "1px solid rgba(139,139,58,0.1)", padding: "60px 40px 40px" }}>
            <div className="mx-auto max-w-6xl">
              <div className="grid md:grid-cols-4 gap-12 mb-16">
                <div>
                  <div className="serif italic" style={{ fontSize: "24px", color: "#8B8B3A", marginBottom: "12px" }}>Alturas</div>
                  <p style={{ fontSize: "12px", lineHeight: 1.7, color: "rgba(245,230,211,0.4)" }}>Tostadores de café de especialidad. Valle Central, Chile. Cultivando a 1.200msnm desde 2019.</p>
                </div>
                <div>
                  <h4 className="mono" style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B8B3A", marginBottom: "16px" }}>Productos</h4>
                  {products.slice(0, 4).map((p) => (
                    <a key={p.n} href="#productos" style={{ display: "block", fontSize: "13px", color: "rgba(245,230,211,0.4)", textDecoration: "none", marginBottom: "8px", transition: "color 0.3s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#8B8B3A"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(245,230,211,0.4)"}>{p.n}</a>
                  ))}
                </div>
                <div>
                  <h4 className="mono" style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B8B3A", marginBottom: "16px" }}>Contacto</h4>
                  <p style={{ fontSize: "13px", color: "rgba(245,230,211,0.4)", lineHeight: 1.8 }}>hola@alturas.cafe<br />+56 9 1234 5678<br />Valle Central, Chile</p>
                </div>
                <div>
                  <h4 className="mono" style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B8B3A", marginBottom: "16px" }}>Síguenos</h4>
                  <div className="flex gap-3">
                    {["IG", "FB", "TW", "YT"].map((s) => (
                      <a key={s} href="#" aria-label={s} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(139,139,58,0.2)", color: "rgba(245,230,211,0.4)", fontSize: "11px", fontWeight: 600, textDecoration: "none", transition: "all 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B8B3A"; e.currentTarget.style.color = "#8B8B3A"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,139,58,0.2)"; e.currentTarget.style.color = "rgba(245,230,211,0.4)"; }}>{s}</a>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(139,139,58,0.1)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <p className="mono" style={{ fontSize: "10px", color: "rgba(245,230,211,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>© 2026 Alturas · Café de especialidad · Valle Central, Chile</p>
                <div className="flex gap-6">
                  <a href="#" style={{ fontSize: "10px", color: "rgba(245,230,211,0.2)", textDecoration: "none", letterSpacing: "0.1em" }}>Términos</a>
                  <a href="#" style={{ fontSize: "10px", color: "rgba(245,230,211,0.2)", textDecoration: "none", letterSpacing: "0.1em" }}>Privacidad</a>
                  <a href="#" style={{ fontSize: "10px", color: "rgba(245,230,211,0.2)", textDecoration: "none", letterSpacing: "0.1em" }}>Envíos</a>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}

// CoffeeAroma component
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
      x: Math.random() * width, y: Math.random() * height,
      vy: -(0.2 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 0.15,
      size: 2 + Math.random() * 3, opacity: 0.1 + Math.random() * 0.2,
      flicker: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      time += 0.01;
      for (const p of particles) {
        if (!reducedMotion) {
          p.y += p.vy; p.x += p.vx + Math.sin(time + p.flicker) * 0.2; p.flicker += 0.02;
          if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        }
        const fo = p.opacity * (0.7 + Math.sin(p.flicker * 3) * 0.3);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        g.addColorStop(0, `rgba(139,139,58,${fo})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
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

  return <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }} />;
}

export default function Page() {
  return <CafeLanding />;
}
