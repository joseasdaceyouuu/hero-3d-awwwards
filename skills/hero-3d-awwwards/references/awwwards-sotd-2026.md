# Awwwards SOTD 2026 — Catálogo de ejemplos premiados

> Catálogo de 25 heroes galardonados en Awwwards/CSSDA (junio-julio 2026).
> Cada entrada incluye: premio, URL, estilo, paleta, stack detectado, y el
> patrón clave que lo hizo ganar. Extraído de deep-research-report.
>
> **Uso:** el Creator v2 debe consultar esta tabla para identificar qué
> patrones aplicar según el brief del usuario. Por ejemplo, si el brief pide
> "elegancia editorial", mirar House of Honey / COBLOC / Vero New-York.

## Tabla rápida

| # | Sitio | Premio | Fecha | Estilo | Stack |
|---|-------|--------|-------|--------|-------|
| 1 | RISK | SOTD Awwwards | 15 Jul 2026 | Video slider horizontal monocromo | WebGL + Webflow |
| 2 | House of Honey | SOTD Awwwards | 14 Jul 2026 | Editorial minimalista serif | Next.js SSR |
| 3 | PP Neue Montreal | SOTD Awwwards | 13 Jul 2026 | Tipográfico rojo/blanco | Scroll horizontal |
| 4 | Longbow | SOTD Awwwards | 12 Jul 2026 | Minimalista gris velocidad | Animación sutil |
| 5 | Vectr | SOTD Awwwards | 11 Jul 2026 | Corporativo azul eléctrico | Three.js |
| 6 | 21 Hrs On The Moon | SOTD Awwwards | 10 Jul 2026 | Cinemático lunar 3D | WebGL + audio |
| 7 | Get Blue | WOTD CSSDA | 14 Jul 2026 | Minimalista negro | Parallax scroll |
| 8 | Vero New-York | WOTD CSSDA | 13 Jul 2026 | Tipográfico cinematográfico | Loader 0% WebGL |
| 9 | COBLOC | WOTD CSSDA | 12 Jul 2026 | Editorial racionalista blanco/negro | Tipografía alta |
| 10 | SSTR Friction | WOTD CSSDA | 10 Jul 2026 | Técnico ruso minimalista | 3D + parallax |
| 11 | D&G Beauty Gift Finder | WOTD CSSDA | 6 Jul 2026 | Liquid premium IA | Animaciones liquid |
| 12 | ICare WorldLabs | WOTD CSSDA | 5 Jul 2026 | 3D envolvente fuego/agua | WebGL Spark 2.0 |
| 13 | Curio Tech | WOTD CSSDA | 4 Jul 2026 | Bilingüe cinematográfico | Video + multiidioma |
| 14 | Spotify Wrapped Party | WOTD CSSDA | 3 Jul 2026 | Multicolor multijugador | Realtime + audio |
| 15 | Radian EXR | WOTD CSSDA | 2 Jul 2026 | Producto 3D moto | 3D rotation + scroll |
| 16 | Aramco Shoot Future | WOTD CSSDA | 12 Jun 2026 | Narrativo verde/azul | Scroll vertical |
| 17 | GQ × AP Extraordinary Lab | WOTD+Month CSSDA | 2 Jun 2026 | Inmersivo narrativo audio | WebGL + 3D audio |
| 18 | Artem Shcherbakov | WOTD CSSDA | 17 Jun 2026 | Portfolio CGI/VFX avatar | WebGL facial |
| 19 | Gucci Mystery Unfolds | SOTD CSSDA | 5 Jun 2026 | Cómic IA narrativa | Ilustración animada |
| 20 | Ten Years Away | WOTD CSSDA | 10 Jun 2026 | Cómic interactivo scroll | WebGL secuencial |
| 21 | Kenichi Aikawa | WOTD CSSDA | 25 Jun 2026 | Fotógrafo cinematográfico | Slider + loader |
| 22 | Power of Storytelling | WOTD CSSDA | 3 Jun 2026 | 3D fuego→hielo | Shaders WebGL |
| 23 | Wembi | WOTD CSSDA | 16 Jun 2026 | Colorful tipográfico scroll | Degradados |
| 24 | Studio Minimal Gossan | Mención Awwwards | 2023 | 3D rápido Astro+Three.js | WebGL optimizado |
| 25 | ARAGAL (referencia local) | — | 2026 | Editorial oro/negro partículas | Canvas 2D |

## Patrones clave por categoría

