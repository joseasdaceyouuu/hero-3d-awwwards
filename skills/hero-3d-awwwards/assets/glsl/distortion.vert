// distortion.vert
// Vertex shader para displacement de geometría (planes, esferas).
// Reutilizable para Arquetipo 3 (Shaders) y Arquetipo 4 (Distortion hover).
//
// Uniforms:
//   uTime        — tiempo transcurrido (segundos)
//   uMouse       — posición normalizada del mouse (-1..1)
//   uIntensity   — multiplicador de distorsión (0 = estático, 1 = máximo)
//   uFrequency   — frecuencia del noise (default 2.0)
//
// Requiere: pegar el contenido de noise.frag antes de este shader.

uniform float uTime;
uniform vec2 uMouse;
uniform float uIntensity;
uniform float uFrequency;

varying vec2 vUv;
varying vec3 vNormal;
varying float vDisplacement;

// --- PEGA AQUÍ EL CONTENIDO DE noise.frag (snoise 3D y fbm) ---
// [snoise y fbm ya están definidos]

void main() {
  vUv = uv;
  vNormal = normal;

  // Posición base
  vec3 pos = position;

  // Distorsión basada en noise 3D
  float noise = snoise(vec3(pos.xy * uFrequency, uTime * 0.3));

  // Influencia del mouse (decae con la distancia al centro)
  float mouseInfluence = 1.0 - length(uv - 0.5) * 1.4;
  mouseInfluence = max(0.0, mouseInfluence);

  // Combinar noise + mouse para desplazamiento
  float displacement = noise * uIntensity;
  displacement += mouseInfluence * uMouse.x * 0.2 * uIntensity;

  // Desplazar a lo largo de la normal
  pos += normal * displacement;

  vDisplacement = displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

// ============================================================
// VARIANTES
// ============================================================

// --- Variante A: Wave displacement (ondas suaves) ---
// Reemplaza el cálculo de displacement con:
/*
float wave = sin(pos.x * 3.0 + uTime * 2.0) * 0.1
           + sin(pos.y * 4.0 + uTime * 1.5) * 0.08;
float displacement = wave * uIntensity;
*/

// --- Variante B: Mouse radial push (efecto "push away") ---
// El mouse empuja la geometría lejos como una onda expansiva.
/*
vec2 mousePos = uMouse * 0.5 + 0.5;  // Convertir a 0..1
float dist = distance(uv, mousePos);
float push = smoothstep(0.4, 0.0, dist) * uIntensity;
float displacement = push * 0.3;
*/

// --- Variante C: fBm orgánico (terreno / lava) ---
/*
float n = fbm(vec3(pos.xy * 1.5, uTime * 0.2), 4);
float displacement = n * uIntensity * 0.5;
*/

// --- Variante D: Hover intensity transition ---
// Conecta uIntensity desde 0 (idle) a 1 (hover) con GSAP:
/*
gsap.to(material.uniforms.uIntensity, {
  value: 1.0,
  duration: 0.6,
  ease: 'power3.out',
  onMouseEnter: ...
})
gsap.to(material.uniforms.uIntensity, {
  value: 0.0,
  duration: 0.8,
  ease: 'power3.inOut',
  onMouseLeave: ...
})
*/

// ============================================================
// FRAGMENT SHADER COMPATIBLE (opcional, para pairing)
// ============================================================
/*
uniform float uTime;
varying vec2 vUv;
varying float vDisplacement;

void main() {
  // Color base
  vec3 colorA = vec3(0.1, 0.1, 0.15);
  vec3 colorB = vec3(0.9, 0.3, 0.5);

  // Mezclar según displacement
  float t = smoothstep(-0.2, 0.3, vDisplacement);
  vec3 color = mix(colorA, colorB, t);

  // Add subtle vignette
  float vignette = 1.0 - length(vUv - 0.5) * 1.2;
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
*/
