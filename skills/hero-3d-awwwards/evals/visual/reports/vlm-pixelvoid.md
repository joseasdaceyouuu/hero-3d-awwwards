# VLM Audit Report — 2026-07-16 02:55:05

**Heroes auditados:** 1

| Hero | Score promedio | Bugs | Recomendaciones |
|------|----------------|------|-----------------|
| PIXELVOID | 7.3/10 | 6 | 6 |

## PIXELVOID — Score: 7.3/10

### 🐛 Bugs detectados
- **Step 0%**: Zonas negras muertas en los bordes laterales y superiores/inferiores del viewport, reduciendo el uso del espacio visual
- **Step 0%**: Elementos de UI (indicadores de scroll, HUD de rendimiento) con bajo contraste contra el fondo negro, dificultando su detección
- **Step 50%**: Zonas negras muertas en los bordes superior e inferior de la composición
- **Step 50%**: El scroll indicator (texto inferior) es demasiado sutil y podría no ser visible en dispositivos móviles
- **Step 100%**: Zonas negras muertas en los bordes laterales y superiores/inferiores del hero, desperdiciando espacio visual
- **Step 100%**: El scroll indicator en la parte inferior ([ CLICK PARA GLITCH ] - [ HOVER PARA DISTORSIÓN ]) es demasiado sutil y podría pasar desapercibido

### 💡 Recomendaciones
- **Step 0%**: Añadir un fondo sutil (ej. textura oscura o gradiente) para reducir las zonas negras muertas y mejorar la profundidad
- **Step 0%**: Mejorar el contraste de los elementos de UI (indicadores de scroll, HUD) con colores más visibles contra el fondo negro
- **Step 50%**: Añadir un ligero degradado o textura al fondo negro para reducir las zonas muertas
- **Step 50%**: Mejorar la visibilidad del scroll indicator con un color más contrastado o un icono
- **Step 100%**: Añadir un elemento visual (como una textura sutil o un degradado) en las zonas negras muertas para evitar el vacío y mejorar la composición

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 8 | 9 | 7 | 6 | 8 | 7.6 |
| 50% | 8 | 9 | 6 | 5 | 8 | 7.2 |
| 100% | 8 | 9 | 6 | 5 | 8 | 7.2 |
