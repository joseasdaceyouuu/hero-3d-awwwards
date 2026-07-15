// fluid.frag
// Simulación de fluidos con ping-pong rendering entre dos framebuffers.
// Crea el look de "humo líquido" seen en muchos SOTDs (ej: Active Theory).
//
// REQUIERE: dos WebGLRenderTargets (read + write) intercambiados cada frame.
// Ver código de ejemplo al final para setup completo en R3F y vanilla.
//
// Inspirado en: PavelDoGreat's "WebGL Fluid Simulation" (MIT).
// Optimizado para heroes 2D sin gravedad compleja.

// ============================================================
// FRAGMENT SHADER PRINCIPAL: advección + difusión + mouse force
// ============================================================

uniform sampler2D uFluidTex;      // Textura del estado anterior
uniform vec2 uResolution;          // Resolución del simulation target (ej: 256x256)
uniform vec2 uMouse;               // Mouse en coords normalizadas (0..1)
uniform vec2 uMouseDelta;          // Delta del mouse desde el frame anterior
uniform float uMouseStrength;      // Fuerza aplicada por el mouse (default 1.0)
uniform float uFluidDecay;         // Qué tan rápido se disipa (0.985 default)
uniform float uTrailLength;        // Largo del trail (0.97 default)
uniform float uTime;

varying vec2 vUv;

// --- PEGA AQUÍ EL CONTENIDO DE noise.frag ---

vec3 dec(vec3 r) { return (r - 0.5) * 0.8; }
vec3 enc(vec3 s) { return s / 0.8 + 0.5; }

void main() {
  vec2 tx = 1.0 / uResolution;
  vec3 p = dec(texture2D(uFluidTex, vUv).rgb);
  vec2 vel = p.rg;
  float ink = p.b;

  // Advección: mueve el fluido según su propia velocidad
  vec3 adv = dec(texture2D(uFluidTex, vUv - vel * tx * 1.2).rgb);
  vel = mix(vel, adv.rg, 0.45);
  ink = mix(ink, adv.b, 0.45);

  // Diffusion simple (suavizado de vecinos)
  vec3 L = dec(texture2D(uFluidTex, vUv - vec2(tx.x, 0.0)).rgb);
  vec3 R = dec(texture2D(uFluidTex, vUv + vec2(tx.x, 0.0)).rgb);
  vec3 U = dec(texture2D(uFluidTex, vUv - vec2(0.0, tx.y)).rgb);
  vec3 D = dec(texture2D(uFluidTex, vUv + vec2(0.0, tx.y)).rgb);
  vel = mix(vel, (L.rg + R.rg + U.rg + D.rg) * 0.25, 0.28);
  ink = mix(ink, (L.b + R.b + U.b + D.b) * 0.25, 0.28);

  // Mouse force: aplica "pincelazo" donde está el mouse
  float mouseDist = distance(vUv, uMouse);
  float mouseInfluence = exp(-mouseDist * mouseDist * 200.0) * uMouseStrength;
  vel += uMouseDelta * mouseInfluence * 3.0;
  ink += mouseInfluence * 0.5;

  // Decay
  vel *= uFluidDecay;
  ink *= uTrailLength;

  gl_FragColor = vec4(enc(vec3(clamp(vel, -0.4, 0.4), clamp(ink, -0.4, 0.4))), 1.0);
}

