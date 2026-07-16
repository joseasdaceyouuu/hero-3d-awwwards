# VLM Audit Report — 2026-07-16 05:34:16

**Heroes auditados:** 1

| Hero | Score promedio | Bugs | Recomendaciones |
|------|----------------|------|-----------------|
| CINEFEST | 7.7/10 | 6 | 6 |

## CINEFEST — Score: 7.7/10

### 🐛 Bugs detectados
- **Step 0%**: Zonas negras muertas en los bordes laterales del hero, especialmente en la parte inferior donde el espacio no se utiliza para realzar la composición
- **Step 0%**: El scroll indicator (si existe) no es visible en la captura, lo que podría afectar la navegación intuitiva del usuario
- **Step 50%**: El texto 'CINEFEST' es muy grande y podría ser más legible con un ligero aumento de contraste (actualmente 8/10 según WCAG)
- **Step 50%**: Los botones CTA están bien posicionados pero podrían tener un hover effect más visible para mejorar la interacción
- **Step 100%**: El scroll indicator o elementos de navegación (como 'GALERIA' en la esquina inferior derecha) están mal posicionados, demasiado cerca del borde, lo que puede afectar la usabilidad en dispositivos móviles
- **Step 100%**: La composición, aunque balanceada, podría beneficiarse de un mayor espacio negativo alrededor del texto principal para evitar una sensación de saturación en la zona central

### 💡 Recomendaciones
- **Step 0%**: Añadir un scroll indicator sutil (ej. una flecha o línea) en la parte inferior central para guiar al usuario a explorar el contenido
- **Step 0%**: Reducir el espacio negativo en los bordes laterales con elementos decorativos o un degradado sutil para evitar zonas muertas y mejorar la integración visual
- **Step 50%**: Aumentar ligeramente el contraste del texto principal para cumplir con WCAG AA (actualmente AA en la mayoría de áreas)
- **Step 50%**: Añadir un efecto parallax sutil a los elementos al hacer scroll para mejorar la profundidad
- **Step 100%**: Ajustar la posición de los elementos de navegación (como 'GALERIA' y 'DESCUBRIR') para dejar un margen mínimo de 20px del borde de la pantalla, mejorando la accesibilidad en dispositivos móviles

### 📊 Scores por step
| Step | Visual | Contraste | Profundidad | Motion | Elegancia | Overall |
|------|--------|-----------|-------------|--------|-----------|---------|
| 0% | 9 | 8 | 7 | 6 | 9 | 7.8 |
| 50% | 9 | 8 | 7 | 6 | 9 | 7.8 |
| 100% | 9 | 8 | 7 | 5 | 9 | 7.6 |
