# Hero Audit Report — 2026 Standards

## 📊 Resumen Comparativo

| Hero | Score | Pass | Passed | Failed | Critical |
|---|---|---|---|---|---|
| **COSMIC RESONANCE** | 7/10 | ✅ | 14 | 7 | 5 |
| **SILENT LIGHT** | 7/10 | ✅ | 14 | 7 | 3 |
| **NORTHERN LIGHTS** | 7/10 | ❌ | 8 | 8 | 8 |

---

## 🚨 Patrones de Fallo Comunes (detectados en 2+ heroes)

### 1. PERF-1: Pause render when offscreen — FALTA en los 3
**Impacto**: batería móvil se agota cuando el hero sale del viewport
**Fix**: IntersectionObserver que pausa el render loop
```tsx
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (canvasRef.current) {
      canvasRef.current.frameloop = entry.isIntersecting ? 'always' : 'never'
    }
  })
  observer.observe(canvasRef.current)
}, [])
```

### 2. A11Y-1/C15: Contraste WCAG AA 4.5:1 — FALTA en los 3
**Impacto**: texto ilegible bajo luz solar, falla SEO
**Fix**: oscurecer textos grises, validar contraste con herramienta
- Actual: `rgba(255,255,255,0.7)` sobre fondo oscuro = ~3:1
- Necesario: `rgba(255,255,255,0.95)` o overlay background

### 3. A11Y-3: Keyboard nav en 3D scene — FALTA en los 3
**Impacto**: usuarios sin mouse no pueden interactuar
**Fix**: añadir tabIndex + keyboard handlers para elementos 3D

### 4. PERF-5: Lazy-load/Suspense — FALTA en los 3
**Impacto**: shaders bloquean first paint
**Fix**: `React.lazy()` + `<Suspense fallback={...}>`

### 5. TSL-1: WebGPU/TSL readiness — FALTA en los 3
**Impacto**: no aprovecha 100x performance de WebGPU
**Fix**: detectar WebGPU, servir TSL shaders cuando disponible

### 6. C18: focus-visible styles — FALTA en COSMIC y SILENT
**Impacto**: navegación por teclado sin feedback visual
**Fix**: `a:focus-visible { outline: 2px solid accent; }`

---

## ✅ Strengths Comunes (detectadas en los 3)

1. **prefers-reduced-motion respetado** ✅ — los 3 heroes tienen fallback estático
2. **Una idea dominante clara** ✅ — shader es el foco único en cada uno
3. **Paleta ≤ 3 colores** ✅ — discipline cromática consistente
4. **WebGL fallback presente** ✅ — no pantalla en blanco si WebGL falla

---

## 📋 Detalle por Hero

### COSMIC RESONANCE (curl noise + particles)
- **Score**: 7/10
- **Critical failures**: 5 (A11Y-1, A11Y-3, PERF-1, PERF-5, TSL-1)
- **Strengths**: Excellent WebGL implementation, procedural effects, cosmic palette
- **Unique fails**: C18 (focus-visible missing)

### SILENT LIGHT (volumetric fog + god rays)
- **Score**: 7/10
- **Critical failures**: 3 (PERF-1, A11Y-3, TSL-1)
- **Strengths**: Excellent WebGL fallback, cinematic timing with power3.out
- **Best of the 3** — fewer critical failures

### NORTHERN LIGHTS (aurora borealis)
- **Score**: 7/10 — BUT `overall_pass: false`
- **Critical failures**: 8 (C5, C15, C18, PERF-1, PERF-5, A11Y-1, A11Y-3, TSL-1)
- **Strengths**: Excellent prefers-reduced-motion, single dominant idea, color palette
- **Worst of the 3** — missing DPR clamp on top of all common fails

---

## 🎯 Recomendaciones Prioritarias

### Quick wins (1 línea de código cada uno)
1. **Añadir focus-visible** en los 3 heroes (CSS global)
2. **Oscurecer textos grises** de 0.7 → 0.95 opacity
3. **Añadir DPR clamp** en NORTHERN LIGHTS (ya está en los otros 2)

### Medium effort (1 componente cada uno)
4. **IntersectionObserver pause-offscreen** en los 3 canvas
5. **React.lazy + Suspense** para los componentes hero

### Strategic (1 sprint)
6. **WebGPU detection + TSL migration** para preparar 2026
7. **Keyboard navigation** para elementos 3D interactivos

---

## 📈 Impacto Esperado

Si aplicamos los quick wins + medium effort:
- **Score**: 7/10 → 9/10 en los 3 heroes
- **Critical failures**: 5-8 → 0-1 por hero
- **LCP**: mejora por lazy-load
- **Batería móvil**: mejora por pause-offscreen
- **SEO**: mejora por contraste 4.5:1

---

## 🧠 Anti-patterns detectados (para inyectar en memoria)

1. "No pausar el render loop cuando el hero sale del viewport drena batería móvil — siempre usar IntersectionObserver"
2. "Textos con opacity < 0.9 sobre fondos oscuros fallan WCAG AA 4.5:1 — usar 0.95+ o overlay"
3. "Componentes 3D sin keyboard handlers excluyen usuarios sin mouse — siempre añadir tabIndex + key events"
4. "Shaders sin React.lazy/Suspense bloquean first paint — siempre lazy-load componentes WebGL"
5. "GLSL shaders sin path a TSL impiden migración a WebGPU — planificar desde el inicio"
