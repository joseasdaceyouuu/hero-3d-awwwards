// godrays_volumetric.glsl — God rays volumétricos reales
// Fuente: research/advanced-shader-techniques.md §4 + user research
//
// Ray-marching en medio participante (volumetric scattering).
// Más realista que god rays aproximados pero más costoso.
// Desktop 60fps @ 32 samples. Mobile: usar 8-16 samples o fallback.

// Requiere: noise.glsl (fbm)

// === Volumetric god rays via ray-marching ===
// lightPos: posición normalizada de la luz (0-1)
// samples: número de rayos (calidad vs performance)
// density: densidad del medio participante
// decay: atenuación por distancia
float volumetricGodRays(
  vec2 uv,
  vec2 lightPos,
  float time,
  int samples,
  float density,
  float decay
) {
  vec2 toLight = uv - lightPos;
  float distToLight = length(toLight);
  vec2 dir = normalize(toLight + vec2(0.001));

  float illumination = 0.0;
  float t = 0.0;

  for (int i = 0; i < 64; i++) {
    if (i >= samples) break;
    float ti = float(i) / float(samples);
    vec2 samplePos = lightPos + dir * distToLight * ti;

    // Densidad del medio (niebla/atmósfera) via noise
    float mediumDensity = fbm(vec3(samplePos * 4.0, time * 0.1)) * 0.5 + 0.5;
    mediumDensity *= density;

    // Atenuación por distancia + decay
    float attenuation = (1.0 - ti) * exp(-distToLight * decay);

    // Acumular iluminación
    illumination += mediumDensity * attenuation * (1.0 / float(samples));
  }

  return illumination * 3.0; // Boost para visibilidad
}

// === God rays con color (luz de amanecer/atardecer) ===
vec3 volumetricGodRaysColored(
  vec2 uv,
  vec2 lightPos,
  float time,
  int samples,
  vec3 lightColor,
  vec3 fogColor,
  float density
) {
  float rays = volumetricGodRays(uv, lightPos, time, samples, density, 1.5);
  return mix(fogColor, lightColor, rays);
}

// === Volumetric fog (niebla que ocupa espacio 3D) ===
// depth: profundidad del pixel (0-1)
float volumetricFog(float depth, float density, float time, vec2 uv) {
  float baseFog = exp(-depth * density);
  // Variación con noise para niebla orgánica
  float noiseFog = fbm(vec3(uv * 3.0, time * 0.05)) * 0.3 + 0.7;
  return baseFog * noiseFog;
}

// === Light shafts (rayos de luz a través de ventales/hojas) ===
// Simula luz que pasa a través de una rendija
float lightShafts(vec2 uv, vec2 opening, float width, float time) {
  // Distancia a la rendija
  float dist = abs(uv.x - opening.x);
  // Suavizar bordes de la rendija
  float shaft = smoothstep(width, 0.0, dist);
  // Atenuación con distancia vertical
  shaft *= smoothstep(1.0, opening.y, uv.y);
  // Variación temporal (polvo flotando)
  shaft *= 0.8 + 0.2 * sin(time * 0.5 + uv.y * 10.0);
  return shaft;
}
