"use client";

/**
 * ARQUÍMEDES — Hero con producto 3D centerpiece (Arquetipo 2: GLB Scene).
 *
 * ÚNICO ARQUETIPO FALTANTE en la skill: producto 3D orbitando con cámara
 * reactiva al mouse. No usa GLB externo (no tenemos uno) — usa una
 * geometría procedural (TorusKnot + esferas orbitales) que simula un
 * "producto" abstracto. Iluminación de 3 puntos + environment.
 *
 * NUEVAS TÉCNICAS (no existentes en la skill):
 *   - Producto 3D con iluminación cinematográfica de 3 puntos
 *   - OrbitControls suave (no invasivo, auto-rotate)
 *   - ContactShadows para grounding realista
 *   - Environment preset para IBL (reflejos)
 *   - Float component (flotación orgánica)
 *   - Stats del producto que orbitan alrededor
 *
 * Patrones aplicados de memoria:
 *   - 1.13 Fresnel (de NEXUS/AURORA)
 *   - 1.15 Drag para rotar + auto-rotación (de NEXUS)
 *   - Layout B: Split izq/der (de BRÚJULA) — producto centro, info izq
 *
 * Anti-patterns: 5.9 (overflow clip), 5.18 (preloader timer), 5.21 (rotación visible)
 */

import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// ============================================================
// PRODUCTO 3D — TorusKnot + esferas orbitales + material distort
// ============================================================
function Product3D() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Producto principal: TorusKnot con material distort */}
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh>
          <torusKnotGeometry args={[0.8, 0.25, 128, 32]} />
          <MeshDistortMaterial
            color="#C9A05E"
            roughness={0.2}
            metalness={0.9}
            distort={0.2}
            speed={1.5}
          />
        </mesh>
      </Float>

      {/* Esferas orbitales (3 a distintas alturas) */}
      <OrbitalSphere radius={1.8} speed={0.5} yOffset={0.5} color="#00ff88" size={0.08} />
      <OrbitalSphere radius={2.0} speed={-0.3} yOffset={-0.3} color="#ff0055" size={0.06} />
      <OrbitalSphere radius={1.6} speed={0.8} yOffset={0.8} color="#aaff00" size={0.05} />
    </group>
  );
}

function OrbitalSphere({ radius, speed, yOffset, color, size }: { radius: number; speed: number; yOffset: number; color: string; size: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * speed + offsetRef.current;
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.position.y = yOffset + Math.sin(t * 2) * 0.1;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
    </mesh>
  );
}

// ============================================================
// SCENE
// ============================================================
function ProductScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      {/* Iluminación de 3 puntos cinematográfica */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" castShadow />
      <pointLight position={[-5, -3, 2]} intensity={1} color="#00ff88" />
      <pointLight position={[3, -2, -5]} intensity={0.8} color="#ff0055" />

      <Product3D />

      {/* ContactShadows para grounding */}
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={8}
        blur={2.5}
        far={4}
      />

      {/* Environment para IBL (reflejos metálicos) */}
      <Environment preset="city" />

      {/* OrbitControls suave — auto-rotate, no invasivo */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
}

// ============================================================
// PAGE — Layout B: info izquierda, producto centro-derecha
// ============================================================
export default function ArquimedesHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#0a0a0f" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body { background: #0a0a0f; color: #fff; font-family: 'JetBrains Mono', monospace; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeRight { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        a:focus-visible { outline: 2px solid #C9A05E; outline-offset: 4px; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#0a0a0f", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: 800, color: "#C9A05E", letterSpacing: "0.15em", marginBottom: "20px" }}>ARQUÍMEDES</div>
          <div style={{ width: "250px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "#C9A05E", animation: "load 2s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <section className="relative w-full h-screen flex" aria-label="ARQUÍMEDES — Producto 3D">
          {/* LADO IZQUIERDO: info (40%) */}
          <div className="flex flex-col justify-center" style={{ width: "40%", padding: "0 60px", zIndex: 10, animation: "fadeRight 1s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}>
            {/* Tag */}
            <div className="font-mono mb-6" style={{ fontSize: "11px", color: "#C9A05E", letterSpacing: "0.3em", textTransform: "uppercase" }}>
              ARQUÍMEDES · COLECCIÓN 2026
            </div>

            {/* Título */}
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>
              Escultura<br />
              <span style={{ color: "#C9A05E" }}>en movimiento</span>
            </h1>

            {/* Descripción */}
            <p className="mt-6 mb-8" style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.6)", maxWidth: "360px" }}>
              Pieza escultórica de bronce pulido con esferas orbitales.
              Cada ángulo revela una nueva perspectiva. Arrastra para rotar.
            </p>

            {/* Specs del producto */}
            <div className="flex gap-8 mb-10">
              {[
                { val: "2.4kg", label: "PESO" },
                { val: "180mm", label: "ALTURA" },
                { val: "100%", label: "BRONCE" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-mono" style={{ fontSize: "22px", fontWeight: 700, color: "#C9A05E", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button style={{ padding: "16px 40px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#0a0a0f", background: "#C9A05E", border: "none", cursor: "pointer", width: "fit-content", transition: "all 0.3s", boxShadow: "0 0 30px rgba(201,160,94,0.3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 50px rgba(201,160,94,0.6)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(201,160,94,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Solicitar Pieza →
            </button>
          </div>

          {/* LADO DERECHO: 3D product (60%) */}
          <div className="relative" style={{ width: "60%", animation: "fadeUp 1.5s cubic-bezier(0.16,1,0.3,1) 0.5s both" }}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="font-mono" style={{ fontSize: "12px", color: "rgba(201,160,94,0.4)", letterSpacing: "0.3em" }}>CARGANDO...</div>
              </div>
            }>
              <ProductScene />
            </Suspense>

            {/* Glow radial detrás del producto */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 50%, rgba(201,160,94,0.08) 0%, transparent 60%)", zIndex: -1 }} />
          </div>

          {/* HUD */}
          <div style={{ position: "fixed", top: "30px", left: "60px", zIndex: 20, fontSize: "9px", color: "rgba(201,160,94,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }} aria-hidden>
            <div>BRONCE · PULIDO</div>
            <div>EDICIÓN · 12/50</div>
          </div>
          <div style={{ position: "fixed", top: "30px", right: "60px", zIndex: 20, fontSize: "9px", color: "rgba(201,160,94,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "right" }} aria-hidden>
            <div>DRAG · ROTAR</div>
            <div>AUTO-ROTATE · ON</div>
          </div>

          {/* Volver */}
          <a href="/heroes" style={{ position: "fixed", bottom: "30px", right: "50%", transform: "translateX(50%)", zIndex: 20, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase", textDecoration: "none" }} aria-label="Volver a galería">← Galería</a>
          <HeroPolish accentColor="#00ff88" />
        </section>
      )}
    </main>
  );
}
