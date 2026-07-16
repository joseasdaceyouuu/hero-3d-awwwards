"use client";

/**
 * Galería de Heroes — Index visual de todos los heroes construidos.
 *
 * Página fácil para ver todos los diseños, compararlos, y navegar a cada uno.
 * Muestra screenshot, score VLM, brief, stack y arquetipo de cada hero.
 */

import { useState, useEffect } from "react";

interface Hero {
  slug: string;
  name: string;
  url: string;
  screenshot: string;
  brief: string;
  stack: string;
  archetype: string;
  vertical: string;
  palette: string[];
  vlmScore: number;
  patterns: string[];
}

const HEROES: Hero[] = [
  {
    slug: "profundidad",
    name: "PROFUNDIDAD",
    url: "/",
    screenshot: "/api/placeholder/profundidad",
    brief:
      "Hero cinematográfico 3D con 4 capas a distintas profundidades Z. Cámara dolly al scroll atravesando las capas. Crossfade por Z, niebla volumétrica, burst orgánico al cruzar partículas.",
    stack: "R3F + Three.js + GLSL",
    archetype: "3D-Scene cinematográfico",
    vertical: "agency",
    palette: ["#080610", "#d4a574", "#1a1525"],
    vlmScore: 0,
    patterns: [
      "Crossfade por Z",
      "Niebla volumétrica intercapa",
      "Burst orgánico al cruzar capa",
      "Coreografía de color 4 fases",
      "Sticky pinned 400vh",
    ],
  },
  {
    slug: "vervain",
    name: "VERVAIN",
    url: "/vervain",
    screenshot: "/api/placeholder/vervain",
    brief:
      "Hero editorial minimalista para estudio de diseño boutique. Paleta oro/negro. Sin WebGL. LetterReveal, ConnectedParticles, GoldenDust, MouseGlow.",
    stack: "Canvas 2D + CSS",
    archetype: "2.5D-Parallax editorial",
    vertical: "agency",
    palette: ["#0A0A0A", "#C9A84C", "#F5F0E8"],
    vlmScore: 7.7,
    patterns: [
      "Letter reveal secuencial",
      "Golden dust al click",
      "Partículas con conexiones",
      "Mouse glow screen",
      "Deco-line gradient",
    ],
  },
  {
    slug: "pixelvoid",
    name: "PIXELVOID",
    url: "/pixelvoid",
    screenshot: "/api/placeholder/pixelvoid",
    brief:
      "Hero anti-ARAGAL cyberpunk dark fantasy gamer. Neón magenta + cyan + lime. WebGL crudo con shader glitch custom: RGB split, scanlines, CRT flicker, glitch blocks.",
    stack: "WebGL crudo (sin Three.js)",
    archetype: "Shaders cyberpunk",
    vertical: "juegos",
    palette: ["#040008", "#FF006E", "#00F5FF", "#C7FF00"],
    vlmScore: 7.3,
    patterns: [
      "Shader glitch custom",
      "RGB split + scanlines",
      "CRT flicker",
      "Shards on click (no partículas)",
      "Clip-path angular CTAs",
    ],
  },
  {
    slug: "merida",
    name: "MÉRIDA",
    url: "/merida",
    screenshot: "/api/placeholder/merida",
    brief:
      "Hero cinematográfico para vino premium chileno. Paleta granate/oro. WineDroplets custom: gotas que caen con gravedad + halo + mouse repel. Scroll choreography.",
    stack: "Canvas 2D + CSS",
    archetype: "3D-Scene adaptado",
    vertical: "vinos",
    palette: ["#0F0507", "#8B1A2B", "#C9A05E"],
    vlmScore: 7.5,
    patterns: [
      "WineDroplets (gotas + halo + repel)",
      "Adaptación LetterReveal Playfair",
      "Scroll choreography sutil",
      "HUD adaptado a vino",
      "Paleta granate/oro",
    ],
  },
  {
    slug: "cafe",
    name: "CAFÉ ALTURAS",
    url: "/cafe",
    screenshot: "/api/placeholder/cafe",
    brief:
      "Hero artesanal para café de especialidad chileno. Paleta tierra cálida (marrón + crema + oliva). CoffeeAroma: partículas ascendentes con ondulación sine + mouse attract.",
    stack: "Canvas 2D + CSS",
    archetype: "2.5D-Parallax artesanal",
    vertical: "café",
    palette: ["#2A1F18", "#6B4423", "#F5E6D3", "#8B8B3A"],
    vlmScore: 7.5,
    patterns: [
      "CoffeeAroma (ascendente + ondulación)",
      "Paleta tierra cálida",
      "Adaptación LetterReveal café",
      "HUD de café (MSNM, ARÁBICA, LOTE)",
      "Sin WebGL (brief restriction)",
    ],
  },
  {
    slug: "brujula",
    name: "BRÚJULA",
    url: "/brujula",
    screenshot: "/api/placeholder/brujula",
    brief:
      "Hero split izquierda/derecha (Layout B). Agencia de viajes de aventura en Patagonia. Paleta azul hielo + blanco. Brújula animada que sigue al mouse + nieve. Tipografía sans-serif bold.",
    stack: "Canvas 2D + CSS",
    archetype: "2.5D-Parallax split",
    vertical: "viajes",
    palette: ["#0B1F2A", "#7BA7BC", "#F5F0E8"],
    vlmScore: 0,
    patterns: [
      "Layout B: Split izq/der 60/40 (no centrado)",
      "Brújula animada sigue mouse",
      "Partículas nieve",
      "HUD bottom strip horizontal (no esquinas)",
      "Stats horizontales (no grid)",
    ],
  },
  {
    slug: "nomada",
    name: "NÓMADA",
    url: "/nomada",
    screenshot: "/api/placeholder/nomada",
    brief:
      "Hero tipográfico full (Layout H + G). Portfolio de arquitecto minimalista. Blanco/negro puro. Solo tipografía + espacio negativo. Sin canvas, sin animaciones complejas.",
    stack: "CSS puro (sin canvas)",
    archetype: "Tipográfico minimalista",
    vertical: "portfolio",
    palette: ["#FAFAF7", "#0A0A0A"],
    vlmScore: 0,
    patterns: [
      "Layout H: tipografía gigante 80%",
      "Layout G: contenido esquina inferior izq",
      "Sin canvas, sin partículas, sin HUD",
      "Solo CSS + tipografía serif",
      "Espacio negativo como protagonista",
    ],
  },
  {
    slug: "cronos",
    name: "CRONOS",
    url: "/cronos",
    screenshot: "/api/placeholder/cronos",
    brief:
      "Hero Layout C (grid 3-col asimétrico) con sistema orbital 3D. Relojes de lujo. 3 órbitas + 10 planetas + esfera central con reloj SVG. Multi-layer parallax con data-speed. Counter animation en stats.",
    stack: "Canvas 2D + CSS + SVG",
    archetype: "3D-Scene orbital",
    vertical: "relojes",
    palette: ["#050a18", "#d4b896", "#1a2540"],
    vlmScore: 0,
    patterns: [
      "Layout C: Grid 3-col asimétrico (1fr 1.2fr 1fr)",
      "Sistema orbital 3D (3 órbitas + 10 planetas + esfera)",
      "Multi-layer parallax data-speed (4 capas)",
      "Counter animation en stats (0→N en 2s)",
      "Esfera central con reloj SVG custom",
      "Parallax 3D con perspective rotateY/X",
    ],
  },
  {
    slug: "nexus",
    name: "NEXUS",
    url: "/nexus",
    screenshot: "/api/placeholder/nexus",
    brief:
      "Hero con núcleo 3D + shader de deformación (simplex noise). IA/biotech. TorusKnot con ShaderMaterial que deforma vértices. 3000 partículas esféricas esmeralda/lime. Drag para rotar + auto-rotación. Telemetría HUD dinámica. Film grain + scan line.",
    stack: "Three.js + ShaderMaterial + WebGL",
    archetype: "Shaders 3D reactivo",
    vertical: "ia",
    palette: ["#000305", "#00ff88", "#aaff00"],
    vlmScore: 8.1,
    patterns: [
      "Núcleo 3D con shader deformación simplex noise",
      "Fresnel en mesh 3D (brillo bordes)",
      "3000 partículas esféricas vertexColors",
      "Drag para rotar + auto-rotación híbrida",
      "Telemetría HUD dinámica (fake data)",
      "Film grain + scan line cinematográfico",
      "Mouse force uniform con decaimiento 0.95",
    ],
  },
  {
    slug: "void-tunnel",
    name: "VOID TUNNEL",
    url: "/void-tunnel",
    screenshot: "/api/placeholder/void-tunnel",
    brief:
      "Hero con túnel 3D infinito (scroll hijacking con Z). 50 capas .ring con translateZ 0 a -4900. Loop infinito: z = ((z+4900)%5000)-4900. Fade out al cruzar cámara. Wheel event controla cameraTargetZ. Paleta esmeralda + magenta. Film grain + scan line.",
    stack: "CSS 3D + JS (sin WebGL)",
    archetype: "Túnel 3D infinito",
    vertical: "gaming",
    palette: ["#02030a", "#00ff88", "#ff0055"],
    vlmScore: 0,
    patterns: [
      "Túnel 3D infinito: 50 capas .ring + scroll hijacking wheel",
      "Loop infinito: z = ((z+4900)%5000)-4900",
      "Fade out al cruzar cámara: opacity = 1-(z+100)/300",
      "Data lines flicker en capas pares",
      "Parallax mouse con perspective-origin",
      "Lerp camera 0.08 para scroll suave",
      "Film grain + scan line cinematográfico",
      "HUD con profundidad dinámica (MTS)",
    ],
  },
  {
    slug: "cinefest",
    name: "CINEFEST",
    url: "/cinefest",
    screenshot: "/api/placeholder/cinefest",
    brief:
      "Hero para festival de cine independiente. Sensación de proyección analógica 16mm. Paleta sepia/ámbar. ProjectorDust (polvo de proyector subiendo). Film grain animado. Flicker analógico. Layout D full-bleed con overlay. Tipografía Cormorant Garamond serif. Sin WebGL.",
    stack: "Canvas 2D + CSS (sin WebGL)",
    archetype: "2.5D-Parallax cinematográfico",
    vertical: "cine",
    palette: ["#1A0F08", "#D4A05E", "#8B6914"],
    vlmScore: 7.7,
    patterns: [
      "ProjectorDust: polvo de proyector con flicker analógico sine",
      "Film grain 16mm: SVG turbulence + steps(2) 0.15s",
      "Flicker de proyector analógico: saltos irregulares 3%/6%/7%/50%",
      "Layout D: 5 capas fondo (radial + dust + grain + scan + vignette)",
      "Paleta sepia/ámbar cine: #D4A05E + #8B6914",
      "LetterReveal adaptado: Cormorant Garamond, stagger 0.10",
      "HUD de cine: REEL 16MM, 24 FPS, PROYECTANDO",
      "Scroll choreography con parallax overlay",
    ],
  },
  {
    slug: "prisma",
    name: "PRISMA",
    url: "/prisma",
    screenshot: "/api/placeholder/prisma",
    brief:
      "Hero MULTI-ESCENA con 3 interacciones radicalmente distintas. Escena 1: partículas que forman texto 'PRISMA' y se dispersan al acercar cursor. Escena 2: elementos magnéticos atraídos al cursor (título, stats, CTA). Escena 3: split-screen oscuro/claro que se divide con el cursor. Navegación con dots + flechas teclado.",
    stack: "Canvas 2D + CSS + JS (sin WebGL)",
    archetype: "Multi-scena interactivo",
    vertical: "agency",
    palette: ["#02030a", "#00f3ff", "#ff0055", "#aaff00"],
    vlmScore: 0,
    patterns: [
      "Text-to-particles: partículas que forman texto y se dispersan con cursor (repel radius 80px)",
      "Efecto magnético real: elementos UI atraídos al cursor con transform translate",
      "Multi-scene hero: 3 escenas con transición fade+scale (0.3s cubic-bezier)",
      "Split-screen interactivo: clipPath polygon que sigue al cursor",
      "Navegación con dots + keyboard (flechas izq/der)",
      "MagneticElement component reutilizable con strength configurable",
      "Particle text generation: canvas temporal + getImageData + sampling",
    ],
  },
  {
    slug: "aurora",
    name: "AURORA",
    url: "/aurora",
    screenshot: "/api/placeholder/aurora",
    brief:
      "Hero con esfera iridiscente shader aurora boreal (fresnel + simplex noise + HDR tonemap). Cursor trail con estela desvaneciente. CSS overlays para vignette + grain. Sin EffectComposer (causa parpadeo).",
    stack: "R3F + GLSL + CSS overlays",
    archetype: "Shaders + bloom emulado",
    vertical: "agency",
    palette: ["#020108", "#00ff88", "#00aaff", "#aa00ff"],
    vlmScore: 7.3,
    patterns: [
      "HDR + Reinhard tonemap en shader: emula bloom sin EffectComposer",
      "Cursor trail: 40 puntos life*=0.92 + radial gradient",
      "Shader aurora: 3 colores + simplex noise + fresnel 2.5",
      "CSS overlays vignette + grain (reemplazo estable post-processing)",
      "CameraParallax + rotación mesh en useFrame",
    ],
  },
  {
    slug: "arquimedes",
    name: "ARQUÍMEDES",
    url: "/arquimedes",
    screenshot: "/api/placeholder/arquimedes",
    brief:
      "Hero con producto 3D centerpiece (Arquetipo 2 GLB). TorusKnot con MeshDistortMaterial + 3 esferas orbitales. Iluminación 3 puntos + Environment city + ContactShadows. OrbitControls auto-rotate. Layout B split izq/der. Paleta bronce/oro.",
    stack: "R3F + drei (OrbitControls, ContactShadows, Environment, Float, MeshDistortMaterial)",
    archetype: "GLB centerpiece (Arquetipo 2)",
    vertical: "escultura",
    palette: ["#0a0a0f", "#C9A05E", "#00ff88"],
    vlmScore: 0,
    patterns: [
      "Producto 3D con MeshDistortMaterial (distort 0.2, speed 1.5)",
      "Iluminación 3 puntos: directional key + 2 point lights coloreadas",
      "ContactShadows para grounding realista (opacity 0.4, blur 2.5)",
      "Environment preset city para IBL (reflejos metálicos)",
      "OrbitControls auto-rotate no invasivo (rotateSpeed 0.5)",
      "Float component para flotación orgánica (speed 2, intensity 0.5)",
      "3 esferas orbitales con velocidades y radios distintos",
      "Layout B: info 40% izq + producto 60% der",
    ],
  },
  {
    slug: "horizonte",
    name: "HORIZONTE",
    url: "/horizonte",
    screenshot: "/api/placeholder/horizonte",
    brief:
      "Hero con SCROLL HORIZONTAL (estructura radicalmente distinta). 4 paneles que se desplazan horizontalmente al hacer scroll vertical. Cada panel tiene paleta + tipografía + interacción distinta: lluvia de partículas, gradient text, líneas SVG, glitch text. Barra de progreso + dots.",
    stack: "CSS + JS (sin WebGL)",
    archetype: "Horizontal scroll multi-panel",
    vertical: "agency",
    palette: ["#020812", "#00aaff", "#ffaa00", "#00ff88", "#ff0055"],
    vlmScore: 0,
    patterns: [
      "Scroll hijacking horizontal: scrollY → translateX (4 paneles)",
      "4 paneles cada uno con paleta + tipografía + interacción distinta",
      "Panel 0: lluvia de partículas (30 lineas con rainDrop animation)",
      "Panel 1: gradient text (background-clip text)",
      "Panel 2: líneas SVG conectando puntos",
      "Panel 3: glitch text (translate + steps animation)",
      "body height = N * 100vh para permitir scroll virtual",
      "Barra de progreso horizontal + dots expandibles",
      "Número grande esquina inferior (opacity 0.08 decorativo)",
    ],
  },
  {
    slug: "reflecta",
    name: "REFLECTA",
    url: "/reflecta",
    screenshot: "/api/placeholder/reflecta",
    brief:
      "Hero con distortion hover (Arquetipo 4, último faltante). Plano 3D con MeshDistortMaterial que reacciona al cursor. Distortion intensity con lerp suave. Shimmer gradient text. Reflejo espejo inferior. Paleta blanco/negro/platino/oro. Estética fotografía editorial.",
    stack: "R3F + drei (MeshDistortMaterial)",
    archetype: "Distortion hover (Arquetipo 4)",
    vertical: "fotografía",
    palette: ["#08080c", "#f0f0f5", "#C9A05E", "#7BA7BC"],
    vlmScore: 0,
    patterns: [
      "MeshDistortMaterial: distortion que sigue al cursor con lerp 0.05",
      "Plane 64x64 subdiv para distortion suave",
      "Shimmer gradient text: linear-gradient + background-size 200% + shimmer 6s",
      "Reflejo espejo: CSS scaleY(-1) + maskImage gradient",
      "Rotación mesh con mouse: rotation.y/x proporcional a mouse",
      "Metalness 0.8 + roughness 0.1 para look metálico",
      "Layout full-bleed con texto overlay centrado",
    ],
  },
  {
    slug: "gravitas",
    name: "GRAVITAS",
    url: "/gravitas",
    screenshot: "/api/placeholder/gravitas",
    brief:
      "Hero con physics simulation (Matter.js, Arquetipo 6 NUEVO). Letras que caen con gravedad, stackean, y reaccionan al cursor como objetos físicos. Mouse constraint para arrastrar. Click = explosión radial. No-determinismo controlado.",
    stack: "Matter.js + Canvas 2D",
    archetype: "Physics simulation (Arquetipo 6)",
    vertical: "agency",
    palette: ["#020205", "#C9A05E", "#7BA7BC", "#ff0055", "#00ff88"],
    vlmScore: 0,
    patterns: [
      "Matter.js physics: gravedad, colisiones, fricción, restitution",
      "Letras como bodies físicos con masa y forma rectangular",
      "MouseConstraint: cursor arrastra letras físicamente",
      "Click → applyForce radial (explosión)",
      "Ground + walls invisibles para que letras stackeen",
      "Cascade drop: letras caen en cascada con delay",
      "Render custom: canvas2D dibuja letras con rotación física",
    ],
  },
  {
    slug: "sonar",
    name: "SONAR",
    url: "/sonar",
    screenshot: "/api/placeholder/sonar",
    brief:
      "Hero audio-reactive (Web Audio API, Arquetipo 7 NUEVO). Beat procedural interno a 120 BPM. 3 bandas (bass/mid/treble) mapeadas a uniforms del shader. Esfera que se deforma con bass + treble. Anillo de 64 barras de frecuencia. Reinhard tonemap.",
    stack: "R3F + GLSL + Web Audio API",
    archetype: "Audio-reactive (Arquetipo 7)",
    vertical: "música",
    palette: ["#020208", "#00aaff", "#ff0055"],
    vlmScore: 0,
    patterns: [
      "Web Audio API: beat procedural interno (120 BPM, sin micrófono)",
      "3 bandas mapeadas a uniforms: bass→displacement, treble→vibración",
      "64 frequency bars en anillo orbital alrededor de esfera",
      "Reinhard tonemap en shader para HDR estable",
      "Beat generator: bass pulse + mid/treble con decay diferenciado",
      "Esfera icosaedro subdiv 16 con simplex noise + audio deformation",
      "Gradient text: linear-gradient(180deg, #fff, #00aaff, #ff0055)",
      "Botón play/stop con glow proporcional a audioData",
    ],
  },
  {
    slug: "synthesia",
    name: "SYNTHESIA",
    url: "/synthesia",
    screenshot: "/api/placeholder/synthesia",
    brief:
      "Hero con glassmorphism + iridiscente + text-on-path. Shader iridiscente 4 colores de fondo reactivo al mouse. Glass card centrada con backdrop-blur + saturate. Texto que fluye a lo largo de path SVG (offset-path). Elementos glass flotantes. Shimmer gradient text.",
    stack: "R3F + GLSL + CSS glassmorphism",
    archetype: "Glassmorphism iridiscente",
    vertical: "agency",
    palette: ["#0a0512", "#a855f7", "#06b6d4"],
    vlmScore: 0,
    patterns: [
      "Glassmorphism: backdrop-filter blur(20px) + saturate(1.5) + border semi-transparente",
      "Shader iridiscente 4 colores (violeta/cyan/magenta/oscuro) reactivo al mouse",
      "Text-on-path: CSS offset-path con path SVG para texto curvo animado",
      "Shimmer gradient text: linear-gradient + background-size 200% + shimmer 4s",
      "Elementos glass flotantes: 4 círculos con float animation + backdrop-blur",
      "Glass CTA: rgba background + backdrop-blur + border + boxShadow hover",
      "inset boxShadow para efecto glass edge (0 1px 0 rgba(255,255,255,0.1))",
    ],
  },
];

