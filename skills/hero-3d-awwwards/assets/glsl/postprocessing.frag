// postprocessing.frag
// Effectos de post-processing para look cinematográfico Awwwards.
// Combina: bloom + chromatic aberration + grain + vignette + tone mapping.
//
// USA ESTO como fragment shader de un fullscreen quad POST del render principal,
// o como EffectComposer custom. Para R3F, preferir @react-three/postprocessing
// (que ya implementa estos efectos individualmente). Este shader es para
// vanilla Three.js o para casos donde quieras un solo pase en vez de multi-pass.

uniform sampler2D tDiffuse;       // Render target de la escena principal
uniform vec2 uResolution;
uniform float uTime;
uniform float uBloomStrength;     // 0.0 = off, 1.0 = fuerte (default 0.6)
uniform float uChromaticAmount;   // 0.0 = off, 0.005 = máximo (default 0.001)
uniform float uGrainAmount;       // 0.0 = off, 0.05 = máximo (default 0.02)
uniform float uVignetteDarkness;  // 0.0 = off, 1.0 = total (default 0.5)
uniform float uVignetteOffset;    // 0.0 - 1.0 (default 0.2)
uniform float uExposure;          // 1.0 = normal (default 1.1)

varying vec2 vUv;

// --- PEGA AQUÍ EL CONTENIDO DE noise.frag ---

// ============================================================
// ACES FILMIC TONE MAPPING
// ============================================================
vec3 ACESFilmic(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// ============================================================
// BLOOM (single-pass approximation)
// ============================================================
// No es un bloom real multi-pass, sino una aproximación: extrae highlights,
// las blurea ligeramente, las suma de vuelta.
vec3 bloom(sampler2D tex, vec2 uv, float strength) {
  vec3 base = texture2D(tex, uv).rgb;

  // Extraer highlights
  float luminance = dot(base, vec3(0.2126, 0.7152, 0.0722));
  vec3 highlights = base * smoothstep(0.6, 1.0, luminance);

  // Box blur aproximado (9 samples)
  vec2 texel = 1.0 / uResolution;
  vec3 blurred = vec3(0.0);
  float total = 0.0;
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * texel * 2.0;
      float weight = 1.0 / (1.0 + length(offset) * 10.0);
      blurred += texture2D(tex, uv + offset).rgb * weight;
      total += weight;
    }
  }
  blurred /= total;

  // Re-extract highlights from blurred
  float blurLum = dot(blurred, vec3(0.2126, 0.7152, 0.0722));
  vec3 blurHighlights = blurred * smoothstep(0.5, 1.0, blurLum);

  return base + blurHighlights * strength;
}

// ============================================================
// CHROMATIC ABERRATION (radial)
// ============================================================
vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
  vec2 center = vec2(0.5);
  vec2 dir = uv - center;
  float dist = length(dir);

  // Sample R, G, B con offsets distintos
  float r = texture2D(tex, uv + dir * amount * dist).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - dir * amount * dist).b;

  return vec3(r, g, b);
}

// ============================================================
// FILM GRAIN
// ============================================================
float filmGrain(vec2 uv, float time, float amount) {
  float n = snoise(vec2(uv * 800.0, time * 50.0));
  return n * amount;
}

// ============================================================
// VIGNETTE
// ============================================================
float vignette(vec2 uv, float darkness, float offset) {
  vec2 center = uv - 0.5;
  float dist = length(center);
  return smoothstep(0.5, offset, dist) * darkness;
}

// ============================================================
// MAIN
// ============================================================
void main() {
  vec2 uv = vUv;

  // 1. Bloom
  vec3 color = bloom(tDiffuse, uv, uBloomStrength);

  // 2. Chromatic aberration
  color = chromaticAberration(tDiffuse, uv, uChromaticAmount);

  // 3. Tone mapping (ACES)
  color *= uExposure;
  color = ACESFilmic(color);

  // 4. Film grain
  float grain = filmGrain(uv, uTime, uGrainAmount);
  color += grain;

  // 5. Vignette
  float vig = 1.0 - vignette(uv, uVignetteDarkness, uVignetteOffset);
  color *= vig;

  gl_FragColor = vec4(color, 1.0);
}

// ============================================================
// DEFAULTS RECOMENDADOS POR LOOK
// ============================================================

// --- Look "Cinematic Dark" (Cyberpunk / thriller) ---
/*
uBloomStrength: 0.8
uChromaticAmount: 0.0015
uGrainAmount: 0.03
uVignetteDarkness: 0.7
uVignetteOffset: 0.15
uExposure: 1.0
*/

// --- Look "Editorial Light" (Vogue / fashion brand) ---
/*
uBloomStrength: 0.3
uChromaticAmount: 0.0005
uGrainAmount: 0.015
uVignetteDarkness: 0.3
uVignetteOffset: 0.3
uExposure: 1.15
*/

// --- Look "Tech Sharp" (SaaS premium / dashboard 3D) ---
/*
uBloomStrength: 0.5
uChromaticAmount: 0.0008
uGrainAmount: 0.008
uVignetteDarkness: 0.25
uVignetteOffset: 0.35
uExposure: 1.05
*/

// --- Look "Acid Trip" (Active Theory style) ---
/*
uBloomStrength: 1.2
uChromaticAmount: 0.003
uGrainAmount: 0.04
uVignetteDarkness: 0.5
uVignetteOffset: 0.1
uExposure: 1.1
*/

// ============================================================
// SETUP EN THREE.JS VANILLA
// ============================================================
/*
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const cinematicPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime: { value: 0 },
    uBloomStrength: { value: 0.6 },
    uChromaticAmount: { value: 0.001 },
    uGrainAmount: { value: 0.02 },
    uVignetteDarkness: { value: 0.5 },
    uVignetteOffset: { value: 0.2 },
    uExposure: { value: 1.1 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: postprocessingFrag,
})
composer.addPass(cinematicPass)

// En el render loop:
function animate() {
  cinematicPass.uniforms.uTime.value = clock.getElapsedTime()
  composer.render()
  requestAnimationFrame(animate)
}
*/

// ============================================================
// NOTA IMPORTANTE
// ============================================================
// Para R3F, NO uses este shader. Usa @react-three/postprocessing con los
// componentes individuales (Bloom, ChromaticAberration, Noise, Vignette).
// Es más performante y componible. Este shader es para vanilla Three.js o
// cuando necesitas un solo fullscreen pass.
