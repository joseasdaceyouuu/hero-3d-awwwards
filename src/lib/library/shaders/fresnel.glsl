// fresnel.glsl — Fresnel + thin-film iridiscencia
// Efecto: cristal, pompa de jabón, metal pulido
// Fuente: research/advanced-shader-techniques.md §1
//
// Uso:
//   float f = fresnel(viewDir, normal, 1.5);  // 1.5 = índice de refracción
//   vec3 irid = thinFilmIridescence(f, thickness, noise);

// === Fresnel básico (Schlick approximation) ===
float fresnel(vec3 viewDir, vec3 normal, float ior) {
  float cosTheta = abs(dot(viewDir, normal));
  float f0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
  return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
}

// === Fresnel sin IOR (versión simple para shaders 2D) ===
float fresnelSimple(float dotNV, float power) {
  return pow(1.0 - abs(dotNV), power);
}

// === Thin-film interference (iridiscencia) ===
// Simula láminas delgadas como pompa de jabón o aceite sobre agua
// thickness: 0.0-1.0 (grosor de la lámina)
// Returns: color RGB iridiscente
vec3 thinFilmIridescence(float thickness, float noise) {
  // Wavelengths del espectro visible (nm → normalizado)
  // La interferencia constructiva/destructiva crea colores
  float t = thickness * 3.0 + noise * 2.0;

  // 5 colores del espectro iridiscente
  vec3 violet   = vec3(0.55, 0.35, 0.85);
  vec3 blue     = vec3(0.38, 0.52, 0.78);
  vec3 cyan     = vec3(0.30, 0.75, 0.90);
  vec3 magenta  = vec3(0.85, 0.40, 0.70);
  vec3 gold     = vec3(0.90, 0.70, 0.40);

  float phase = sin(t) * 0.5 + 0.5;
  float phase2 = sin(t * 1.3 + 1.0) * 0.5 + 0.5;
  float phase3 = sin(t * 0.7 + 2.0) * 0.5 + 0.5;
  float phase4 = sin(t * 1.7 + 3.0) * 0.5 + 0.5;

  vec3 col = mix(violet, blue, phase);
  col = mix(col, cyan, phase2);
  col = mix(col, magenta, phase3);
  col = mix(col, gold, phase4 * 0.5); // gold más sutil

  return col;
}

// === Refracción simple (chromatic aberration) ===
// Simula cómo la luz se separa al atravesar cristal
vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount, vec2 dir) {
  float r = texture2D(tex, uv + dir * amount).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - dir * amount).b;
  return vec3(r, g, b);
}
