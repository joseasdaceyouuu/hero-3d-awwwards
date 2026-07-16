# VLM Audit Report — 2026-07-16 02:56:02

**Heroes auditados:** 1

| Hero | Score promedio | Bugs | Recomendaciones |
|------|----------------|------|-----------------|
| MERIDA | 7.5/10 | 6 | 6 |

## MERIDA — Score: 7.5/10

### 🐛 Bugs detectados
- **Step 0%**: Zonas negras muertas en los bordes laterales y superiores/inferiores del viewport, reduciendo el uso del espacio disponible
- **Step 0%**: El scroll indicator (si existe) no es visible, lo que puede confundir al usuario sobre la capacidad de scroll
- **Step 50%**: El texto de la cita ('Donde el sol andino...') tiene un contraste WCAG insuficiente (relación ~3.5:1) contra el fondo oscuro, lo que reduce la legibilidad para usuarios con discapacidad visual
- **Step 50%**: Los elementos de la sección de métricas (1.450, 14°, 100%, 18m) están alineados horizontalmente pero su espaciado vertical es irregular, creando una composición desequilibrada
- **Step 100%**: El fondo oscuro con partículas rojas puede crear zonas negras muertas en áreas sin contenido, reduciendo el impacto visual
- **Step 100%**: El texto en color beige claro podría tener problemas de legibilidad en dispositivos con baja luminosidad (aunque cumple WCAG, el contraste podría mejorarse para mayor claridad)

### 💡 Recomendaciones
- **Step 0%**: Aumentar el padding del contenedor principal para reducir las zonas negras muertas y aprovechar el espacio del viewport
- **Step 0%**: Añadir un scroll indicator sutil (ej. una barra o flecha) en la parte inferior derecha para indicar scroll, manteniendo la elegancia del diseño
- **Step 50%**: Aumentar el contraste del texto de la cita (ej: usar un color más claro o añadir un fondo semi-transparente) para cumplir con WCAG 2.1 AA
- **Step 50%**: Alinear uniformemente las métricas (igualar altura de las filas o espaciado vertical) para mejorar la consistencia visual
- **Step 100%**: Aumentar ligeramente el contraste del texto principal para mejorar la legibilidad en dispositivos móviles

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 8 | 7 | 6 | 5 | 9 | 7 |
| 50% | 9 | 8 | 7 | 6 | 9 | 7.8 |
| 100% | 9 | 8 | 7 | 5 | 9 | 7.6 |
