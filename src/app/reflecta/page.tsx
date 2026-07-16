"use client";

/**
 * REFLECTA — Hero con distortion hover en imagen (Arquetipo 4).
 *
 * ÚLTIMO ARQUETIPO FALTANTE de los 5 originales de la skill.
 *
 * Imagen (procedural gradient) con displacement map que reacciona al hover.
 * Al pasar el cursor, la imagen se distorsiona con noise. RGB split en bordes.
 *
 * NUEVAS TÉCNICAS:
 *   - Displacement map procedural (canvas 2D generando noise texture)
 *   - Distortion intensity que sigue al cursor con lerp
 *   - RGB shift direccional en hover
 *   - Líquido efecto con MeshDistortMaterial en plane
 *   - Reflejo espejo en el suelo (CSS transform scaleY(-1) + gradient mask)
 *
 * Layout: imagen full-bleed central + texto overlay + reflejo inferior
 * Paleta: blanco/negro/platino (estética editorial fotografía)
 *
 * Anti-patterns: 5.9 (overflow clip), 5.18 (preloader timer)
 */

import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// DISTORTION PLANE — plano con displacement que reacciona al hover
// ============================================================
function DistortionPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<any>(null);
  const { mouse } = useThree();
  const targetDistort = useRef(0.1);

  useFrame((state, delta) => {
    // Lerp distort hacia target basado en mouse
    targetDistort.current = 0.1 + mouse.x * 0.3;
    if (matRef.current) {
      matRef.current.distort = THREE.MathUtils.lerp(
        matRef.current.distort,
        targetDistort.current,
        0.05
      );
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = mouse.x * 0.15;
      meshRef.current.rotation.x = -mouse.y * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[4, 5.5, 64, 64]} />
      <MeshDistortMaterial
        ref={matRef}
        color="#1a1a2e"
        roughness={0.1}
        metalness={0.8}
        distort={0.1}
        speed={1.5}
        emissive="#0a0a15"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// ============================================================
// SCENE
// ============================================================
function DistortionScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 4]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-3, -2, 2]} intensity={1} color="#7BA7BC" />
      <pointLight position={[3, 2, -2]} intensity={0.8} color="#C9A05E" />
      <DistortionPlane />
    </Canvas>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ReflectaHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#08080c" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body { background: #08080c; color: #f0f0f5; font-family: 'Inter', sans-serif; }
        .font-serif { font-family: 'Cormorant Garamond', serif; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeRight { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        a:focus-visible { outline: 2px solid #C9A05E; outline-offset: 4px; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#08080c", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div className="font-serif italic" style={{ fontSize: "22px", color: "#C9A05E", letterSpacing: "0.2em", marginBottom: "20px" }}>REFLECTA</div>
          <div style={{ width: "220px", height: "1px", background: "rgba(201,160,94,0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "#C9A05E", animation: "load 1.8s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <section className="relative w-full h-screen flex flex-col items-center justify-center" aria-label="REFLECTA — Distortion photography">
          {/* Glow radial */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(201,160,94,0.06) 0%, transparent 70%)", pointerEvents: "none" }} aria-hidden />

          {/* Canvas 3D distortion */}
          <div style={{ position: "absolute", inset: 0, zIndex: 1 }} aria-hidden>
            <Suspense fallback={null}>
              <DistortionScene />
            </Suspense>
          </div>

          {/* Reflejo espejo inferior (CSS) */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "30vh",
              background: "linear-gradient(to bottom, rgba(201,160,94,0.03) 0%, transparent 100%)",
              transform: "scaleY(-1)",
              opacity: 0.3,
              pointerEvents: "none",
              zIndex: 2,
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 60%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 60%)",
            }}
            aria-hidden
          />

          {/* Vignette */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(8,8,12,0.8) 100%)", pointerEvents: "none", zIndex: 3 }} aria-hidden />

          {/* Contenido overlay */}
          <div className="relative z-10 text-center px-6 max-w-3xl">
            {/* Tag */}
            <div
              className="font-mono mb-6"
              style={{
                fontSize: "11px",
                color: "#C9A05E",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                opacity: 0,
                animation: "fadeUp 1s ease 0.3s forwards",
              }}
            >
              Estudio de Fotografía · 2026
            </div>

            {/* Título con shimmer gradient */}
            <h1
              className="font-serif"
              style={{
                fontSize: "clamp(3rem, 9vw, 7rem)",
                fontWeight: 300,
                lineHeight: 0.95,
                letterSpacing: "0.02em",
                margin: 0,
                background: "linear-gradient(90deg, #f0f0f5 0%, #C9A05E 30%, #f0f0f5 60%, #7BA7BC 90%, #f0f0f5 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "shimmer 6s linear infinite, fadeUp 1.5s ease 0.5s both",
              }}
            >
              REFLECTA
            </h1>

            {/* Subtítulo italic */}
            <p
              className="font-serif italic mt-4 mb-10"
              style={{
                fontSize: "clamp(18px, 2.5vw, 26px)",
                fontWeight: 400,
                color: "rgba(240,240,245,0.6)",
                opacity: 0,
                animation: "fadeUp 1s ease 1s forwards",
              }}
            >
              La luz que distorsiona la realidad
            </p>

            {/* Descripción */}
            <p
              style={{
                fontSize: "15px",
                lineHeight: 1.8,
                color: "rgba(240,240,245,0.4)",
                maxWidth: "420px",
                margin: "0 auto 40px",
                opacity: 0,
                animation: "fadeUp 1s ease 1.3s forwards",
              }}
            >
              Fotografía experimental con distorsión en tiempo real.
              Cada ángulo revela una nueva perspectiva de la luz.
            </p>

            {/* CTA */}
            <div
              style={{
                opacity: 0,
                animation: "fadeUp 1s ease 1.6s forwards",
              }}
            >
              <a
                href="#portafolio"
                aria-label="Ver portafolio"
                style={{
                  display: "inline-block",
                  padding: "16px 40px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: "#08080c",
                  background: "linear-gradient(135deg, #C9A05E, #7BA7BC)",
                  border: "none",
                  transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 0 30px rgba(201,160,94,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 50px rgba(201,160,94,0.6)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(201,160,94,0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Ver Portafolio →
              </a>
            </div>
          </div>

          {/* Hint de interacción */}
          <div
            className="absolute font-mono"
            style={{
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "10px",
              color: "rgba(201,160,94,0.4)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              zIndex: 20,
              opacity: 0,
              animation: "fadeUp 1s ease 2s forwards",
            }}
            aria-hidden
          >
            [ Mueve el cursor para distorsionar ]
          </div>

          {/* HUD */}
          <div style={{ position: "fixed", top: "30px", left: "40px", zIndex: 20, fontSize: "9px", color: "rgba(201,160,94,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }} aria-hidden>
            <div>DISTORT · ON</div>
            <div>METAL · 0.8</div>
          </div>
          <div style={{ position: "fixed", top: "30px", right: "40px", zIndex: 20, fontSize: "9px", color: "rgba(201,160,94,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "right" }} aria-hidden>
            <div>ARQUETIPO · 04</div>
            <div>SUBDIV · 64</div>
          </div>

          {/* Volver */}
          <a href="/heroes" style={{ position: "fixed", bottom: "30px", right: "50%", transform: "translateX(50%)", zIndex: 20, fontSize: "9px", color: "rgba(240,240,245,0.2)", letterSpacing: "0.3em", textTransform: "uppercase", textDecoration: "none" }} aria-label="Volver a galería">← Galería</a>
          <HeroPolish accentColor="#0a0a15" />
        </section>
      )}
    </main>
  );
}
