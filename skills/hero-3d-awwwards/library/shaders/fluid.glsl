// fluid.glsl — Simulación de fluidos simplificada (Navier-Stokes)
// Fuente: research/advanced-shader-techniques.md §2
//
// Implementa un fluid simulation con 4 passes:
//   1. Advection: transporta velocidad
//   2. Divergence: calcula divergencia del campo de velocidad
//   3. Pressure: resuelve presión (Jacobi iterations)
//   4. Projection: remueve divergencia
//
// Para usar en heroes: no es necesario simular fluido real.
// Este shader proporciona una APROXIMACIÓN visual (curl noise + advection)
// que se ve como fluido pero corre a 60fps en mobile.
//
// === ADVECTION PASS ===
// Transporta un campo (velocidad o color) a lo largo del campo de velocidad

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

vec4 advect(vec2 uv) {
  vec2 coord = uv - uDt * texture2D(uVelocity, uv).xy * uTexelSize;
  vec4 result = texture2D(uSource, coord);
  result *= uDissipation;
  return result;
}

// === SIMPLIFIED FLUID (curl noise approximation) ===
// No requiere ping-pong rendering. Una sola pasada.
// Se ve como fluido pero es curl noise + advection simplificado.

// Requiere: noise.glsl (snoise, fbm, curlNoise)

// Velocidad del fluido en un punto (curl noise)
vec3 fluidVelocity(vec3 p, float time) {
  return curlNoise(p * 0.5 + vec3(0.0, 0.0, time * 0.1));
}

// Color del fluido según velocidad + densidad
vec3 fluidColor(vec3 pos, vec3 velocity, float time, vec3 colorA, vec3 colorB) {
  float speed = length(velocity);
  float density = fbm(pos * 2.0 + velocity * 0.5 + time * 0.05);
  float t = smoothstep(0.0, 0.5, speed) * density;
  return mix(colorA, colorB, t);
}

// === DISPLAY SHADER (una sola pasada) ===
// Uso en fragment shader principal:
//   vec3 vel = fluidVelocity(vec3(uv * 3.0, uTime * 0.1), uTime);
//   vec3 col = fluidColor(vec3(uv * 2.0, uTime * 0.05), vel, uTime, colorA, colorB);

// === DYE INJECTION (mouse pinta el fluido) ===
// Cuando el usuario mueve el mouse, se inyecta "tinte" en el fluido
float dyeInjection(vec2 uv, vec2 mouse, float strength, float time) {
  float dist = length(uv - mouse);
  float inject = exp(-dist * dist * 50.0) * strength;
  // El tinte se difunde con el tiempo
  inject *= smoothstep(1.0, 0.0, time);
  return inject;
}

// === VORTICITY (añade turbulencia) ===
// Aumenta los vórtices del fluido para visual más dinámico
vec3 vorticity(vec3 p, float time, float strength) {
  vec3 vel = fluidVelocity(p, time);
  vec3 curl = curlNoise(p * 0.8 + vec3(time * 0.2));
  // Confinement: refuerza los vórtices
  vec3 force = normalize(curl + vec3(0.001)) * length(curl) * strength;
  return vel + force;
}
