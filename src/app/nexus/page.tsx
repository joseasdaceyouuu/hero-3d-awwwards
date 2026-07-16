"use client";

/**
 * NEXUS — Hero con núcleo 3D + shader de deformación (simplex noise).
 *
 * Inspirado en AETHER Quantum Core pero NO es copia:
 *   - Vertical: IA / biotech (no quantum core)
 *   - Paleta: esmeralda + lime + blanco sobre negro (no cyan/magenta)
 *   - Geometría: TorusKnot en vez de Icosahedron (forma distinta)
 *   - 3000 partículas (no 5000) para mejor perf
 *   - Sin wireframe overlay (más limpio)
 *
 * Patrones aplicados (extraídos de aether-quantum-core.html):
 *   - 1.12 Núcleo 3D con shader de deformación (simplex noise)
 *   - 1.13 Fresnel en mesh 3D (brillo de bordes)
 *   - 1.14 Partículas esféricas con vertexColors
 *   - 1.15 Drag para rotar + auto-rotación híbrida
 *   - 1.16 Telemetría HUD dinámica
 *   - 1.18 Film grain + scan line (estética cinematográfica)
 *
 * Anti-patterns aplicados:
 *   - 5.9: overflow-x: clip
 *   - 5.15: WebGL crudo con precision + attributes (aunque acá usamos Three.js via importmap)
 *   - 5.18: Preloader con timer
 */

import { useState, useEffect, useRef } from "react";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

