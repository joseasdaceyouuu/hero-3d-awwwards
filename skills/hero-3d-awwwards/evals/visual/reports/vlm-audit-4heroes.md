# VLM Audit Report — 2026-07-16 02:42:51

**Heroes auditados:** 4

| Hero | Score promedio | Bugs | Recomendaciones |
|------|----------------|------|-----------------|
| PROFUNDIDAD | 4.9/10 | 6 | 6 |
| VERVAIN | 7.6/10 | 4 | 4 |
| PIXELVOID | 7.5/10 | 6 | 7 |
| MÉRIDA | 7.5/10 | 6 | 6 |

## PROFUNDIDAD — Score: 4.9/10

### 🐛 Bugs detectados
- **Step 0%**: El scroll indicator en la parte inferior (TRAVELLING, Z=14.0, 0%) está mal posicionado, muy cerca del borde inferior y con bajo contraste contra el fondo oscuro, dificultando su detección.
- **Step 0%**: El botón 'ENTRAR EN ESCENA' tiene un borde muy delgado y bajo contraste, lo que puede reducir su visibilidad y accesibilidad para usuarios con discapacidad visual.
- **Step 50%**: Zonas negras muertas en la composición, especialmente en el centro y laterales del hero
- **Step 50%**: El scroll indicator está posicionado demasiado bajo, reduciendo la visibilidad
- **Step 100%**: Zona negra muerta dominante en el 90% de la pantalla, resultando en un espacio inutilizado y una composición vacía
- **Step 100%**: Contraste extremadamente bajo entre el texto inferior ('TRAVELLING', 'Z=0.5 - 100%') y el fondo oscuro, haciendo el texto ilegible

### 💡 Recomendaciones
- **Step 0%**: Aumentar el tamaño y el contraste del scroll indicator (por ejemplo, usar un color más visible o un icono) para mejorar su detección y accesibilidad.
- **Step 0%**: Aumentar el grosor del borde del botón 'ENTRAR EN ESCENA' o usar un color de borde más contrastado para mejorar su visibilidad y accesibilidad.
- **Step 50%**: Añadir más elementos visuales (texturas, gradientes) para llenar las zonas negras muertas
- **Step 50%**: Posicionar el scroll indicator más cerca del centro vertical para mejorar la visibilidad
- **Step 100%**: Añadir un elemento visual central (imagen, gráfico o texto principal) para llenar el espacio vacío y crear una composición equilibrada

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 8 | 9 | 7 | 5 | 9 | 7.6 |
| 50% | 6 | 7 | 4 | 3 | 7 | 5.4 |
| 100% | 3 | 2 | 1 | 1 | 2 | 1.8 |

## VERVAIN — Score: 7.6/10

### 🐛 Bugs detectados
- **Step 0%**: Zona negra muerta en la parte inferior derecha del hero, donde no hay contenido ni elementos visuales que aprovechen el espacio
- **Step 0%**: El scroll indicator no es visible, lo que puede confundir al usuario sobre la existencia de contenido adicional
- **Step 50%**: El fondo oscuro con puntos de luz podría causar zonas negras muertas en dispositivos con baja luminosidad, afectando la legibilidad del texto en ciertas áreas
- **Step 50%**: Los iconos de redes sociales en la parte inferior están muy pequeños y poco contrastados, lo que dificulta su identificación

### 💡 Recomendaciones
- **Step 0%**: Añadir un elemento visual (como un ícono o una pequeña animación) en la zona inferior derecha para evitar el espacio muerto y guiar la mirada del usuario
- **Step 0%**: Incluir un scroll indicator sutil (ej. una flecha o un punto) para indicar que hay más contenido al hacer scroll
- **Step 50%**: Aumentar ligeramente el tamaño de los iconos de redes sociales y mejorar su contraste para mejorar la accesibilidad
- **Step 50%**: Considerar agregar un efecto parallax sutil a los puntos de luz para aumentar la sensación de profundidad sin sobrecargar el diseño

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 8 | 9 | 7 | 6 | 9 | 7.8 |
| 50% | 8 | 9 | 6 | 5 | 9 | 7.4 |