### Editorial minimalista (5 ejemplos)
- **House of Honey, COBLOC, Vero New-York, Kenichi Aikawa, ARAGAL**
- Fondo blanco o negro, tipografía serif enorme, líneas finas, microinteracciones
- **Stack:** Next.js SSR o HTML estático (sin WebGL necesario)
- **Patrón clave:** tipografía como protagonista + loader 0% cinematográfico
- **Trampa:** si la tipografía no es perfecta (kerning, peso, leading), pierde

### Cinemático narrativo (5 ejemplos)
- **21 Hrs On The Moon, Curio Tech, GQ × AP, Power of Storytelling, Artem Shcherbakov**
- Fondo oscuro, imágenes/video, scroll narrativo, audio opcional
- **Stack:** WebGL + shaders + GSAP ScrollTrigger
- **Patrón clave:** scroll-triggered transitions entre escenas + audio 3D
- **Trampa:** sin opt-in de audio = descarte automático

### Producto 3D centerpiece (3 ejemplos)
- **Radian EXR, Vectr, ICare WorldLabs**
- Modelo 3D del producto rotando, fondo degradado, CTA claro
- **Stack:** R3F + drei + Environment + ContactShadows
- **Patrón clave:** rotación sincronizada con scroll + iluminación cinematográfica
- **Trampa:** GLB > 2MB sin Draco = fail mobile

### Tipográfico dominante (3 ejemplos)
- **PP Neue Montreal, Wembi, Longbow**
- Texto gigante como elemento visual principal, color accent único
- **Stack:** CSS + GSAP (sin WebGL necesario)
- **Patrón clave:** un solo color accent + scroll horizontal o vertical tipográfico
- **Trampa:** más de 2 accents pierde impacto

### Liquid/fluido premium (2 ejemplos)
- **D&G Beauty Gift Finder, Power of Storytelling**
- Animaciones liquid, transiciones fluidas, estética lujo
- **Stack:** WebGL + fluid simulation shaders
- **Patrón clave:** fluido que reacciona a mouse/scroll + paleta restrained

### Cómic interactivo (2 ejemplos)
- **Gucci Mystery Unfolds, Ten Years Away**
- Ilustraciones estilo cómic, narrativa por viñetas, scroll-triggered
- **Stack:** SVG + WebGL + GSAP
- **Patrón clave:** viñetas que se despliegan al scroll + IA narrativa opcional

### Multijugador/realtime (1 ejemplo)
- **Spotify Wrapped Party**
- Multi-usuario sincronizado, audio compartido, visuales vibrantes
- **Stack:** WebSocket + Canvas + Web Audio API
- **Patrón clave:** sincronización realtime entre clientes

### Corporativo técnico (3 ejemplos)
- **SSTR, Aramco, Longbow**
- Mensaje corporativo claro, paleta sobria, animaciones técnicas
- **Stack:** HTML + CSS + GSAP o WebGL ligero
- **Patrón clave:** "mensaje primero, efecto después"

## Tendencias 2026 detectadas

1. **Monocromo + 1 accent sigue dominando** (15/25 sitios usan este patrón)
2. **Loaders cinematográficos** — contador 0%, tipografía que monta, formas que transforman (8/25)
3. **Audio opt-in con scroll-triggered** — no autoplay, invitar al usuario (5/25)
4. **Scroll horizontal tipográfico** — volver al paginación horizontal (3/25)
5. **3D optimizado con Astro** — hidratación selectiva, solo cargar Three.js donde se necesita (2/25)
6. **IA narrativa** — Gemini/LLM generando tramas personalizadas (2/25)
7. **Bilingüe/multiidioma nativo** — no traducción, diseño desde el inicio bilingüe (2/25)

## Anti-tendencias (lo que YA NO se ve en SOTD 2026)

- **Gradientes arcoíris saturados** — reemplazado por monocromo + 1 accent
- **Hamburger menu genérico** — reemplazado por navegación inmersiva
- **Hero con foto stock** — reemplazado por video/3D/ilustración custom
- **Scroll hijacking agresivo** — reemplazado por Lenis smooth scroll respetuoso
- **Animaciones de carga genéricas** — reemplazado por loaders con carácter

## Cómo usar este catálogo

Cuando el Creator v2 recibe un brief, debe:

1. **Identificar la categoría** del brief (editorial, cinemático, producto, etc.)
2. **Consultar la tabla** para ver ejemplos reales de esa categoría
3. **Identificar el patrón clave** que esa categoría usa
4. **Aplicar el patrón** con la identidad del proyecto (no copiar literal)

Por ejemplo:
- Brief: "portfolio de fotógrafo" → categoría editorial → mirar Kenichi Aikawa / Vero New-York
- Brief: "landing de zapatilla deportiva" → categoría producto 3D → mirar Radian EXR
- Brief: "estudio de postproducción" → categoría cinemático → mirar RISK / 21 Hrs On The Moon
