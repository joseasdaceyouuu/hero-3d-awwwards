# VLM Audit Report — 2026-07-16 06:01:10

**Heroes auditados:** 1

| Hero | Score promedio | Bugs | Recomendaciones |
|------|----------------|------|-----------------|
| AURORA | 7.3/10 | 4 | 5 |

## AURORA — Score: 7.3/10

### 🐛 Bugs detectados
- **Step 0%**: El fondo oscuro con degradado verde oscuro crea una zona negra muerta en los bordes, reduciendo el impacto visual del elemento central
- **Step 0%**: El texto 'AURORA' y el botón 'EXPLORAR' tienen un contraste moderado contra el fondo, lo que podría afectar la legibilidad en dispositivos con baja luminosidad
- **Step 100%**: El fondo oscuro con degradado verde oscuro crea una zona negra muerta en los bordes exteriores, reduciendo el impacto visual del elemento central
- **Step 100%**: El texto 'EXPLORAR' en el CTA tiene un contraste moderado contra el fondo azul claro, lo que podría afectar la legibilidad en dispositivos con baja luminosidad

### 💡 Recomendaciones
- **Step 0%**: Aumentar el contraste del texto y botones añadiendo un borde o sombra sutil para mejorar la legibilidad en fondos oscuros
- **Step 0%**: Reducir la zona negra muerta en los bordes del fondo con un degradado más sutil o un elemento visual secundario
- **Step 100%**: Aumentar el brillo o el contraste del CTA 'EXPLORAR' para mejorar la legibilidad (ej: usar un color de fondo más oscuro o texto más contrastado)
- **Step 100%**: Reducir la opacidad del fondo oscuro en los bordes exteriores para eliminar la zona negra muerta y hacer que el elemento central destaque más
- **Step 100%**: Añadir una ligera animación de parallax o movimiento sutil al elemento 3D para aumentar la sensación de profundidad y motion

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 8 | 7 | 6 | 5 | 8 | 6.8 |
| 100% | 9 | 8 | 7 | 6 | 9 | 7.8 |
