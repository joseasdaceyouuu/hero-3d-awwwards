// particles.glsl — Sistema de partículas GPGPU con curl noise
// Fuente: research/advanced-shader-techniques.md §5
//
// GPGPU: las partículas se actualizan en la GPU (no en CPU).
// Permite 100K+ partículas a 60fps.
//
// Requiere: noise.glsl (curlNoise)
// Requiere: ping-pong rendering entre 2 RenderTargets

// ============================================================
// POSITION UPDATE SHADER (se ejecuta por cada partícula)
// ============================================================
// Lee la posición anterior + velocidad → calcula nueva posición
//
// uniform sampler2D uPositions;  // textura con posiciones actuales
// uniform sampler2D uVelocities; // textura con velocidades actuales
// uniform float uDt;
// uniform float uTime;
// uniform vec3 uMouse;
// uniform float uMouseStrength;

vec3 updateParticlePosition(vec3 currentPos, vec3 velocity, float dt) {
  return currentPos + velocity * dt;
}

// ============================================================
// VELOCITY UPDATE SHADER (se ejecuta por cada partícula)
// ============================================================
// Lee velocidad anterior → aplica fuerzas (curl noise + mouse) → nueva velocidad
//
// uniform sampler2D uVelocities;
// uniform float uDt;
// uniform float uTime;
// uniform vec3 uMouse;
// uniform float uMouseStrength;
// uniform float uDamping;

vec3 updateParticleVelocity(vec3 currentVel, vec3 pos, float time, vec3 mouse, float mouseStrength, float damping) {
  // Fuerza 1: curl noise (movimiento orgánico)
  vec3 curlForce = curlNoise(pos * 0.3 + time * 0.1);

  // Fuerza 2: mouse repulsion
  vec3 toMouse = pos - mouse;
  float mouseDist = length(toMouse);
  vec3 mouseForce = normalize(toMouse + vec3(0.001)) * exp(-mouseDist * 2.0) * mouseStrength * 2.0;

  // Combinar fuerzas
  vec3 newVel = currentVel + (curlForce * 0.5 + mouseForce) * 0.1;

  // Damping (fricción)
  newVel *= damping;

  // Clamp para estabilidad
  newVel = clamp(newVel, vec3(-3.0), vec3(3.0));

  return newVel;
}

// ============================================================
// DISPLAY SHADER (renderiza las partículas)
// ============================================================
// Lee posición + velocidad → renderiza con color según velocidad
//
// uniform sampler2D uPositions;
// uniform sampler2D uVelocities;
// uniform float uTime;

vec3 particleColor(vec3 pos, vec3 vel, float time) {
  float speed = length(vel);
  float depth = clamp(pos.z / 5.0 + 0.5, 0.0, 1.0);

  // Color según velocidad + profundidad
  vec3 colorSlow = vec3(0.3, 0.2, 0.6);   // violeta (lento)
  vec3 colorFast = vec3(0.5, 0.7, 1.0);   // azul (rápido)
  vec3 colorNear = vec3(0.8, 0.8, 1.0);   // blanco (cerca)
  vec3 colorFar = vec3(0.2, 0.15, 0.4);   // oscuro (lejos)

  vec3 color = mix(colorSlow, colorFast, smoothstep(0.0, 1.0, speed));
  color = mix(colorFar, colorNear, depth);

  // Twinkle
  float twinkle = sin(time * 3.0 + pos.x * 10.0) * 0.5 + 0.5;
  color *= 0.7 + twinkle * 0.3;

  return color;
}

// ============================================================
// SIMPLIFIED VERSION (sin GPGPU, usa vertex shader)
// ============================================================
// Para casos donde no se necesita 100K partículas.
// Las partículas se animan en el vertex shader (1 draw call).
// Soporta hasta 10K partículas a 60fps en mobile.

// Vertex shader para partículas simplificadas:
/*
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseStrength;
attribute vec3 aOffset;
attribute float aScale;
attribute float aSpeed;
varying float vAlpha;
varying float vDepth;

void main() {
  float t = uTime * aSpeed * 0.3;
  vec3 noisePos = aOffset * 0.3 + vec3(0.0, 0.0, t);
  vec3 flow = curlNoise(noisePos) * 0.5;

  vec3 finalPos = aOffset + flow;

  // Mouse repulsion
  vec2 mouseInfluence = uMouse * 3.0;
  float mouseDist = distance(finalPos.xy, mouseInfluence);
  float repel = exp(-mouseDist * mouseDist * 1.5) * uMouseStrength;
  vec2 repelDir = normalize(finalPos.xy - mouseInfluence + vec2(0.001));
  finalPos.xy += repelDir * repel * 0.8;

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = aScale * (50.0 / -mvPosition.z);

  vAlpha = clamp(1.0 - (-mvPosition.z - 2.0) / 8.0, 0.2, 1.0);
  vDepth = -mvPosition.z;
}
*/

// Fragment shader para partículas simplificadas:
/*
varying float vAlpha;
varying float vDepth;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;

  vec3 colorNear = vec3(0.7, 0.95, 1.0);
  vec3 colorFar = vec3(0.4, 0.3, 0.6);
  vec3 color = mix(colorNear, colorFar, smoothstep(2.0, 8.0, vDepth));

  gl_FragColor = vec4(color, alpha * 0.9);
}
*/