export default function HeroesGallery() {
  const [selected, setSelected] = useState<Hero | null>(null);
  const [filterVertical, setFilterVertical] = useState<string>("all");

  const verticals = ["all", ...Array.from(new Set(HEROES.map((h) => h.vertical)))];
  const filtered =
    filterVertical === "all"
      ? HEROES
      : HEROES.filter((h) => h.vertical === filterVertical);

  return (
    <main
      className="min-h-screen"
      style={{ background: "#0a0a0f", color: "#F5F0E8", overflowX: "clip" }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0a0a0f; }
        .font-serif { font-family: 'Cormorant Garamond', serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        a:focus-visible { outline: 2px solid #d4a574; outline-offset: 4px; }
      `}</style>

      {/* Header */}
      <header
        className="px-8 py-12"
        style={{ borderBottom: "1px solid rgba(212,165,116,0.15)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1
                className="font-serif"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  color: "#F5F0E8",
                }}
              >
                Galería de Heroes
              </h1>
              <p
                style={{
                  fontSize: "13px",
                  color: "rgba(245,240,232,0.5)",
                  letterSpacing: "0.1em",
                  marginTop: "8px",
                }}
              >
                {HEROES.length} heroes construidos · Skill hero-3d-awwwards
              </p>
            </div>
            <a
              href="/"
              style={{
                padding: "10px 20px",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#d4a574",
                border: "1px solid rgba(212,165,116,0.3)",
                textDecoration: "none",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#d4a574";
                e.currentTarget.style.background = "rgba(212,165,116,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(212,165,116,0.3)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              ← Inicio
            </a>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mt-8 flex-wrap">
            {verticals.map((v) => (
              <button
                key={v}
                onClick={() => setFilterVertical(v)}
                style={{
                  padding: "6px 14px",
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  background:
                    filterVertical === v
                      ? "#d4a574"
                      : "transparent",
                  color: filterVertical === v ? "#0a0a0f" : "rgba(245,240,232,0.6)",
                  border: "1px solid rgba(212,165,116,0.2)",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                {v === "all" ? "Todos" : v}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Grid de heroes */}
      <section className="px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div
            className="grid gap-8"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            }}
          >
            {filtered.map((hero, i) => (
              <article
                key={hero.slug}
                className="group"
                style={{
                  background: "#11111a",
                  border: "1px solid rgba(212,165,116,0.1)",
                  overflow: "hidden",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  cursor: "pointer",
                  animation: `fadeIn 0.6s ease-out ${i * 0.1}s both`,
                }}
                onClick={() => setSelected(hero)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212,165,116,0.4)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(0,0,0,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212,165,116,0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Preview con paleta */}
                <div
                  style={{
                    height: "180px",
                    background: `linear-gradient(135deg, ${hero.palette.join(
                      ", "
                    )})`,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <h2
                    className="font-serif"
                    style={{
                      fontSize: "32px",
                      fontWeight: 500,
                      color: "#F5F0E8",
                      letterSpacing: "0.08em",
                      textShadow: "0 4px 20px rgba(0,0,0,0.5)",
                      margin: 0,
                    }}
                  >
                    {hero.name}
                  </h2>
                  {/* VLM score badge */}
                  {hero.vlmScore > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        padding: "4px 10px",
                        background: "rgba(0,0,0,0.6)",
                        color: "#d4a574",
                        fontSize: "10px",
                        letterSpacing: "0.1em",
                        fontWeight: 600,
                        border: "1px solid rgba(212,165,116,0.3)",
                      }}
                    >
                      VLM {hero.vlmScore}/10
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-6">
                  <div
                    className="flex items-center gap-3 mb-3"
                    style={{ fontSize: "10px", letterSpacing: "0.15em" }}
                  >
                    <span
                      style={{
                        color: "#d4a574",
                        textTransform: "uppercase",
                      }}
                    >
                      {hero.vertical}
                    </span>
                    <span style={{ color: "rgba(245,240,232,0.3)" }}>·</span>
                    <span
                      style={{
                        color: "rgba(245,240,232,0.5)",
                        textTransform: "uppercase",
                      }}
                    >
                      {hero.archetype}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      lineHeight: 1.6,
                      color: "rgba(245,240,232,0.7)",
                      marginBottom: "16px",
                    }}
                  >
                    {hero.brief.length > 140
                      ? hero.brief.slice(0, 140) + "..."
                      : hero.brief}
                  </p>

                  {/* Stack */}
                  <div
                    style={{
                      fontSize: "10px",
                      color: "rgba(245,240,232,0.4)",
                      letterSpacing: "0.1em",
                      marginBottom: "16px",
                      textTransform: "uppercase",
                    }}
                  >
                    {hero.stack}
                  </div>

                  {/* Paleta */}
                  <div className="flex gap-1.5 mb-4">
                    {hero.palette.map((c) => (
                      <div
                        key={c}
                        style={{
                          width: "20px",
                          height: "20px",
                          background: c,
                          border: "1px solid rgba(245,240,232,0.1)",
                        }}
                        title={c}
                      />
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex gap-2">
                    <a
                      href={hero.url}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        padding: "10px",
                        fontSize: "10px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "#d4a574",
                        border: "1px solid rgba(212,165,116,0.3)",
                        textDecoration: "none",
                        textAlign: "center",
                        transition: "all 0.3s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#d4a574";
                        e.currentTarget.style.color = "#0a0a0f";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#d4a574";
                      }}
                    >
                      Ver Hero →
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(hero);
                      }}
                      style={{
                        padding: "10px 14px",
                        fontSize: "10px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(245,240,232,0.6)",
                        border: "1px solid rgba(245,240,232,0.15)",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      Detalles
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Modal de detalles */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            style={{
              background: "#11111a",
              border: "1px solid rgba(212,165,116,0.3)",
              padding: "40px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: "32px",
                    fontWeight: 500,
                    color: "#F5F0E8",
                    margin: 0,
                  }}
                >
                  {selected.name}
                </h2>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#d4a574",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    marginTop: "6px",
                  }}
                >
                  {selected.vertical} · {selected.archetype}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(245,240,232,0.5)",
                  fontSize: "24px",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.7,
                color: "rgba(245,240,232,0.8)",
                marginBottom: "24px",
              }}
            >
              {selected.brief}
            </p>

            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "11px",
                  color: "#d4a574",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Stack
              </h3>
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(245,240,232,0.7)",
                }}
              >
                {selected.stack}
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "11px",
                  color: "#d4a574",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Patrones aplicados
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {selected.patterns.map((p, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "13px",
                      color: "rgba(245,240,232,0.7)",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(245,240,232,0.05)",
                    }}
                  >
                    <span style={{ color: "#d4a574", marginRight: "8px" }}>•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "11px",
                  color: "#d4a574",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Paleta
              </h3>
              <div className="flex gap-3 flex-wrap">
                {selected.palette.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        background: c,
                        border: "1px solid rgba(245,240,232,0.15)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        color: "rgba(245,240,232,0.6)",
                        fontFamily: "monospace",
                      }}
                    >
                      {c}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selected.vlmScore > 0 && (
              <div
                style={{
                  padding: "16px",
                  background: "rgba(212,165,116,0.05)",
                  border: "1px solid rgba(212,165,116,0.2)",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#d4a574",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  VLM Audit Score
                </div>
                <div
                  className="font-serif"
                  style={{
                    fontSize: "32px",
                    color: "#F5F0E8",
                    fontWeight: 500,
                  }}
                >
                  {selected.vlmScore}
                  <span
                    style={{
                      fontSize: "16px",
                      color: "rgba(245,240,232,0.4)",
                    }}
                  >
                    /10
                  </span>
                </div>
              </div>
            )}

            <a
              href={selected.url}
              style={{
                display: "block",
                padding: "14px",
                fontSize: "11px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#0a0a0f",
                background: "#d4a574",
                textDecoration: "none",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              Abrir Hero →
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="px-8 py-12 text-center"
        style={{ borderTop: "1px solid rgba(212,165,116,0.1)" }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "rgba(245,240,232,0.3)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Skill hero-3d-awwwards · {HEROES.length} heroes ·{" "}
          {HEROES.filter((h) => h.vlmScore > 0).length} auditados con VLM
        </p>
      </footer>
    </main>
  );
}
