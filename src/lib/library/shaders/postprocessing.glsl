// postprocessing.glsl — Efectos cinematográficos en un solo pass
// Fuente: research/advanced-shader-techniques.md §6
//
// Más eficiente que EffectComposer (un solo render pass vs múltiples)
// Uso: aplicar al final del fragment shader principal

// === ACES Tone Mapping (Narkowicz) ===
vec3 acesTonemap(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// === Bloom (single-pass approximation) ===
// Extrae highlights + blur + suma (no es bloom real multi-pass pero visualmente cercano)
vec3 bloom(vec3 color, sampler2D tex, vec2 uv, vec2 resolution, float strength) {
  vec3 highlights = color * smoothstep(0.6, 1.0, dot(color, vec3(0.2126, 0.7152, 0.0722)));

  vec2 texel = 1.0 / resolution;
  vec3 blurred = vec3(0.0);
  float total = 0.0;
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * texel * 2.0;
      float weight = 1.0 / (1.0 + length(offset) * 10.0);
      vec3 sample_col = texture2D(tex, uv + offset).rgb;
      blurred += sample_col * weight;
      total += weight;
    }
  }
  blurred /= total;

  float blurLum = dot(blurred, vec3(0.2126, 0.7152, 0.0722));
  vec3 blurHighlights = blurred * smoothstep(0.5, 1.0, blurLum);

  return color + blurHighlights * strength;
}

// === Chromatic Aberration (radial) ===
vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
  vec2 center = uv - 0.5;
  float dist = length(center);
  vec2 dir = normalize(center + vec2(0.001));

  float r = texture2D(tex, uv + dir * amount * dist).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - dir * amount * dist).b;

  return vec3(r, g, b);
}

// === Film Grain ===
// Requiere snoise de noise.glsl
float filmGrain(vec2 uv, float time, float amount) {
  // Usar función hash si no hay snoise disponible
  float n = fract(sin(dot(uv * 800.0 + time * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
  return (n - 0.5) * amount;
}

// === Vignette ===
float vignette(vec2 uv, float darkness, float offset) {
  vec2 center = uv - 0.5;
  float dist = length(center);
  return 1.0 - smoothstep(offset, offset + 0.5, dist) * darkness;
}

// === Aplicar TODOS los efectos en un solo call ===
vec3 applyCinematicPostFX(
  vec3 color,
  sampler2D tex,
  vec2 uv,
  vec2 resolution,
  float time,
  float bloomStrength,
  float caAmount,
  float grainAmount,
  float vignetteDarkness,
  float vignetteOffset,
  bool useACES
) {
  // 1. Chromatic aberration
  if (caAmount > 0.0) {
    color = chromaticAberration(tex, uv, caAmount);
  }

  // 2. Bloom
  if (bloomStrength > 0.0) {
    color = bloom(color, tex, uv, resolution, bloomStrength);
  }

  // 3. Film grain
  if (grainAmount > 0.0) {
    color += filmGrain(uv, time, grainAmount);
  }

  // 4. Vignette
  if (vignetteDarkness > 0.0) {
    color *= vignette(uv, vignetteDarkness, vignetteOffset);
  }

  // 5. Tone mapping
  if (useACES) {
    color = acesTonemap(color);
  }

  return clamp(color, 0.0, 1.0);
}

// === Presets de look cinematográfico ===
// Usar como valores iniciales para diferentes estilos

// Look "Cinematic Dark" (Cyberpunk / thriller)
// bloomStrength: 0.8, caAmount: 0.0015, grainAmount: 0.03, vignetteDarkness: 0.7, vignetteOffset: 0.15

// Look "Editorial Light" (Vogue / fashion brand)
// bloomStrength: 0.3, caAmount: 0.0005, grainAmount: 0.015, vignetteDarkness: 0.3, vignetteOffset: 0.3

// Look "Tech Sharp" (SaaS premium / dashboard 3D)
// bloomStrength: 0.5, caAmount: 0.0008, grainAmount: 0.008, vignetteDarkness: 0.25, vignetteOffset: 0.35

// Look "Acid Trip" (Active Theory style)
// bloomStrength: 1.2, caAmount: 0.003, grainAmount: 0.04, vignetteDarkness: 0.5, vignetteOffset: 0.1
