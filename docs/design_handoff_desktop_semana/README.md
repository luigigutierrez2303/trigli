# Handoff: Trigli — layout desktop "Semana como tabla" (propuesta 1c)

## Overview
Hoy Trigli en desktop es el layout mobile estirado: tab bar abajo, toolbar arriba y cards a todo el ancho. Esta propuesta agrega un layout específico para pantallas anchas (≥ 1024 px):
1. **Rail de navegación vertical** a la izquierda (reemplaza el `ion-tab-bar` inferior).
2. **Resumen como tabla semanal**: días en columnas y métricas en filas (score del día, cada comida, cardio, fuerza, peso), con una columna de totales a la derecha.
3. **Franja de triglicéridos** debajo de la tabla.

En mobile (< 1024 px) no cambia nada.

Repo: `luigigutierrez2303/trigli` (Angular 22 standalone + zoneless + signals, Ionic 9, Supabase).

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento buscados. No son código para copiar tal cual. La tarea es **recrear el diseño en el codebase existente** (Angular + Ionic) con sus patrones: componentes standalone, `signal`/`computed`, lógica pura separada y testeada (ver `meal-scoring.ts`, `dashboard.ts`) y textos en español rioplatense.

`Trigli Desktop.dc.html` se abre directo en el navegador (necesita `support.js` en la misma carpeta). La propuesta elegida es el artboard **1c**. También están 1a, 1b y el estado "Actual", solo como contexto.

## Fidelity
**Alta fidelidad.** Los colores, la tipografía, el espaciado y la estructura son los finales. Los datos son de ejemplo. Usá las variables de color de Ionic (`--ion-color-*`) en lugar de hex sueltos cuando coincidan (ver Tokens).

## Screens / Views

### 1. Shell desktop (`tabs.page.ts`)
**Propósito:** navegación entre Resumen, Comidas, Actividad, Fuerza y Lab.

**Layout:** `display:flex` en horizontal, alto del viewport.
- **Rail** — ancho 80 px, fondo `#fff`, `border-right: 1px solid #e5e6e9`, flex en columna, `align-items:center`, `padding: 20px 0`, `gap: 6px`.
  - Logo: cuadrado de 40×40, radio 10, fondo `#2dd36f` (success), letra "T" negra en 18 px/700, `margin-bottom: 18px`.
  - Ítem de navegación: ancho 64, `padding: 8px 0`, radio 10, flex en columna centrado, `gap: 4px`. Ícono de 22 px y label de 11 px/500.
    - Inactivo: color `#4a4b50`.
    - Activo: fondo `#e8effd` y color `#0054e9` (primary).
    - Hover (sugerido): fondo `#f2f3f5`.
  - Ítems e íconos (los mismos ionicons que hoy): `home-outline` Resumen, `restaurant-outline` Comidas, `walk-outline` Actividad, `barbell-outline` Fuerza, `flask-outline` Lab.
  - Un spacer (`flex:1`) empuja abajo el botón Salir: ícono `log-out-outline` de 22 px, color `#636469`. Llama a `sb.signOut()` y después a `location.assign('/login')`. Sale de la toolbar de cada página.
- **Contenido** — `flex:1`, fondo `#f5f6f8`, `min-width:0`.

**Implementación sugerida:** en `≥ 1024px` mover el `ion-tab-bar` a `slot="top"` no alcanza. Conviene un `ion-split-pane` con `when="(min-width: 1024px)"` y un `ion-menu` de 80 px como rail, o bien ocultar el tab bar por CSS y renderizar un componente `app-rail` con `routerLink` + `routerLinkActive`. En desktop, las páginas ocultan su `ion-header`, que en mobile sigue igual.

### 2. Resumen desktop (`dashboard.page.*`)
**Propósito:** ver la semana completa de un vistazo y saltar a cargar lo que falta.

**Contenedor:** `padding: 32px 40px`, flex en columna, `gap: 20px`.

**Header de semana** — flex en fila, `gap: 16px`, alineado al centro:
- `chevron-back` de 22 px en primary, llama a `shiftWeek(-1)`.
- Título de 26 px/700, color `#1f2023`: **"Semana del 26 oct al 1 nov"**. Se forma con fechas `es-AR` `{day:'numeric', month:'short'}` y el patrón `Semana del {lunes} al {domingo}`.
- `chevron-forward` de 22 px, llama a `shiftWeek(1)`. Si `isCurrentWeek()` está deshabilitado y su color es `#c4c5c9`.

