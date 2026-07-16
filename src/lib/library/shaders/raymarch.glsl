// raymarch.glsl — SDF Ray-marching con soft shadows
// Fuente: research/advanced-shader-techniques.md §3
//
// Ray-marching con Signed Distance Functions (SDFs).
// Incluye soft shadows (IQ trick) y domain repetition.
//
// Performance: desktop 60fps @ 128 rayos. Mobile: usar menos rayos (32-64)
// o fallback a shader plano.

// === SDF PRIMITIVES ===

// Esfera
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// Caja
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Torus
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// Plano
float sdPlane(vec3 p, float h) {
  return p.y - h;
}

// Octaedro
float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// === SDF OPERATIONS ===

// Unión
float opUnion(float d1, float d2) { return min(d1, d2); }

// Intersección
float opIntersect(float d1, float d2) { return max(d1, d2); }

// Resta
float opSubtract(float d1, float d2) { return max(d1, -d2); }

// Smooth union (blend)
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Domain repetition (infinito)
vec3 opRep(vec3 p, vec3 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}

// Twist (deformación)
vec3 opTwist(vec3 p, float k) {
  float c = cos(k * p.y);
  float s = sin(k * p.y);
  mat2 m = mat2(c, -s, s, c);
  return vec3(m * p.xz, p.y).xzy;
}

// === MAP FUNCTION (define la escena) ===
// Personalizar esta función para cada hero
float map(vec3 p) {
  // Ejemplo: esferas repetidas con twist
  vec3 rp = opRep(p, vec3(2.0));
  rp = opTwist(rp, 1.0);
  float d1 = sdSphere(rp, 0.5);

  // Plano del suelo
  float d2 = sdPlane(p, -1.5);

  return opSmoothUnion(d1, d2, 0.3);
}

// === SOFT SHADOWS (IQ trick) ===
// k=8 = sombras suaves, k=128 = sombras duras
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 32; i++) {
    if (t >= maxt) break;
    float h = map(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += h;
  }
  return clamp(res, 0.0, 1.0);
}

// === NORMAL CALCULATION ===
vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// === AMBIENT OCCLUSION ===
float calcAO(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float hr = 0.01 + 0.12 * float(i) / 4.0;
    float dd = map(p + n * hr);
    occ += (hr - dd) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// === RAY-MARCH MAIN LOOP ===
// ro = ray origin, rd = ray direction
// Returns: vec4(distance, materialID, shadow, ao)
vec4 raymarch(vec3 ro, vec3 rd, int maxSteps, float maxDist) {
  float t = 0.0;
  float material = 0.0;

  for (int i = 0; i < 128; i++) {
    if (i >= maxSteps) break;
    vec3 p = ro + rd * t;
    float d = map(p);

    if (d < 0.001) {
      // Hit! Calcular normal, sombra y AO
      vec3 normal = calcNormal(p);
      float shadow = softShadow(p + normal * 0.01, normalize(vec3(0.5, 0.8, 0.3)), 0.02, 2.5, 8.0);
      float ao = calcAO(p, normal);
      return vec4(t, material, shadow, ao);
    }

    if (t > maxDist) break;
    t += d;
  }

  // No hit (cielo/fondo)
  return vec4(-1.0, 0.0, 0.0, 0.0);
}

// === SHADING ===
vec3 shade(vec3 p, vec3 normal, float shadow, float ao, vec3 lightDir, vec3 baseColor) {
  float diff = max(0.0, dot(normal, lightDir));
  float ambient = 0.3 * ao;
  float specular = pow(max(0.0, dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0))), 32.0);

  vec3 color = baseColor * (ambient + diff * shadow);
  color += vec3(1.0) * specular * shadow * 0.5;

  return color;
}

// === EXAMPLE: Full ray-march fragment ===
// Para usar en un fragment shader:
/*
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;

  // Camera
  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(uv, -1.5));

  // Ray-march
  vec4 hit = raymarch(ro, rd, 64, 20.0);

  if (hit.x < 0.0) {
    // Sky
    gl_FragColor = vec4(0.02, 0.02, 0.05, 1.0);
  } else {
    vec3 p = ro + rd * hit.x;
    vec3 normal = calcNormal(p);
    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));

    vec3 color = shade(p, normal, hit.z, hit.w, lightDir, vec3(0.5, 0.4, 0.8));
    gl_FragColor = vec4(color, 1.0);
  }
}
*/
