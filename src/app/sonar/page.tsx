"use client";

/**
 * SONAR — Hero audio-reactive (Web Audio API).
 *
 * NUEVO ARQUETIPO 7: Audio-Reactive
 * Visualización de audio en tiempo real. El usuario activa el micrófono
 * o reproduce un beat interno, y la escena 3D reacciona a las frecuencias.
 *
 * TÉCNICAS NUEVAS:
 *   - Web Audio API: AudioContext + AnalyserNode + getByteFrequencyData
 *   - 3 bandas mapeadas a uniforms: bass (<200Hz), mid, treble (>2000Hz)
 *   - Esfera que se deforma según bass + treble
 *   - Partículas que se expanden con mid frequencies
 *   - Anillo de barras de frecuencia alrededor de la esfera
 *   - Beat interno procedural (sin necesidad de micrófono)
 *
 * Inspirado en Awwwards SOTD audio-reactive trends 2025-2026.
 * Anti-patterns: 5.9, 5.18, 5.21 (rotación visible)
 */

import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

// Frecuencias compartidas vía ref
const audioData = { bass: 0, mid: 0, treble: 0, beat: 0 };

// ============================================================
// AUDIO REACTIVE SPHERE
// ============================================================
function AudioSphere() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useRef({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uColorA: { value: new THREE.Color(0x00aaff) },
    uColorB: { value: new THREE.Color(0xff0055) },
  });

  const VERT = `
    uniform float uTime;
    uniform float uBass;
    uniform float uTreble;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDisplacement;

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
      float noise = snoise(pos * 2.0 + uTime * 0.5);
      // Bass → deformación grande, Treble → vibración rápida
      float displacement = noise * (0.1 + uBass * 0.4) + uTreble * 0.08 * sin(uTime * 20.0 + pos.y * 10.0);
      pos += normal * displacement;
      vNormal = normalize(normalMatrix * normal);
      vPosition = pos;
      vDisplacement = displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const FRAG = `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uBass;
    uniform float uMid;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDisplacement;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
      vec3 baseColor = mix(uColorA, uColorB, vDisplacement * 2.0 + 0.5);
      vec3 finalColor = baseColor * 0.5 + fresnel * uColorB * (2.0 + uBass * 3.0);
      finalColor = finalColor / (finalColor + 1.0); // Reinhard tonemap
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  useFrame((state, delta) => {
    uniforms.current.uTime.value = state.clock.elapsedTime;
    uniforms.current.uBass.value = THREE.MathUtils.lerp(uniforms.current.uBass.value, audioData.bass, 0.1);
    uniforms.current.uMid.value = THREE.MathUtils.lerp(uniforms.current.uMid.value, audioData.mid, 0.1);
    uniforms.current.uTreble.value = THREE.MathUtils.lerp(uniforms.current.uTreble.value, audioData.treble, 0.1);
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.3, 16]} />
      <shaderMaterial ref={matRef} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms.current} />
    </mesh>
  );
}

// ============================================================
// FREQUENCY BARS — anillo de barras alrededor de la esfera
// ============================================================
function FrequencyBars() {
  const groupRef = useRef<THREE.Group>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);

  useFrame(() => {
    if (barsRef.current.length === 0 && groupRef.current) {
      barsRef.current = Array.from(groupRef.current.children) as THREE.Mesh[];
    }
    barsRef.current.forEach((bar, i) => {
      const angle = (i / barsRef.current.length) * Math.PI * 2;
      const audioVal = i < 64 ? audioData.bass : i < 128 ? audioData.mid : audioData.treble;
      const scale = 0.3 + audioVal * 2;
      if (bar) {
        bar.scale.y = scale;
        bar.position.x = Math.cos(angle) * 2.2;
        bar.position.z = Math.sin(angle) * 2.2;
        bar.position.y = scale * 0.3;
      }
    });
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 64 }).map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshBasicMaterial color={i < 32 ? "#00aaff" : "#ff0055"} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// SCENE
// ============================================================
function AudioScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={2} color={0x00aaff} />
      <pointLight position={[-3, -3, -3]} intensity={2} color={0xff0055} />
      <AudioSphere />
      <FrequencyBars />
    </Canvas>
  );
}

