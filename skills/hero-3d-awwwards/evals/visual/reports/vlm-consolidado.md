# VLM Audit Consolidado — 3 Heroes

| Hero | Score | Bugs | Recomendaciones |
|------|-------|------|-----------------|
| VERVAIN | 7.7/10 | 6 | 6 |
| PIXELVOID | 7.3/10 | 6 | 6 |
| MERIDA | 7.5/10 | 6 | 6 |

## VERVAIN — 7.7/10

### 🐛 Bugs detectados
- Step 0%: Zona negra muerta en la parte inferior derecha del hero, donde el texto 'CINEMATIC' se pierde en el fondo oscuro
- Step 0%: El botón 'CONTACTO' tiene un contraste de texto-borde bajo (texto dorado sobre borde negro) que reduce la legibilidad
- Step 50%: Zonas negras muertas en los bordes laterales del hero, especialmente en la parte inferior, que restan equilibrio a la composición
- Step 50%: El scroll indicator o indicador de desplazamiento no es visible, lo que puede confundir al usuario sobre la interactividad de la página
- Step 100%: Zonas negras muertas en los bordes laterales y superiores/inferiores del hero, reduciendo el uso del espacio disponible
- Step 100%: El scroll indicator (si existe) no es visible, lo que puede confundir al usuario sobre la capacidad de scroll

### 💡 Top 3 recomendaciones
- Step 0%: Añadir un ligero degradado o textura sutil al fondo para reducir la sensación de 'pantalla en negro' y dar más profundidad
- Step 0%: Mejorar el contraste del botón 'CONTACTO' (ej: texto blanco sobre fondo negro o borde dorado sobre fondo negro)
- Step 50%: Añadir un scroll indicator sutil (ej. una barra o icono) en la parte inferior derecha para indicar que hay más contenido

## PIXELVOID — 7.3/10

### 🐛 Bugs detectados
- Step 0%: Zonas negras muertas en los bordes laterales y superiores/inferiores del viewport, reduciendo el uso del espacio visual
- Step 0%: Elementos de UI (indicadores de scroll, HUD de rendimiento) con bajo contraste contra el fondo negro, dificultando su detección
- Step 50%: Zonas negras muertas en los bordes superior e inferior de la composición
- Step 50%: El scroll indicator (texto inferior) es demasiado sutil y podría no ser visible en dispositivos móviles
- Step 100%: Zonas negras muertas en los bordes laterales y superiores/inferiores del hero, desperdiciando espacio visual
- Step 100%: El scroll indicator en la parte inferior ([ CLICK PARA GLITCH ] - [ HOVER PARA DISTORSIÓN ]) es demasiado sutil y podría pasar desapercibido

### 💡 Top 3 recomendaciones
- Step 0%: Añadir un fondo sutil (ej. textura oscura o gradiente) para reducir las zonas negras muertas y mejorar la profundidad
- Step 0%: Mejorar el contraste de los elementos de UI (indicadores de scroll, HUD) con colores más visibles contra el fondo negro
- Step 50%: Añadir un ligero degradado o textura al fondo negro para reducir las zonas muertas

## MERIDA — 7.5/10

### 🐛 Bugs detectados
- Step 0%: Zonas negras muertas en los bordes laterales y superiores/inferiores del viewport, reduciendo el uso del espacio disponible
- Step 0%: El scroll indicator (si existe) no es visible, lo que puede confundir al usuario sobre la capacidad de scroll
- Step 50%: El texto de la cita ('Donde el sol andino...') tiene un contraste WCAG insuficiente (relación ~3.5:1) contra el fondo oscuro, lo que reduce la legibilidad para usuarios con discapacidad visual
- Step 50%: Los elementos de la sección de métricas (1.450, 14°, 100%, 18m) están alineados horizontalmente pero su espaciado vertical es irregular, creando una composición desequilibrada
- Step 100%: El fondo oscuro con partículas rojas puede crear zonas negras muertas en áreas sin contenido, reduciendo el impacto visual
- Step 100%: El texto en color beige claro podría tener problemas de legibilidad en dispositivos con baja luminosidad (aunque cumple WCAG, el contraste podría mejorarse para mayor claridad)

### 💡 Top 3 recomendaciones
- Step 0%: Aumentar el padding del contenedor principal para reducir las zonas negras muertas y aprovechar el espacio del viewport
- Step 0%: Añadir un scroll indicator sutil (ej. una barra o flecha) en la parte inferior derecha para indicar scroll, manteniendo la elegancia del diseño
- Step 50%: Aumentar el contraste del texto de la cita (ej: usar un color más claro o añadir un fondo semi-transparente) para cumplir con WCAG 2.1 AA
