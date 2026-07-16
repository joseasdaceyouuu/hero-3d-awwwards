// aurora.glsl — Aurora boreal procedural
// Fuente: NORTHERN LIGHTS hero + research/advanced-shader-techniques.md
//
// Simula aurora boreal con:
//   - Múltiples cortinas de luz a distintas altitudes
//   - Colores naturales (verde, magenta, cyan)
//   - Movimiento orgánico (viento solar simulado)
//   - Estrellas con twinkle
//   - Reflejo en agua

// Requiere: noise.glsl (fbm, snoise)

// === Cortina de aurora ===
// uv: coordenadas
// time: tiempo
// altitude: altitud de la cortina (0-1, 0=abajo, 1=arriba)
// speed: velocidad de movimiento
// freq: frecuencia horizontal
float auroraCurtain(vec2 uv, float time, float altitude, float speed, float freq) {
  // Movimiento horizontal (viento solar)
  float x = uv.x * freq + time * speed;
  // Noise horizontal — crea las "rayas" verticales
  float n = fbm(vec3(x * 1.5, time * 0.3, altitude));
  n = n * 0.5 + 0.5;

  // Curva gaussiana vertical — la aurora es más intensa en 'altitude'
  float dist = abs(uv.y - altitude);
  float intensity = exp(-dist * dist * 12.0);

  return n * intensity;
}

// === Aurora completa (3 cortinas) ===
vec3 aurora(vec2 uv, float time, vec2 mouse, float mouseStrength) {
  // Mouse desplaza cortinas (viento solar)
  float wind = mouse.x * 0.3 * mouseStrength;

  // 3 cortinas a distintas altitudes con colores naturales
  float c1 = auroraCurtain(uv + vec2(wind, 0.0), time, 0.75, 0.5, 3.0);
  float c2 = auroraCurtain(uv + vec2(wind * 1.5, 0.0), time * 1.3, 0.65, 0.8, 4.0);
  float c3 = auroraCurtain(uv + vec2(wind * 2.0, 0.0), time * 1.6, 0.55, 1.2, 5.0);

  // Colores naturales de aurora
  vec3 green = vec3(0.0, 1.0, 0.6);
  vec3 magenta = vec3(1.0, 0.2, 0.8);
  vec3 cyan = vec3(0.2, 0.9, 1.0);

  vec3 color = vec3(0.0);
  color += green * c1 * 1.5;
  color += magenta * c2 * 1.2;
  color += cyan * c3 * 1.0;

  return color;
}

// === Estrellas con twinkle ===
float stars(vec2 uv, float time, float density) {
  vec2 grid = floor(uv * density);
  float star = sin(grid.x * 12.9898 + grid.y * 78.233) * 43758.5453;
  star = fract(star);
  float isStar = step(0.985, star);
  float twinkle = sin(time * 3.0 + star * 100.0) * 0.5 + 0.5;
  vec2 cellUv = fract(uv * density) - 0.5;
  float dist = length(cellUv);
  float starShape = smoothstep(0.08, 0.0, dist);
  return isStar * starShape * twinkle;
}

// === Reflejo en agua ===
vec3 auroraWithReflection(vec2 uv, float time, vec2 mouse, float mouseStrength) {
  vec3 color = vec3(0.01, 0.02, 0.06); // deep night sky

  // Estrellas (solo mitad superior)
  if (uv.y > 0.5) {
    float starIntensity = stars(uv * vec2(1.78, 1.0), time, 150.0);
    color += vec3(1.0) * starIntensity * 1.5;
  }

  // Aurora (mitad superior)
  vec3 auroraColor = aurora(uv, time, mouse, mouseStrength);
  color += auroraColor;

  // Reflejo (mitad inferior)
  if (uv.y < 0.5) {
    vec2 reflectedUv = vec2(uv.x, 1.0 - uv.y);
    // Distorsión del agua
    float waterNoise = fbm(vec3(uv.x * 8.0, time * 0.5, 0.0)) * 0.02;
    reflectedUv.x += waterNoise;

    vec3 reflectedAurora = aurora(reflectedUv, time, mouse, mouseStrength);
    float reflectionMask = smoothstep(0.0, 0.5, uv.y);
    color += reflectedAurora * 0.4 * reflectionMask;
    // Tinte azul del agua
    color = mix(color, vec3(0.02, 0.05, 0.12), 0.3 * (1.0 - reflectionMask));
  }

  // Horizonte
  float horizon = smoothstep(0.49, 0.51, uv.y) - smoothstep(0.51, 0.53, uv.y);
  color += vec3(0.1, 0.15, 0.2) * horizon;

  return color;
}