**Tabla** — card blanca con `border: 1px solid #e5e6e9`, radio 12 y `overflow:hidden`. Es una CSS grid con `grid-template-columns: 170px repeat(7, minmax(0,1fr)) 170px`. Texto base de 15 px.

- **Fila de encabezado** (`padding: 14px 0`, `border-bottom: 1px solid #e5e6e9`):
  - Celda vacía.
  - Siete días con el formato `Lun 26`, en 13 px `#636469`, centrados.
  - El día de hoy dice `Hoy 30`, en 13 px/700 primary, con fondo de columna `#f0f5fe`.
  - Última columna: "Semana", alineada a la izquierda con `padding: 0 20px` y `border-left: 1px solid #e5e6e9`.
- **Columna de hoy:** todas sus celdas llevan fondo `#f0f5fe`.
- **Columna "Semana":** siempre lleva `border-left: 1px solid #e5e6e9` y `padding: 12–14px 20px`.
- **Separadores entre filas:** `1px solid #eeeff1`. Debajo de "Cena" va `#e5e6e9`, que cierra el bloque de comidas.

Filas:

| Fila | Label (col 1) | Celda de día | Columna Semana |
|---|---|---|---|
| Score del día | 15 px/500, `padding:16px 20px` | Chip de ancho 44, `padding:5px 0`, radio 6, 16 px/700, centrado. El fondo depende del nivel (ver abajo). Sin dato: "—" en `#c4c5c9`. | "61" en 22 px/700 y "prom. · 5/7" en 13 px `#636469` (`summarize Week().avgScore` / `daysLogged`) |
| Desayuno · Almuerzo · Merienda · Cena | 15 px/400 `#4a4b50`, `padding:12px 20px` | Score 0–10 en 15 px/500, centrado y coloreado por nivel (texto: good `#1a9e52`, warn `#9a7300`, bad `#c5000f`). Si la comida tuvo alcohol, se agrega "alcohol" en 11 px `#636469`. Si es hoy y no está registrada: ícono `add-circle-outline` de 24 px en primary, que abre el editor de esa comida. Días pasados sin registro o días futuros: celda vacía. | vacío |
| Cardio | 15 px/500, `padding:14px 20px` | Minutos con el formato `30′`. Sin dato: "—" en `#c4c5c9`. Días futuros: vacía. | "**95** / 150 min" en 14 px más una barra de 4 px (fondo `#d6e2fb`, relleno primary al `pct`%, radio 2) con `gap 6px` |
| Fuerza | ídem | Duración de la sesión en `45′`. Sin sesión: vacía. | "**2** sesiones" en 14 px |
| Peso | ídem (sin borde inferior) | kg con coma decimal (`84,2`) en los días con `body_metric` | Badge con el cambio semanal (`weekWeightChange`): `−0,6 kg`, 13 px/700, `padding:3px 8px`, radio 4. ≤ 0 → fondo `#2dd36f` y texto negro. > 0 → `#ffc409` y texto negro |

**Niveles** (`levelForDay`, `levelForMeal` en `meal-scoring.ts`):
- good ≥ 70 / ≥ 7: chip `#2dd36f`, texto `#000`.
- warn ≥ 40 / ≥ 4: chip `#ffc409`, texto `#000`.
- bad < 40: chip `#c5000f`, texto `#fff`.

**Franja de triglicéridos** — card blanca con borde `#e5e6e9`, radio 12, `padding: 20px 24px`, flex en fila, `gap: 32px` y `flex:1` (ocupa el alto restante).
- Bloque izquierdo de 260 px:
  - Título "Triglicéridos" en 15 px/500.
  - Valor "238" en 36 px/700, "mg/dL" en 14 px `#636469` y un badge de nivel (`classifyTg` → `TG_LEVEL_LABELS`). Colores del badge: normal `#2dd36f`, borderline `#ffc409`, high/very-high `#c5000f` con texto blanco.
  - Línea "−42% desde la primera medición · 2026-10-02" en 14 px `#636469` (`percentChange`).