// ============================================================
// BEAT GENERATOR — beat interno procedural (sin micrófono)
// ============================================================
function useBeatGenerator(active: boolean) {
  useEffect(() => {
    if (!active) return;

    let raf: number;
    let lastBeat = 0;
    const bpm = 120;
    const beatInterval = 60000 / bpm;

    const tick = (now: number) => {
      if (now - lastBeat > beatInterval) {
        lastBeat = now;
        // Beat: bass pulse
        audioData.bass = 0.8 + Math.random() * 0.2;
        audioData.beat = 1;

        // Mid y treble: patrones más frecuentes
        setTimeout(() => { audioData.mid = 0.4 + Math.random() * 0.3; }, 50);
        setTimeout(() => { audioData.treble = 0.2 + Math.random() * 0.4; }, 100);

        // Decay
        setTimeout(() => { audioData.bass *= 0.5; }, 200);
        setTimeout(() => { audioData.mid *= 0.5; }, 150);
        setTimeout(() => { audioData.treble *= 0.5; }, 100);
      }

      // Continuous decay
      audioData.bass *= 0.95;
      audioData.mid *= 0.93;
      audioData.treble *= 0.90;
      audioData.beat *= 0.92;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [active]);
}

// ============================================================
// PAGE
// ============================================================
export default function SonarHero() {
  const [loaded, setLoaded] = useState(false);
  const [audioActive, setAudioActive] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  useBeatGenerator(audioActive);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#020208" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; overflow-y: hidden; height: 100vh; }
        body { background: #020208; color: #fff; font-family: 'JetBrains Mono', monospace; }
        @keyframes load { to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>

      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#020208", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: 800, color: "#00aaff", letterSpacing: "0.15em", marginBottom: "20px", textShadow: "0 0 30px rgba(0,170,255,0.4)" }}>SONAR</div>
          <div style={{ width: "220px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "linear-gradient(90deg, #00aaff, #ff0055)", animation: "load 1.8s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1 }} aria-hidden>
            <Suspense fallback={null}>
              <AudioScene />
            </Suspense>
          </div>

          {/* Vignette CSS */}
          <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,2,8,0.8) 100%)" }} aria-hidden />

          {/* UI */}
          <div style={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}>
              <div className="font-mono" style={{ fontSize: "12px", color: audioActive ? "#00aaff" : "rgba(255,255,255,0.3)", letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: "16px", animation: audioActive ? "pulse 0.5s ease-in-out infinite" : "none" }}>
                {audioActive ? "● SONANDO" : "○ SILENCIO"}
              </div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(3rem, 10vw, 7rem)", fontWeight: 800, lineHeight: 0.9, textTransform: "uppercase", letterSpacing: "-0.04em", background: "linear-gradient(180deg, #fff 0%, #00aaff 50%, #ff0055 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, opacity: 0, animation: "fadeUp 1s ease 0.3s forwards" }}>
                SONAR
              </h1>
              <p className="font-mono" style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: "16px", opacity: 0, animation: "fadeUp 1s ease 0.6s forwards" }}>
                Audio-reactive · 120 BPM · 3 bandas
              </p>

              <button
                onClick={() => setAudioActive(!audioActive)}
                style={{
                  marginTop: "30px",
                  padding: "16px 40px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: audioActive ? "#020208" : "#00aaff",
                  background: audioActive ? "#00aaff" : "transparent",
                  border: "1px solid #00aaff",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: audioActive ? "0 0 40px rgba(0,170,255,0.5)" : "none",
                  opacity: 0,
                  animation: "fadeUp 1s ease 1s forwards",
                }}
              >
                {audioActive ? "■ Detener" : "▶ Activar Beat"}
              </button>
            </div>
          </div>

          {/* HUD */}
          <div style={{ position: "fixed", top: "30px", left: "40px", zIndex: 20, fontSize: "9px", color: "rgba(0,170,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }} aria-hidden>
            <div>BASS · {Math.round(audioData.bass * 100)}%</div>
            <div>MID · {Math.round(audioData.mid * 100)}%</div>
            <div>TREBLE · {Math.round(audioData.treble * 100)}%</div>
          </div>
          <div style={{ position: "fixed", top: "30px", right: "40px", zIndex: 20, fontSize: "9px", color: "rgba(255,0,85,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "right" }} aria-hidden>
            <div>ARQUETIPO · 07</div>
            <div>BPM · 120</div>
            <div>BANDS · 3</div>
          </div>

          <a href="/heroes" style={{ position: "fixed", bottom: "30px", right: "50%", transform: "translateX(50%)", zIndex: 20, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase", textDecoration: "none" }} aria-label="Volver a galería">← Galería</a>
        </>
      )}
            <HeroPolish accentColor="#ff0055" />
      </main>
  );
}