// ============================================================
// DISPLAY SHADER: renderiza el fluid al canvas final
// ============================================================
// Este es un shader separado que se ejecuta en el plane del hero.
// Lee el fluid texture y aplica color + efecto visual.
/*
uniform sampler2D uFluid;
uniform vec2 uResolution;
uniform float uTime;
varying vec2 vUv;

// --- snoise incluido ---

void main() {
  vec3 fluid = texture2D(uFluid, vUv).rgb;
  vec2 vel = (fluid.rg - 0.5) * 0.8;
  float ink = (fluid.b - 0.5) * 0.8;

  // Triple sample para streamlines
  vec3 c;
  for (float i = 0.0; i < 3.0; i++) {
    vec2 offset = vel * (0.02 + i * 0.005);
    c[i] = (texture2D(uFluid, vUv + offset).b - 0.5) * 0.8 + i * 0.05;
  }

  // Paleta cinematográfica (navy → magenta → cyan)
  vec3 colorA = vec3(0.02, 0.03, 0.08);
  vec3 colorB = vec3(0.9, 0.1, 0.3);
  vec3 colorC = vec3(0.1, 0.6, 0.9);
  vec3 color = mix(colorA, colorB, smoothstep(0.0, 0.5, c.x));
  color = mix(color, colorC, smoothstep(0.3, 0.8, c.y));

  // Boost contrast
  color = pow(color, vec3(0.85));

  // Grain
  float grain = (snoise(vec2(vUv * 800.0, uTime * 50.0))) * 0.02;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
*/

// ============================================================
// SETUP EN R3F (ping-pong rendering)
// ============================================================
/*
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function FluidSimulation() {
  const { viewport } = useThree()
  const readTarget = useRef<THREE.WebGLRenderTarget>(null!)
  const writeTarget = useRef<THREE.WebGLRenderTarget>(null!)
  const mouse = useRef(new THREE.Vector2(0.5, 0.5))
  const lastMouse = useRef(new THREE.Vector2(0.5, 0.5))
  const mouseDelta = useRef(new THREE.Vector2(0, 0))

  const simRes = 256
  const simScene = useMemo(() => new THREE.Scene(), [])
  const simCamera = useMemo(() =>
    new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

  const simMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: fluidFrag,
    uniforms: {
      uFluidTex: { value: null },
      uResolution: { value: new THREE.Vector2(simRes, simRes) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseDelta: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 1.0 },
      uFluidDecay: { value: 0.985 },
      uTrailLength: { value: 0.97 },
      uTime: { value: 0 },
    },
  }), [])

  const displayMaterial = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state) => {
    const { gl } = state

    // Update mouse delta
    mouseDelta.current.copy(mouse.current).sub(lastMouse.current)
    lastMouse.current.copy(mouse.current)

    // Sim pass
    simMaterial.uniforms.uFluidTex.value = readTarget.current.texture
    simMaterial.uniforms.uMouse.value = mouse.current
    simMaterial.uniforms.uMouseDelta.value = mouseDelta.current
    simMaterial.uniforms.uTime.value = state.clock.elapsedTime

    const simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial)
    simScene.add(simMesh)

    gl.setRenderTarget(writeTarget.current)
    gl.render(simScene, simCamera)
    gl.setRenderTarget(null)

    simScene.remove(simMesh)
    simMesh.geometry.dispose()

    // Swap
    const tmp = readTarget.current
    readTarget.current = writeTarget.current
    writeTarget.current = tmp

    // Update display
    if (displayMaterial.current) {
      displayMaterial.current.uniforms.uFluid.value = readTarget.current.texture
      displayMaterial.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  // Init targets
  if (!readTarget.current) {
    readTarget.current = new THREE.WebGLRenderTarget(simRes, simRes, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    })
    writeTarget.current = readTarget.current.clone()
  }

  // Mouse listener
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.current.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height, 1, 1]} />
      <shaderMaterial
        ref={displayMaterial}
        vertexShader={displayVert}
        fragmentShader={displayFrag}
        uniforms={{
          uFluid: { value: null },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uTime: { value: 0 },
        }}
      />
    </mesh>
  )
}
*/

// ============================================================
// PERFORMANCE TIPS
// ============================================================
// - simRes 256 es suficiente para heroes. 512 duplica GPU sin ganancia visual.
// - HalfFloatType obligatorio — sin él, el fluid pierde energía rápido.
// - En mobile, baja simRes a 128.
// - Pause cuando el mouse no se mueva por >2s (ahorra GPU).
