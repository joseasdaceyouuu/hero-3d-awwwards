// noise.frag
// Simplex 2D + 3D noise — utilidad reutilizable para cualquier shader hero.
// Cópialo dentro de tu shader principal con un #include o pégalo inline.
//
// Autor: Ashima Arts (MIT) — adaptado para uso hero Awwwards.
// Referencia: https://github.com/ashima/webgl-noise

// ============================================================
// SIMPLEX 2D NOISE
// ============================================================
// Uso: float n = snoise(vec2(uv * 3.0 + uTime * 0.1));

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                  + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                          dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ============================================================
// SIMPLEX 3D NOISE
// ============================================================
// Uso: float n = snoise(vec3(pos.x, pos.y, uTime));

vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289_4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute4(vec4 x) { return mod289_4(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289_3(i);
  vec4 p = permute4(permute4(permute4(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1),
                                  dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1),
                          dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1),
                              dot(p2,x2), dot(p3,x3)));
}

// ============================================================
// FRACTAL BROWNIAN MOTION (fBm)
// ============================================================
// Suma múltiples octavas de noise para detalle orgánico.
// Uso: float n = fbm(vec2(uv * 2.0), 5);  // 5 octavas

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// ============================================================
// CURL NOISE (para fluid-like motion)
// ============================================================
// Genera campos vectoriales sin divergencia. Ideal para partículas que se
// mueven como fluido.
// Uso: vec3 flow = curlNoise(vec3(pos * 2.0 + uTime * 0.1));

vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 p_x0 = vec3(
    snoise(p - dx),
    snoise(p + vec3(0.0, p.y - e, p.z)),
    snoise(p + vec3(0.0, p.y, p.z - e))
  );
  vec3 p_x1 = vec3(
    snoise(p + dx),
    snoise(p + vec3(0.0, p.y + e, p.z)),
    snoise(p + vec3(0.0, p.y, p.z + e))
  );

  float y0 = snoise(p - dy);
  float y1 = snoise(p + dy);
  float x0_z = snoise(p + vec3(p.x, 0.0, p.z - e));
  float x1_z = snoise(p + vec3(p.x, 0.0, p.z + e));

  vec3 curl = vec3(
    (y1 - y0) - (x1_z - x0_z),
    (x1_z - x0_z) - (snoise(p + dz) - snoise(p - dz)),
    (snoise(p + vec3(p.x + e, p.y, 0.0)) - snoise(p + vec3(p.x - e, p.y, 0.0))) - (y1 - y0)
  );

  return curl / (2.0 * e);
}

// ============================================================
// EJEMPLO DE USO: hero background con fBm animado
// ============================================================
/*
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * 2.0;
  float n = fbm(vec2(uv + uTime * 0.05), 5);
  float n2 = fbm(vec2(uv * 2.0 - uTime * 0.03 + uMouse), 3);

  vec3 colorA = vec3(0.05, 0.05, 0.1);    // Deep navy
  vec3 colorB = vec3(0.8, 0.2, 0.4);      // Magenta accent
  vec3 color = mix(colorA, colorB, smoothstep(-0.3, 0.5, n + n2 * 0.3));

  gl_FragColor = vec4(color, 1.0);
}
*/
