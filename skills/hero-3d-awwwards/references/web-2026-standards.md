# Web 2026 Standards — Referencia Técnica Oficial del Skill

> Consolidación de 3 manuales sobre modernización web, estándares técnicos y
> diseño estratégico 2026. Esta es la **fuente de verdad** para decisiones
> técnicas en heroes creados con el skill hero-3d-awwwards.
>
> **Origen**: Manuales de Iniciación Práctica 2026 + Guía de Estándares
> Técnicos + Plan Estratégico de Diseño 2026.

---

## Tabla de contenidos

1. Filosofía "Clarity-First"
2. Layouts orgánicos (Anti-Grid)
3. Tipografía expresiva
4. Movimiento con propósito
5. WebGPU y TSL
6. Optimización de activos (Draco + KTX2)
7. Accesibilidad 2026
8. Workflows con IA
9. Checklist de validación
10. Cuándo usar 3D vs video

---

## 1. Filosofía "Clarity-First": Menos es Más Conversión

En 2026, la modernización no es estética — es **decisión financiera de alto
rendimiento**. El diseño decorativo ha muerto; el Minimalismo Inteligente
es la norma.

**Métricas clave**:
- Contenido interactivo y claro: **93% más efectivo** que estático
- Interfaces intencionales: **+30-40% tiempo de permanencia**
- Retraso de 1s en carga móvil: **-20% conversiones**

**Regla de oro**: Cada elemento en pantalla debe justificar su existencia.
Si un píxel no guía al usuario o no reduce el esfuerzo cognitivo, es ruido
que drena la conversión.

### Evolución del diseño

| Diseño Decorativo (2025) | Diseño Funcional (2026) |
|---|---|
| Elementos para "llenar espacio" | Eliminación radical de ruido visual |
| Grillas rígidas y predecibles | Layouts orgánicos, Bento Stacking, Anti-Grid |
| Estética de escritorio adaptada | Interfaces Espaciales, Computación Espacial |
| Animaciones "ad-hoc" distractoras | Micro-interacciones con propósito y física real |

---

## 2. Layouts Orgánicos: Rompiendo la Cuadrícula Rígida

El Anti-Grid genera composiciones asimétricas que obligan al ojo a procesar
información activamente, aumentando engagement.

### Técnicas

- **Bento Stacking**: Flujos densos de datos en compartimentos limpios y
  responsivos que parecen encajar naturalmente
- **Digital Scrapbooking**: Imperfecciones intencionales, texturas rugosas,
  recortes estilo "zine" para humanizar el diseño
- **Superposición (Overlapping)**: Texto e imágenes que se traslapan para
  jerarquía de capas (Hero Sections 2.5D)
- **Liquid Glass**: Capas translúcidas con refracción en tiempo real para
  profundidad física

### Crítico: Orgánico ≠ Caótico

- **Orgánico**: Rompe la grilla con equilibrio de pesos y espacios en
  blanco para guiar la lectura
- **Caótico**: Ignora jerarquía, satura al usuario, destruye conversión

---

## 3. Tipografía Expresiva y Jerarquía Narrativa

La tipografía es el **primer contacto emocional**. Comunica autoridad antes
de que se lea el primer párrafo.

### Mandatos

- **Fuentes Variables**: La norma. Ajustar peso, ancho e inclinación
  dinámicamente mediante scroll para ritmo visual vivo
- **Escalas Audaces**: Titulares dramáticamente grandes contrastando con
  cuerpos de texto amplios y aireados
- **Fuente Estrella**: Una tipografía display para encabezados + sans-serif
  de alta legibilidad para cuerpo
- **Contraste Narrativo**: La tipografía responde al movimiento; el texto
  es parte de la coreografía interactiva

---

## 4. Movimiento con Propósito: GSAP y Compute Shaders

**Regla de oro**: "Si no guía o confirma, sobra". En 2026, hemos matado el
hábito de procesar física en la CPU.

### Casos de uso

| Interacción | Propósito | Base técnica |
|---|---|---|
| Hover Reactivo | Confirmación táctil y micro-feedback | CSS / GSAP |
| Scroll-Triggered | Revelación narrativa de contenido | GSAP ScrollTrigger |
| Sistemas de Partículas | Profundidad inmersiva | Compute Shaders (WebGPU) |

### Compute Shaders para masas

Para efectos masivos (>1M elementos), usar Compute Shaders en WebGPU.
Las colisiones y físicas ocurren en la GPU sin viaje a la CPU, garantizando
60fps incluso en móviles.

---

## 5. WebGPU y TSL: El Nuevo Paradigma

WebGPU es el estándar **stateless** de 2026. Ofrece acceso directo al
hardware (Metal, Vulkan, DirectX 12), permitiendo gráficos de nivel consola.

### Superioridad vs WebGL

| Característica | WebGL 2.0 | WebGPU (2026) |
|---|---|---|
| Arquitectura | Basada en estados globales (latencia) | Stateless (eficiencia extrema) |
| Lenguaje | GLSL (cadenas propensas a error) | TSL (unificado, compila a WGSL/GLSL) |
| Rendimiento | Limitado por JS y CPU | 100x incremento en procesamiento |
| Cómputo | Básica | 1M partículas en <2ms |

### TSL (Three.js Shading Language)

Escribir shaders una vez en JS/TS; TSL los compila a WGSL (WebGPU) o
GLSL (WebGL) automáticamente. Elimina codebases bifurcados.

### Estrategia de fallback

Siempre implementar fallback:
1. Detectar capacidades del dispositivo
2. Servir WebGPU por defecto
3. Degradación elegante a WebGL en dispositivos antiguos

