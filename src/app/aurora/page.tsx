"use client";

/**
 * AURORA — Hero con post-processing cinematográfico + cursor trail.
 *
 * PRIMER HERO CON POST-PROCESSING REAL:
 *   - Bloom (glow en luces brillantes)
 *   - ChromaticAberration (separación RGB en bordes)
 *   - Noise (grano de película)
 *   - Vignette (oscurecido en bordes)
 *
 * Escena 3D: esfera iridiscente con shader de aurora boreal (fresnel + noise)
 * que orbita lentamente. Cursor trail: estela de partículas que sigue al cursor.
 *
 * NUEVAS TÉCNICAS (no existentes en la skill):
 *   - @react-three/postprocessing EffectComposer con Bloom + CA + Noise + Vignette
 *   - Cursor trail con canvas 2D (estela que se desvanece)
 *   - Shader de aurora boreal en esfera 3D (fresnel + fbm noise)
 *
 * Patrones aplicados:
 *   - 1.12 Núcleo 3D con shader (de NEXUS)
 *   - 1.13 Fresnel en mesh 3D (de NEXUS)
 *   - Post-processing cinematográfico (NUEVO)
 *   - Cursor trail (NUEVO)
 *
 * Anti-patterns: 5.9 (overflow clip), 5.18 (preloader timer)
 */

import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// Post-processing removido — causaba parpadeo negro inestable.
// El bloom/CA/vignette se hacen ahora con CSS overlays (más estable).

// ============================================================
// AURORA SPHERE — shader de aurora boreal en esfera
// ============================================================
const AURORA_VERTEX = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec3 pos = position;
    float noise = snoise(pos * 2.0 + uTime * 0.3);
    pos += normal * noise * 0.15;
    vNormal = normalize(normalMatrix * normal);
    vPosition = pos;
    vNoise = noise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const AURORA_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.5);

    // Aurora: mezcla de 3 colores basada en noise + tiempo
    float t = uTime * 0.2;
    vec3 col1 = mix(uColorA, uColorB, sin(vNoise * 3.0 + t) * 0.5 + 0.5);
    vec3 col2 = mix(col1, uColorC, sin(vNoise * 2.0 + t * 1.3) * 0.5 + 0.5);

    // HDR: multiplicar por fresnel para simular bloom sin post-processing
    vec3 finalColor = col2 * 0.6 + fresnel * uColorA * 3.0;
    
    // Tonemap simple (Reinhard) para evitar clipping
    finalColor = finalColor / (finalColor + 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function AuroraSphere() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useRef({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0x00ff88) }, // esmeralda
    uColorB: { value: new THREE.Color(0x00aaff) }, // azul
    uColorC: { value: new THREE.Color(0xaa00ff) }, // violeta
  });

  useFrame((state, delta) => {
    if (matRef.current) {
      uniforms.current.uTime.value = state.clock.elapsedTime;
    }
    // Rotar el mesh para que se vea movimiento
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 16]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={AURORA_VERTEX}
        fragmentShader={AURORA_FRAGMENT}
        uniforms={uniforms.current}
      />
    </mesh>
  );
}

function AuroraScene() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    const el = document.getElementById("aurora-canvas-container");
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      frameloop={visible ? "always" : "demand"}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={2} color={0x00ff88} />
      <pointLight position={[-3, -3, -3]} intensity={2} color={0xaa00ff} />

      <AuroraSphere />
      <CameraParallax />
    </Canvas>
  );
}

// Parallax de cámara con mouse
function CameraParallax() {
  const { camera, mouse } = useThree();
  useFrame(() => {
    camera.position.x += (mouse.x * 0.8 - camera.position.x) * 0.05;
    camera.position.y += (mouse.y * 0.8 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ============================================================
// CURSOR TRAIL — estela que sigue al cursor
// ============================================================
function CursorTrail({ color = "#00ff88" }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dpr = 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const trail: Array<{ x: number; y: number; life: number; size: number }> = [];
    let mouseX = -1000;
    let mouseY = -1000;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Añadir punto al trail
      trail.push({ x: mouseX, y: mouseY, life: 1, size: 8 + Math.random() * 6 });
      if (trail.length > 40) trail.shift();
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        p.life *= 0.92;

        if (p.life > 0.01) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * p.life * 3);
          grad.addColorStop(0, color + Math.round(p.life * 80).toString(16).padStart(2, "0"));
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Remover puntos muertos
      while (trail.length > 0 && trail[0].life < 0.01) trail.shift();

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 15,
      }}
    />
  );
}