## PIXELVOID — Score: 7.5/10

### 🐛 Bugs detectados
- **Step 0%**: Zona negra muerta en la parte inferior del hero (debajo de los botones y texto de interacción)
- **Step 0%**: El scroll indicator (texto de interacción) está demasiado bajo, casi fuera de la zona visible en pantallas pequeñas
- **Step 50%**: El fondo negro absoluto puede crear una 'zona muerta' visual en pantallas con baja luminosidad, reduciendo el impacto del contenido principal
- **Step 50%**: El texto de la descripción ('UN METROIDVANIA DONDE LA OSCURIDAD // RECUERDA TU NOMBRE') tiene un contraste marginal en algunas áreas, especialmente donde el glitch del título se superpone
- **Step 100%**: Zonas negras muertas en los bordes laterales y superiores/inferiores del viewport, reduciendo el uso del espacio visual
- **Step 100%**: El scroll indicator en la parte inferior ([ CLICK PARA GLITCH ] - [ HOVER PARA DISTORSIÓN ]) es demasiado sutil y podría no ser percibido por usuarios en dispositivos móviles

### 💡 Recomendaciones
- **Step 0%**: Reducir el espacio inferior muerto para mejorar el uso del espacio vertical
- **Step 0%**: Subir el texto de interacción (CLICK PARA GLITCH / HOVER PARA DISTORSIÓN) para que sea más visible en dispositivos móviles
- **Step 0%**: Añadir un ligero parallax al título o fondo para aumentar la sensación de profundidad
- **Step 50%**: Añadir un degradado sutil o textura al fondo negro para evitar la sensación de 'pantalla en negro' y mejorar la profundidad
- **Step 50%**: Refinar el contraste del texto secundario (descripción) asegurando que no se pierda en áreas donde el glitch del título es más intenso

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 8 | 9 | 6 | 5 | 8 | 7.2 |
| 50% | 8 | 9 | 7 | 6 | 8 | 7.6 |
| 100% | 8 | 9 | 7 | 6 | 8 | 7.6 |

## MÉRIDA — Score: 7.5/10

### 🐛 Bugs detectados
- **Step 0%**: El texto 'MÉRIDA' tiene un contraste WCAG insuficiente (4.5:1) contra el fondo oscuro, lo que reduce la legibilidad en dispositivos con baja luminosidad
- **Step 0%**: El botón 'RESERVAR COSECHA' tiene un contraste bajo (3.2:1) contra el fondo, dificultando la identificación de la CTA
- **Step 50%**: El texto en la esquina superior izquierda ('MENDOZA, ARGENTINA') es demasiado pequeño y de bajo contraste, lo que reduce su legibilidad.
- **Step 50%**: El scroll indicator o elemento de navegación en la parte inferior ('DESCUBRIR') es poco visible debido a su color oscuro y tamaño reducido.
- **Step 100%**: El texto 'DESCUBRIR' en la parte inferior es demasiado pequeño y de bajo contraste, dificultando su legibilidad
- **Step 100%**: Los elementos de navegación en las esquinas (botellas, malbec, vol) tienen bajo contraste y podrían no ser accesibles para usuarios con discapacidad visual

### 💡 Recomendaciones
- **Step 0%**: Aumentar el contraste del texto principal y botones a 4.5:1 mínimo (ej: cambiar color del título a beige claro y botón a rojo oscuro)
- **Step 0%**: Añadir un ligero parallax o animación de partículas para mejorar la sensación de profundidad sin saturar el diseño
- **Step 50%**: Aumentar el tamaño y el contraste del texto en la esquina superior izquierda para mejorar la legibilidad sin comprometer el diseño.
- **Step 50%**: Mejorar la visibilidad del scroll indicator o elemento de navegación inferior, utilizando un color más contrastado o un tamaño mayor.
- **Step 100%**: Aumentar el tamaño y mejorar el contraste del texto 'DESCUBRIR' para mejorar la accesibilidad

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 8 | 7 | 6 | 5 | 9 | 7 |
| 50% | 9 | 8 | 7 | 5 | 9 | 7.6 |
| 100% | 9 | 8 | 7 | 6 | 9 | 7.8 |