- Gráfico de línea de ancho completo y 120 px de alto, que reutiliza `chartGeometry`:
  - Línea primary de 2.5 px.
  - Referencia en 150 con trazo punteado `4 4`, `#636469` y opacidad 0.6.
  - Se puede extender `app-line-chart` con inputs `width`/`height`, o dejar el `viewBox` en 640×120.
- A la derecha, el label "150 / referencia" en 12 px `#636469`.

## Interactions & Behavior
- `shiftWeek(±1)` recarga los datos de la semana (como hoy). La flecha siguiente se deshabilita en la semana actual.
- Click en una celda de comida → navegar a `/comidas` con esa fecha y abrir el editor de esa comida (por ejemplo, con query params `?fecha=2026-10-30&comida=dinner`). `meal-log.page` tendría que leerlos.
- Click en una celda de Cardio o Peso → `/actividad?fecha=…`.
- Click en una celda de Fuerza → `/fuerza`.
- Hover en celdas clickeables (sugerido): fondo `#f5f6f8`, o `#e4edfd` en la columna de hoy, y `cursor:pointer`.
- Los días futuros no son clickeables.
- Carga: mientras `data()` sea null, mostrar la tabla con celdas vacías, sin spinner.
- Error: toast `danger`, como hoy.
- Responsive: `< 1024px` usa el layout mobile actual sin cambios.

## State Management
`DashboardPage` ya tiene `monday`, `data`, `summary`, `cardio`, `weightChange` y `bars`. Falta:
- **Por día:** los scores de cada comida (`meal_log` con `meal_type` y `score` en el rango de la semana) y si hubo alcohol (flag `alcohol`); los minutos de cardio (`workout` type cardio, sumados por fecha); la duración de fuerza (`workout` type strength); y el peso (`body_metric.weight_kg`).
- **TG:** la serie completa de `lab_result.tg` para el gráfico, que hoy solo trae `latestTg`.
- **Función pura nueva** en `dashboard.ts`, por ejemplo `weekGrid(monday, data)`, que devuelva 7 objetos `{ date, isToday, isFuture, dayScore, dayLevel, meals: Record<MealType, {score, level, alcohol} | null>, cardioMin, strengthMin, weightKg }`. Testearla en `dashboard.spec.ts`.
- Extender `DashboardService.week()` con esas queries.

## Design Tokens
**Colores**
- primary `#0054e9` (`--ion-color-primary`) · tinte activo `#e8effd` · tinte de la columna de hoy `#f0f5fe` · fondo de la barra de progreso `#d6e2fb`
- success `#2dd36f` · warning `#ffc409` · danger `#c5000f` · medium `#636469`
- Texto de nivel sobre blanco, por contraste: good `#1a9e52` · warn `#9a7300`
- Texto `#1f2023` · secundario `#4a4b50` · deshabilitado/vacío `#c4c5c9`
- Fondo de la app `#f5f6f8` · cards `#fff`
- Bordes: `#e5e6e9` (card y encabezados) · `#eeeff1` (filas)

**Tipografía:** Roboto (el default md de Ionic).
- 26/700: título de semana
- 36/700: valor de TG
- 22/700: promedio
- 16/700: chips
- 15/400–500: celdas y labels
- 14: secundario
- 13: encabezados de día y badges
- 11: labels del rail y anotaciones

**Espaciado:** 4 · 6 · 8 · 12 · 14 · 16 · 20 · 24 · 32 · 40.

**Radios:** 4 (badges) · 6 (chips) · 10 (rail) · 12 (cards).

**Sombras:** ninguna, las cards llevan borde de 1 px.

## Assets
Solo ionicons, que ya están en el repo (`addIcons`): `home-outline`, `restaurant-outline`, `walk-outline`, `barbell-outline`, `flask-outline`, `log-out-outline`, `chevron-back`, `chevron-forward`, `add-circle-outline`. No hay imágenes.

## Files
- `Trigli Desktop.dc.html`: artboard **1c** (propuesta elegida), más 1a, 1b y "Actual" como referencia.
- `support.js`: runtime para abrir el HTML.

Archivos del repo a tocar:
- `src/app/features/tabs/tabs.page.ts`
- `src/app/features/dashboard/dashboard.page.{html,scss,ts}`
- `dashboard.ts`, `dashboard.service.ts`, `dashboard.spec.ts`
- `labs/line-chart.component.ts` (tamaño configurable)
- `meals/meal-log.page.ts` (abrir el editor por query param)
