// liquid_metal.glsl — Metal líquido con environment mapping
// Fuente: research/advanced-shader-techniques.md + user research (Apple/Nike benchmarks)
//
// Simula una superficie de metal líquido (mercurio/cromo) con:
//   - Refracción + reflexión
//   - Distorsión por noise
//   - Specular highlights
//   - Iridiscencia sutil
//
// Performance: mobile-safe (una sola pasada, no requiere environment map real)

// Requiere: noise.glsl (fbm, snoise)
// Requiere: fresnel.glsl (fresnelSimple)

// === Liquid metal surface ===
// Devuelve color del metal líquido en un punto
vec3 liquidMetal(
  vec2 uv,
  float time,
  vec2 mouse,
  float mouseStrength,
  vec3 deepColor,     // color profundo (sombra)
  vec3 midColor,      // color medio (reflejo principal)
  vec3 highlightColor // color highlight (brillo)
) {
  // Distorsión por mouse (ripple)
  float mouseDist = length(uv - mouse);
  float ripple = sin(mouseDist * 20.0 - time * 3.0) * exp(-mouseDist * 3.0) * mouseStrength;

  // 2 capas de noise para superficie orgánica
  float n1 = fbm(vec3(uv * 2.0 + ripple * 0.05 + vec2(time * 0.2, time * 0.1), time * 0.1));
  float n2 = fbm(vec3(uv * 4.0 + vec2(-time * 0.15, time * 0.08), time * 0.15 + 5.0));

  // Combinar
  float surface = n1 * 0.6 + n2 * 0.4;
  surface = surface * 0.5 + 0.5; // [0,1]

  // Reflexión simulada (gradient + noise = environment)
  vec3 color = mix(deepColor, midColor, surface);

  // Specular highlights donde surface tiene picos
  float spec = pow(smoothstep(0.55, 0.85, surface), 3.0);
  color += highlightColor * spec * 0.6;

  // Iridiscencia sutil en los picos
  float irid = sin(surface * 8.0 + time * 0.3) * 0.1;
  color += vec3(irid * 0.3, irid * 0.2, irid * 0.5);

  // Mouse glow (contacto físico)
  color += highlightColor * exp(-mouseDist * 3.0) * mouseStrength * 0.3;

  return color;
}

// === Presets de metal líquido ===
// Chrome/Silver
vec3 liquidChrome(vec2 uv, float time, vec2 mouse, float mouseStrength) {
  return liquidMetal(uv, time, mouse, mouseStrength,
    vec3(0.08, 0.08, 0.12),    // deep
    vec3(0.75, 0.75, 0.80),    // mid (silver)
    vec3(1.0, 1.0, 1.0)        // highlight (white)
  );
}

// Gold/Oro
vec3 liquidGold(vec2 uv, float time, vec2 mouse, float mouseStrength) {
  return liquidMetal(uv, time, mouse, mouseStrength,
    vec3(0.15, 0.08, 0.02),    // deep (dark gold)
    vec3(0.85, 0.65, 0.20),    // mid (gold)
    vec3(1.0, 0.95, 0.70)      // highlight (bright gold)
  );
}

// Mercury/Mercurio
vec3 liquidMercury(vec2 uv, float time, vec2 mouse, float mouseStrength) {
  return liquidMetal(uv, time, mouse, mouseStrength,
    vec3(0.05, 0.05, 0.08),
    vec3(0.65, 0.68, 0.72),
    vec3(0.95, 0.95, 1.0)
  );
}

// Obsidian/Obsidiana
vec3 liquidObsidian(vec2 uv, float time, vec2 mouse, float mouseStrength) {
  return liquidMetal(uv, time, mouse, mouseStrength,
    vec3(0.02, 0.01, 0.03),
    vec3(0.15, 0.10, 0.20),
    vec3(0.50, 0.40, 0.70)
  );
}