---

## 6. Optimización de Activos: Draco y KTX2

El peso de archivos es el mayor enemigo de las Core Web Vitals.
**Directriz: GLB < 2MB, Videos < 5MB.**

### Compresión Draco (geometría)

Obligatoria para rendimiento. Reduce mallas hasta **90%** sin pérdida
perceptible. Caso típico: 2.9MB → 46KB.

Mecanismos:
- **Cuantización**: Vértices decimales → enteros optimizados
- **Análisis topológico**: Elimina redundancias en triángulos
- **Codificación de entropía**: Compresión aritmética final

### Texturas KTX2 (Basis Universal)

A diferencia de JPEG/PNG (que se descomprimen en RAM antes de GPU), KTX2
**permanece comprimido dentro de la VRAM**. Crítico para móviles.

| Esquema | Caso de uso | Ventaja |
|---|---|---|
| ETC1S | Fondos ambientales, UI | Peso ultra-reducido, carga rápida |
| UASTC | Materiales PBR, normales | Alta fidelidad, sin artefactos |

---

## 7. Accesibilidad e Inclusividad en 3D

La accesibilidad es **prioridad de SEO y póliza de seguro comercial**.

### Checklist obligatorio

- [ ] **Contraste 4.5:1** (no opcional)
- [ ] **Legibilidad solar**: Oscurecer textos grises; deben leerse bajo
  luz solar directa
- [ ] **Navegación por teclado**: Flujos completos sin ratón
- [ ] **Alt-text descriptivo**: IA-scaffolded pero revisado humanamente
- [ ] **prefers-reduced-motion**: Desactivar movimientos agresivos de cámara

### Fallback de WebGPU

Un sitio que falla en WebGPU **no debe presentar pantalla en blanco**.
El fallback de contenido crítico es política obligatoria.

---

## 8. Workflows Híbridos: IA y Video Loops

### Producción de video (Runway Gen-4 / Sora)

- Fondos cinematográficos y loops abstractos por **<$10 USD**
- Especificaciones: <5MB, decodificación hardware nativa
- Atributos obligatorios: `muted`, `loop`, `playsinline`

### Generación de activos 3D

Los activos generados por IA son **representaciones visuales, no modelos
de ingeniería**. Pipeline diversificado:

| Herramienta | Caso de uso |
|---|---|
| MagiScan | Captura rápida de objetos reales |
| Meshy | Texturas PBR desde texto |
| Luma AI | Storytelling visual, escenas atmosféricas |
| Kaedim | Topologías limpias listas para producción |

### Codificación agentica (Claude Code)

Delegar a agentes:
- Ajuste de cuaterniones (rotaciones sin gimbal lock)
- Lógica de sombreadores en TSL
- Scaffolding de escenas Three.js

---

## 9. Checklist de Validación para Directores Creativos

Todo proyecto debe superar esta auditoría antes de despliegue:

- [ ] **LCP < 2.5s** (Largest Contentful Paint)
- [ ] **GLB < 2MB** y videos < 5MB
- [ ] **WebGPU habilitado** con fallback TSL/WebGL 2.0
- [ ] **Texturas KTX2** (ETC1S/UASTC) verificadas en VRAM
- [ ] **Compresión Draco** con reducción > 90%
- [ ] **60fps estables** en Android gama media
- [ ] **Contraste 4.5:1** y navegación por teclado
- [ ] **Renderizado pausado** cuando la escena no es visible

---

## 10. Cuándo usar 3D vs Video

### Cuestionario de decisión

Antes de implementar 3D, responder:

1. **¿Facilita la acción del cliente?** (¿Ayuda a comprender el producto
   mejor que un video?)
2. **¿Se ajusta a la identidad de marca?** (¿Liquid Glass o Bento
   Stacking refuerzan el posicionamiento?)
3. **¿Es viable el rendimiento?** (¿Optimizado para móvil con Draco+KTX2?)

### Tip de Arquitecto

Si el 3D no aporta valor pedagógico o narrativo directo, **usar video
generado por IA en bucle como fondo**. Es un fallback de bajo costo que
ofrece atmósfera inmersiva sin carga computacional de escena en tiempo real.

---

## 11. Benchmarking de Marcas de Alto Nivel

| Marca | Técnica | Propósito |
|---|---|---|
| **Apple** | Baked Lightmaps | Realismo fotográfico sin sobrecargar GPU |
| **Nike** | Texture Atlasing | 60fps constantes mientras se exploran textiles |
| **Stripe/Shopify** | Shaders GLSL | Gradientes y transiciones para datos densos |

### Sectores premiados en Awwwards

- **E-commerce (31%)**: Configuradores PBR para reducir devoluciones
- **Real Estate (18%)**: Flythroughs de cámara para dignificar marca

---

## 12. Plan de Acción "30 Minutos"

Implementación inmediata:

1. **Auditoría de Whitespace**: +20% espacio en blanco → mejor jerarquía
2. **Poda Visual**: Eliminar 1 elemento decorativo por página que no
   cumpla función de navegación o conversión
3. **Foco de Acción (One CTA)**: Una sola acción primaria por sección de
   scroll. Eliminar botones secundarios que diluyen intención
4. **Auditoría de Contraste**: Ajustar textos grises sobre fondos claros
   para legibilidad outdoor

---

## Conclusión

> "La Claridad Primero es el único camino hacia una web sostenible y
> rentable. Diseñe con intención, optimice con rigor y nunca deje de
> experimentar con las nuevas fronteras de la profundidad digital.
> El futuro es espacial, es orgánico y, sobre todo, es humano."
