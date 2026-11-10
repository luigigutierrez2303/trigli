# Investigación de diseño: Trigli frente a otras apps de seguimiento

Noviembre 2026. Revisión de las pantallas reales (Resumen, Comidas, editor de comida, Actividad, Fuerza, Laboratorio, en escritorio) contra apps de nutrición, salud y wearables.

## Qué hacen bien las apps de referencia

| App | Qué la hace verse profesional | Qué tomar para Trigli |
|---|---|---|
| **MacroFactor** | Color muy contenido (casi monocromo + un acento), peso de tendencia en vez de peso crudo, gráficos limpios. Tablero que se puede reordenar. | Paleta sobria; un estilo único de gráfico; el peso de tendencia ya lo tenemos, hay que lucirlo mejor. |
| **Lifesum** | La mejor nota en UI de su categoría: cálida, aireada, anillos de macros claros. | Más aire entre bloques, menos bordes y cajas. |
| **Cronometer** | Creíble pero denso y con curva de aprendizaje. | Contraejemplo: profesional no es meter más datos. |
| **Oura / Whoop / Bevel** | Un puntaje por día con sus "contribuyentes" (qué lo subió y qué lo bajó), número grande y etiqueta chica, el color se reserva para el estado. Oura dejó las tarjetas por un diseño más abierto. | El TG como "estrella del norte" con contribuyentes: comida, aeróbico, alcohol, fibra, peso. |
| **Levels / ZOE** | Puntaje de comida 1-10 (Levels) con explicación al tocarlo, línea de tiempo del día, meta clara ("7 o más"). | Nuestro score 0-10 es casi igual: falta el "¿por qué?" y la meta visible. |
| **MyFitnessPal** (rediseño de abril 2026) | Contraejemplo: escondió el diario detrás de "Ver todo" y la nota en tiendas se desplomó. | Al rediseñar, no alejar la carga diaria: tiene que seguir a un toque. |

## Lo que hoy le resta profesionalismo a Trigli

1. **Demasiados colores a la vez.** Lima, verde bosque, verde éxito, amarillo, marrón/mostaza y rojo conviven en la misma pantalla. El marrón de "warn" en barras de progreso (aeróbico semanal, proteína) se lee como "sucio". Las tarjetas del Resumen tienen bordes superiores de 4 px de distintos colores.
2. **Emojis como íconos.** El 🔥 de la racha y los emojis de alimentos en el editor (huevo, palta, café…) son la señal más "app casera". Las apps de referencia usan un set de íconos único.
3. **Gráficos inconsistentes.**
   - El gráfico de peso del Resumen ocupa toda la altura de la pantalla y el eje va de 80 a 95: mucho espacio vacío.
   - Triglicéridos (Resumen y Lab) y Cintura (Actividad): con dos puntos se dibuja una línea plana con un bloque gris o rojo debajo, que parece un error.
   - Fechas sin formatear: "desde la primera medición · 2026-05-21".
   - Cada gráfico tiene su propio estilo (área gris, bandas de color, línea punteada).
4. **Escala tipográfica despareja.** Textos de 11 px en las tarjetas del Resumen al lado de números de 56 px; muchas etiquetas en MAYÚSCULAS ("HOY", "PESO · TENDENCIA", "SCORE DEL DÍA").
5. **Escritorio desaprovechado.** Comidas, Actividad y Fuerza son una columna de 720 px en el medio de una pantalla de 1500 px. El Resumen sí tiene diseño propio.
6. **Detalles de formulario.**
   - Los placeholders de Peso (82,5) y Cintura (95) parecen datos cargados.
   - El "Guardar" del editor de comidas es un bloque lima cuadrado pegado a la esquina, distinto de los demás botones.
   - "Repetir lo de ayer" con borde punteado parece una zona para soltar archivos.
   - Los botones deshabilitados ("Guardar", "Agregar serie") apenas se distinguen del fondo.
7. **La misión no es el centro.** El Resumen abre con calorías, peso, déficit y proteína; los triglicéridos (el objetivo de la app) aparecen al final, en una franja con un gráfico que parece roto.

Lo que ya está bien: la marca (verde bosque + lima) es distintiva, la tabla semanal de escritorio es clara, los estados vacíos son buenos, hay modo oscuro y la lógica de dominio (score, balance, hábitos) es más rica que la de muchas apps comerciales.

## Recomendaciones

### A. Pulido visual (CSS y tokens, bajo riesgo)

1. **Paleta en tres roles.**
   - Lima solo para acciones (botón primario, "+").
   - Verde bosque para datos (líneas, barras, números).
   - Semánticos (verde, ámbar, rojo) solo para estados y en versión suave.
   - Sacar el marrón de las barras de progreso: neutras o bosque, con color solo cuando hay alerta.
