// caustics.glsl — Causticas + god rays submarinos
// Fuente: research/advanced-shader-techniques.md §4
//
// Causticas: patrones de luz que se forman cuando la luz atraviesa agua
// God rays: rayos de luz volumétricos desde una fuente direccional

// Requiere: noise.glsl (snoise, fbm)

// === Causticas analíticas ===
// Interferencia de 2 capas de noise → patrón de causticas
float caustics(vec2 uv, float time, float scale) {
  vec2 p = uv * scale;
  float n1 = fbm(vec3(p + vec2(time * 0.3, time * 0.2), time * 0.1));
  float n2 = fbm(vec3(p * 1.5 - vec2(time * 0.4, time * 0.1), time * 0.15 + 5.0));

  // Interferencia: las causticas son los picos donde ambos noises coinciden
  float pattern = abs(n1 * n2);
  pattern = pow(pattern, 0.5);
  return smoothstep(0.1, 0.5, pattern);
}

// === Causticas con biselado (más definidas) ===
float causticsBeveled(vec2 uv, float time, float scale, float sharpness) {
  float c = caustics(uv, time, scale);
  // Biselar: agudizar los picos, suavizar los valles
  return smoothstep(0.3, 0.7, c) * sharpness + c * (1.0 - sharpness) * 0.5;
}

// === God rays (ray-marching simplificado) ===
// Luz direccional que atraviesa un medio volumétrico
// lightPos: posición normalizada de la luz (0-1)
// samples: número de rayos (8 = buen balance perf/calidad)
float godRays(vec2 uv, vec2 lightPos, float time, int samples) {
  vec2 toLight = uv - lightPos;
  float distToLight = length(toLight);
  vec2 dir = normalize(toLight + vec2(0.001));

  float rays = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= samples) break;
    float t = float(i) / float(samples);
    vec2 samplePos = lightPos + dir * distToLight * t;

    // Noise en cada sample (el medio dispersa la luz)
    float n = fbm(vec3(samplePos * 3.0, time * 0.1));
    rays += (1.0 - t) * smoothstep(-0.2, 0.5, n) * 0.06;
  }

  rays *= exp(-distToLight * 1.5);
  return rays;
}

// === Underwater fog ===
// Niebla azulada que simula profundidad submarina
vec3 underwaterFog(vec3 color, float depth, vec3 fogColor, float fogDensity) {
  float fogFactor = 1.0 - exp(-depth * fogDensity);
  return mix(color, fogColor, fogFactor);
}

// === Water surface distortion ===
// Distorsiona UVs como si estuvieran detrás de una superficie de agua
vec2 waterDistortion(vec2 uv, float time, float strength) {
  float dx = fbm(vec3(uv * 5.0, time * 0.3)) * strength;
  float dy = fbm(vec3(uv * 5.0 + 10.0, time * 0.3)) * strength;
  return uv + vec2(dx, dy);
}