export default function NexusHero() {
  const [loaded, setLoaded] = useState(false);

  // Preloader timer (anti-pattern 5.18)
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 2200);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#000305" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; }
        body {
          background: #000305;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          overflow: hidden;
          height: 100vh;
          cursor: crosshair;
        }
        @keyframes grain {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-5px, 5px); }
          100% { transform: translate(5px, -5px); }
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
        }
        @keyframes load { to { width: 100%; } }
        @keyframes scrollDot {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
          50% { transform: translateX(-50%) translateY(12px); opacity: 0.3; }
        }
        a:focus-visible { outline: 2px solid #00ff88; outline-offset: 4px; }
      `}</style>

      {/* Preloader */}
      {!loaded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000305",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.3em",
              color: "#00ff88",
              marginBottom: "20px",
              textTransform: "uppercase",
            }}
          >
            Iniciando núcleo neuronal...
          </div>
          <div
            style={{
              width: "300px",
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
                background: "#00ff88",
                animation: "load 2s ease-in-out forwards",
              }}
            />
          </div>
        </div>
      )}

      {/* WebGL Canvas (mount solo cuando loaded) */}
      {loaded && <NexusCanvas />}

      {/* UI Overlay */}
      {loaded && (
        <>
          {/* Corner markers */}
          {[
            { pos: "top:20px;left:20px;border-right:0;border-bottom:0;" },
            { pos: "top:20px;right:20px;border-left:0;border-bottom:0;" },
            { pos: "bottom:20px;left:20px;border-right:0;border-top:0;" },
            { pos: "bottom:20px;right:20px;border-left:0;border-top:0;" },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: "fixed",
                width: "20px",
                height: "20px",
                border: "2px solid #00ff88",
                zIndex: 20,
                ...c.pos
                  .split(";")
                  .reduce((acc, s) => {
                    const [k, v] = s.split(":");
                    if (k && v) acc[k.trim()] = v.trim();
                    return acc;
                  }, {} as Record<string, string>),
              }}
              aria-hidden
            />
          ))}

          {/* Top HUD */}
          <header
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "40px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "15px 20px",
                background: "rgba(0,3,5,0.3)",
                backdropFilter: "blur(10px)",
                pointerEvents: "auto",
              }}
            >
              <h3 style={{ color: "#00ff88", marginBottom: "5px", fontWeight: 700, fontSize: "13px" }}>
                NEXUS AI v3.2
              </h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                NODO: 0x7A3F8B2E // CONEXIÓN SEGURA
              </p>
            </div>
            <div style={{ display: "flex", gap: "30px", pointerEvents: "auto" }}>
              <TelemetryItem label="Neuronas" id="neu-val" suffix="B" min={2.1} max={2.4} />
              <TelemetryItem label="Sinapsis" id="syn-val" suffix="T" min={480} max={520} color="#aaff00" />
              <TelemetryItem label="Coherencia" id="coh-val" suffix="%" min={97.5} max={99.8} color="#ff0055" warning />
            </div>
          </header>

          {/* Center content */}
          <main
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "600px",
                height: "600px",
                border: "1px solid rgba(0,255,136,0.1)",
                borderRadius: "50%",
                zIndex: -1,
                animation: "pulse-ring 4s infinite",
              }}
              aria-hidden
            />
            <div
              style={{
                fontSize: "14px",
                color: "#00ff88",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              Protocolo de sincronización iniciado
            </div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(2rem, 6vw, 5rem)",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
                textShadow: "0 0 20px rgba(0,0,0,0.8)",
                margin: 0,
              }}
            >
              Red<br />Viva
            </h1>
                  <HeroPolish accentColor="#000305" />
      </main>

          {/* Bottom controls */}
          <footer
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              padding: "40px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.8,
                pointerEvents: "auto",
                fontWeight: 500,
              }}
            >
              [ <span style={{ color: "#00ff88", fontWeight: 700 }}>CLIC Y ARRASTRAR</span> ] PARA ROTAR NÚCLEO
              <br />
              [ <span style={{ color: "#00ff88", fontWeight: 700 }}>MOVER RATÓN</span> ] PARA DEFORMAR CAMPO NEURONAL
            </div>
            <button
              style={{
                background: "rgba(0,255,136,0.1)",
                border: "1px solid #00ff88",
                color: "#00ff88",
                padding: "20px 40px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s",
                pointerEvents: "auto",
                boxShadow: "0 0 30px rgba(0,255,136,0.3), inset 0 0 20px rgba(0,255,136,0.1)",
                backdropFilter: "blur(5px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#000305";
                e.currentTarget.style.boxShadow = "0 0 50px rgba(0,255,136,0.6), inset 0 0 30px rgba(0,255,136,0.2)";
                e.currentTarget.style.transform = "scale(1.05)";
                const fill = e.currentTarget.querySelector("span.fill-bar");
                if (fill) (fill as HTMLElement).style.left = "0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#00ff88";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(0,255,136,0.3), inset 0 0 20px rgba(0,255,136,0.1)";
                e.currentTarget.style.transform = "scale(1)";
                const fill = e.currentTarget.querySelector("span.fill-bar");
                if (fill) (fill as HTMLElement).style.left = "-100%";
              }}
            >
              <span
                className="fill-bar"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  width: "100%",
                  height: "100%",
                  background: "#00ff88",
                  transition: "left 0.3s cubic-bezier(0.16,1,0.3,1)",
                  zIndex: -1,
                }}
              />
              Iniciar Sincronización
            </button>
          </footer>

          {/* Scroll indicator visible (fix VLM bug) */}
          <div
            style={{
              position: "fixed",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 11,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: "#00ff88",
                fontWeight: 700,
                textShadow: "0 0 10px rgba(0,255,136,0.5)",
              }}
            >
              ↓ Explorar ↓
            </span>
            <div
              style={{
                width: "28px",
                height: "44px",
                border: "2px solid rgba(0,255,136,0.6)",
                borderRadius: "14px",
                position: "relative",
                boxShadow: "0 0 15px rgba(0,255,136,0.3), inset 0 0 10px rgba(0,255,136,0.1)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "4px",
                  height: "12px",
                  background: "#00ff88",
                  borderRadius: "2px",
                  boxShadow: "0 0 10px #00ff88",
                  animation: "scrollDot 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Glow radial de fondo ampliado (fix VLM: reducir zonas negras muertas) */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              background:
                "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(0,255,136,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(170,255,0,0.04) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
            aria-hidden
          />

          {/* Film grain */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 101,
              opacity: 0.05,
              pointerEvents: "none",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              animation: "grain 0.2s steps(2) infinite",
            }}
            aria-hidden
          />

          {/* Scan line */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "2px",
              background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)",
              zIndex: 103,
              animation: "scan 4s linear infinite",
              pointerEvents: "none",
            }}
            aria-hidden
          />

          {/* Volver */}
          <a
            href="/heroes"
            style={{
              position: "fixed",
              bottom: "20px",
              right: "50%",
              transform: "translateX(50%)",
              zIndex: 102,
              fontSize: "10px",
              color: "rgba(255,255,255,0.3)",
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
    </main>
  );
}

// ============================================================
// TELEMETRY ITEM — fake data que cambia
// ============================================================
function TelemetryItem({
  label,
  id,
  suffix,
  min,
  max,
  color = "#ffffff",
  warning = false,
}: {
  label: string;
  id: string;
  suffix: string;
  min: number;
  max: number;
  color?: string;
  warning?: boolean;
}) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const update = () => {
      const val = min + Math.random() * (max - min);
      el.textContent = val.toFixed(val < 10 ? 2 : 1) + suffix;
    };
    update();
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, [id, min, max, suffix]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span
        style={{
          fontSize: "10px",
          color: "rgba(255,255,255,0.4)",
          marginBottom: "5px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        id={id}
        style={{
          fontSize: "19px",
          fontWeight: 700,
          color: warning ? "#ff0055" : color,
        }}
      >
        --
      </span>
    </div>
  );
}

// ============================================================
// NEXUS CANVAS — Three.js con núcleo 3D + shader + partículas
// ============================================================
function NexusCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cargar Three.js via script tag con importmap
    const script = document.createElement("script");
    script.type = "importmap";
    script.textContent = JSON.stringify({
      imports: {
        three: "https://unpkg.com/three@0.160.0/build/three.module.js",
      },
    });
    document.head.appendChild(script);

    const moduleScript = document.createElement("script");
    moduleScript.type = "module";
    moduleScript.textContent = `
      import * as THREE from 'three';

      const container = document.getElementById('nexus-canvas-container');
      if (!container) throw new Error('No container');

      const canvas = document.createElement('canvas');
      canvas.id = 'nexus-webgl';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '1';
      container.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 5;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Simplex noise GLSL
      const simplexNoise = \`
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
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
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
      \`;

      // Núcleo: TorusKnot (NO Icosahedron como AETHER)
      const coreMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMouseForce: { value: 0 },
          uColorA: { value: new THREE.Color(0x00ff88) }, // esmeralda
          uColorB: { value: new THREE.Color(0xaaff00) }  // lime
        },
        vertexShader: \`
          uniform float uTime;
          uniform float uMouseForce;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying float vNoise;
          \${simplexNoise}
          void main() {
            vec3 pos = position;
            float noise = snoise(pos * 1.5 + uTime * 0.5);
            float displacement = noise * (0.15 + uMouseForce * 0.4);
            pos += normal * displacement;
            vNormal = normalize(normalMatrix * normal);
            vPosition = pos;
            vNoise = noise;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        \`,
        fragmentShader: \`
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying float vNoise;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vPosition);
            float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
            vec3 baseColor = mix(uColorB, uColorA, vNoise * 0.5 + 0.5);
            vec3 finalColor = baseColor + fresnel * uColorA * 1.5;
            gl_FragColor = vec4(finalColor, 1.0);
          }
        \`
      });

      const coreGeometry = new THREE.TorusKnotGeometry(1.0, 0.3, 128, 32);
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      scene.add(core);

      // Partículas esféricas (3000, no 5000)
      const particleCount = 3000;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const radius = 2 + Math.random() * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = radius * Math.cos(phi);
        const mix = Math.random();
        colors[i*3] = mix > 0.5 ? 0.0 : 0.67;
        colors[i*3+1] = mix > 0.5 ? 1.0 : 1.0;
        colors[i*3+2] = mix > 0.5 ? 0.53 : 0.0;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.015,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      // Luces
      scene.add(new THREE.AmbientLight(0xffffff, 0.2));
      const light1 = new THREE.PointLight(0x00ff88, 2, 10);
      light1.position.set(2, 2, 2);
      scene.add(light1);
      const light2 = new THREE.PointLight(0xaaff00, 2, 10);
      light2.position.set(-2, -2, -2);
      scene.add(light2);

      // Interacción
      const mouse = new THREE.Vector2();
      let mouseForce = 0;
      let targetRotX = 0, targetRotY = 0;
      let currentRotX = 0, currentRotY = 0;
      let isDragging = false;
      let lastMouseX = 0, lastMouseY = 0;

      window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        mouseForce = Math.min(1, mouseForce + 0.05);
        if (isDragging) {
          targetRotY += (e.clientX - lastMouseX) * 0.005;
          targetRotX += (e.clientY - lastMouseY) * 0.005;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });
      canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
      });
      window.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
      });

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      const clock = new THREE.Clock();
      function animate() {
        const elapsedTime = clock.getElapsedTime();
        coreMaterial.uniforms.uTime.value = elapsedTime;
        mouseForce *= 0.95;
        coreMaterial.uniforms.uMouseForce.value = mouseForce;
        currentRotX += (targetRotX - currentRotX) * 0.05;
        currentRotY += (targetRotY - currentRotY) * 0.05;
        if (!isDragging) targetRotY += 0.002;
        core.rotation.x = currentRotX;
        core.rotation.y = currentRotY;
        particles.rotation.y = elapsedTime * 0.05;
        particles.rotation.x = elapsedTime * 0.02;
        camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (mouse.y * 0.5 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }
      animate();
    `;
    containerRef.current.appendChild(moduleScript);

    return () => {
      document.head.removeChild(script);
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  return <div id="nexus-canvas-container" ref={containerRef} style={{ position: "fixed", inset: 0, zIndex: 1 }} aria-hidden />;
}