2. **Tarjetas más planas.** Sin bordes de color arriba, sombra mínima, más aire entre bloques (24-32 px). Que el color del estado lo lleve el número o un chip, no el contorno.
3. **Escala tipográfica de 6 niveles** (display, título, subtítulo, cuerpo, etiqueta, nota) con mínimo 13 px. Etiquetas en minúscula normal; dejar las MAYÚSCULAS para un único "eyebrow" por pantalla como mucho.
4. **Íconos en vez de emojis.**
   - Racha: ícono `flame-outline` en el color de marca.
   - Alimentos: un ícono por categoría (proteína, verdura, cereal, lácteo, fruta, bebida) en círculo suave, o la inicial.
5. **Sistema de gráficos único** (un solo componente base para peso, TG, cintura y aeróbico):
   - Eje Y ajustado a los datos y a la meta.
   - Alto fijo de 200-260 px.
   - Sin relleno gris.
   - Bandas de referencia solo como líneas finas con etiqueta.
   - Fechas `es-AR` cortas ("21 may").
   - Con menos de 3 puntos, mostrar los puntos y el cambio en texto ("411 → 409 mg/dL") en vez de una línea.
6. **Formularios.**
   - Placeholder "Ej.: 82,5" o, mejor, campo vacío con "Último: 93 kg" debajo.
   - Botón "Guardar" del editor abajo, fijo y ancho (como el resto de los primarios).
   - "Repetir lo de ayer" como botón secundario, no caja punteada.
   - Deshabilitados con contraste suficiente.

### B. Estructura (lo que más suma "profesional")

1. **Triglicéridos como protagonista del Resumen**, estilo Oura:
   - Arriba de todo, el último TG con su estado, la meta (< 150), el cambio desde el inicio y cuántos días faltan para el próximo análisis.
   - Debajo, los "contribuyentes" de la semana con flecha arriba/abajo: aeróbico, score de comidas, alcohol, pescado graso, fibra y peso (los datos ya los calcula `habits.ts`).
2. **"¿Por qué este score?"** al tocar una comida, como Levels: chips de lo que sumó (fibra, omega-3) y lo que restó (harinas, azúcar), y la meta "7 o más" visible.
3. **Insights en lenguaje natural**, como los Destacados de Apple Salud o MacroFactor. Una o dos frases por semana arriba del Resumen ("Esta semana hiciste 80 de 150 min de aeróbico; dos caminatas de 35 min te ponen en meta").
4. **Escritorio en dos columnas** para Comidas y Actividad: la carga a la izquierda y el resumen del día (kcal, score, agua) a la derecha.
5. **No alejar la carga** (lección de MyFitnessPal): mantener el "+" de cada comida a un toque y, si se rediseña el inicio, sumar un botón flotante "Registrar" global en vez de quitar accesos.

## Orden sugerido

1. A1 + A2 + A3 (tokens y tarjetas): cambia la sensación general en un día de trabajo.
2. A5 (gráficos): es lo que hoy más "se ve roto".
3. A4 + A6 (íconos y formularios).
4. B1 + B2 (TG protagonista y "¿por qué?"): es lo que diferencia a Trigli de una app genérica de calorías.
5. B3-B5.

## Fuentes

- MacroFactor: [rediseño del tablero](https://macrofactor.com/dashboard-revamp/), [tablero personalizable](https://macrofactor.com/dashboard-customization/)
- Comparativas de UI (sitios con sesgo comercial, tomar con cuidado): [Nutrola 2026](https://nutrola.app/en/blog/12-best-calorie-tracking-apps-2026-deep-comparison), [Lifesum vs Lose It](https://nutrola.app/en/blog/lifesum-vs-lose-it-which-is-better-2026)
- Oura: [rediseño 2025 (9to5Google)](https://9to5google.com/2025/10/20/oura-app-redesign/)
- Whoop: [nueva pantalla de inicio](https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/), [crítica de the5krunner](https://the5krunner.com/2023/03/28/new-whoop-home-screen-looks-pretty-but-is-it-as-intuitive/)
- Bevel: [análisis de diseño](https://screensdesign.com/showcase/bevel-health-performance), [reseña](https://kiledjian.com/2026/07/07/bevel-turns-apple-watch-data.html)
- Levels: [Meal Scores explicados](https://levels.com/blog/zone-and-meal-scores), [soporte](https://support.levels.com/article/545-about-meal-scores)
- ZOE: [ZOE Score](https://intercom.help/zoe-app/en/articles/4111063-zoe-score)
- MyFitnessPal: [nueva pestaña Today](https://community.myfitnesspal.com/en/discussion/10950333/introducing-the-brand-new-today-tab), [quejas por la actualización](https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/)