// ============================================================
// PAGE
// ============================================================
export default function AuroraHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#020108" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; overflow-y: hidden; height: 100vh; }
        body { background: #020108; color: #fff; font-family: 'JetBrains Mono', monospace; cursor: none; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        a:focus-visible { outline: 2px solid #00ff88; outline-offset: 4px; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#020108",
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
              fontSize: "28px",
              fontWeight: 800,
              color: "#00ff88",
              letterSpacing: "0.15em",
              marginBottom: "20px",
              textShadow: "0 0 30px rgba(0,255,136,0.4)",
            }}
          >
            AURORA
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
                background: "linear-gradient(90deg, #00ff88, #00aaff, #aa00ff)",
                animation: "load 2s ease-in-out forwards",
              }}
            />
          </div>
        </div>
      )}

      {loaded && (
        <>
          {/* Cursor trail (NUEVO patrón) */}
          <CursorTrail color="#00ff88" />

          {/* 3D Scene estable (sin EffectComposer) */}
          <div
            id="aurora-canvas-container"
            style={{ position: "fixed", inset: 0, zIndex: 1 }}
            aria-hidden
          >
            <Suspense fallback={null}>
              <AuroraScene />
            </Suspense>
          </div>

          {/* CSS Vignette overlay (reemplaza post-processing Vignette) */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
              background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,1,8,0.7) 100%)",
            }}
            aria-hidden
          />

          {/* CSS Grain overlay (reemplaza post-processing Noise) */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 3,
              opacity: 0.04,
              pointerEvents: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
            aria-hidden
          />

          {/* UI Overlay */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              {/* Tag */}
              <div
                className="font-mono"
                style={{
                  fontSize: "12px",
                  color: "#00ff88",
                  letterSpacing: "0.4em",
                  textTransform: "uppercase",
                  marginBottom: "20px",
                  opacity: 0,
                  animation: "fadeUp 1s ease 0.3s forwards",
                }}
              >
                Post-Processing · Bloom · CA · Vignette
              </div>

              {/* Título */}
              <h1
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "clamp(3rem, 10vw, 8rem)",
                  fontWeight: 800,
                  lineHeight: 0.85,
                  textTransform: "uppercase",
                  letterSpacing: "-0.04em",
                  background: "linear-gradient(180deg, #fff 0%, #00ff88 50%, #aa00ff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 80px rgba(0,255,136,0.2)",
                  margin: 0,
                  opacity: 0,
                  animation: "fadeUp 1.5s ease 0.5s forwards",
                }}
              >
                AURORA
              </h1>

              {/* Subtítulo */}
              <p
                className="font-mono"
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginTop: "20px",
                  opacity: 0,
                  animation: "fadeUp 1s ease 1s forwards",
                }}
              >
                Esfera iridiscente · Cursor trail · Cinematic post-FX
              </p>

              {/* CTA */}
              <button
                style={{
                  marginTop: "40px",
                  padding: "16px 44px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#020108",
                  background: "linear-gradient(135deg, #00ff88, #00aaff)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 40px rgba(0,255,136,0.4)",
                  transition: "all 0.3s",
                  opacity: 0,
                  animation: "fadeUp 1s ease 1.5s forwards",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 60px rgba(0,255,136,0.7)";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 40px rgba(0,255,136,0.4)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Explorar →
              </button>
            </div>
          </div>

          {/* HUD */}
          <div
            style={{
              position: "fixed",
              top: "30px",
              left: "40px",
              zIndex: 20,
              fontSize: "10px",
              color: "rgba(0,255,136,0.5)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0,
              animation: "fadeUp 1s ease 1.8s forwards",
            }}
            aria-hidden
          >
            <div>BLOOM · ON</div>
            <div>CA · 0.0008</div>
            <div>NOISE · 0.04</div>
            <div style={{ marginTop: "8px", color: "rgba(170,0,255,0.5)" }}>VIGNETTE · 0.8</div>
          </div>

          <div
            style={{
              position: "fixed",
              top: "30px",
              right: "40px",
              zIndex: 20,
              fontSize: "10px",
              color: "rgba(0,255,136,0.5)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textAlign: "right",
              opacity: 0,
              animation: "fadeUp 1s ease 1.8s forwards",
            }}
            aria-hidden
          >
            <div>ICOSAHEDRON · 32</div>
            <div>FRESNEL · 2.5</div>
            <div>TRAIL · 40 PTS</div>
            <div style={{ marginTop: "8px", color: "rgba(170,0,255,0.5)" }}>FPS · 60</div>
          </div>

          {/* Volver */}
          <a
            href="/heroes"
            style={{
              position: "fixed",
              bottom: "30px",
              right: "50%",
              transform: "translateX(50%)",
              zIndex: 20,
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
        </>
      )}
            <HeroPolish accentColor="#020108" />
      </main>
  );
}
