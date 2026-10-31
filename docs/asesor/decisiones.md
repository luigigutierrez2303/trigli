# Decisiones de producto

Registrar acá lo que se decidió o descartó y por qué, para no volver a discutirlo.

| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-10-30 | Score de comida 0-10 (base 6 + pesos de FLAG_DEFS); score del día = promedio × 10 | Feedback simple e inmediato por comida |
| 2026-10-30 | La calidad del score se deriva de los alimentos cargados por calorías; las marcas manuales se suman | Evitar cargar cada comida dos veces |
| 2026-10-30 | Meta de cardio semanal: 150 min | Recomendación estándar |
| 2026-10-30 | Meta calórica con Mifflin-St Jeor, actividad diaria sin contar entrenamientos, y piso de 1500/1200 kcal | Los entrenamientos se suman aparte; evitar déficits agresivos |
| 2026-10-30 | kcal de ejercicio netas: (MET − 1) × kg × horas | El gasto en reposo ya está en la meta; no contarlo dos veces |
| 2026-10-30 | Proteína: 1,6 g por kg de peso | Cuidar el músculo mientras se baja de peso |
| 2026-10-30 | Tendencia de peso con promedio móvil de 7 días; "muy rápido" y "estancado" solo con 14+ días de datos | En menos tiempo el agua mueve el peso más que la grasa |
| 2026-10-30 | Alimentos: catálogo propio con porciones argentinas y valores aproximados, gramos opcionales | Cubrir lo que se come acá sin depender de una API externa |
| 2026-10-30 | Fuerza con doble progresión (8-12 reps, +2 kg) | Equipo limitado: mancuernas + banco |
| 2026-10-30 | Gráficos en SVG propio, sin librería | Menos dependencias, bundle chico |
| 2026-10-30 | Acceso con Google o email + contraseña (no magic link) | Es lo que se implementó; incluye recuperación de contraseña |
| 2026-10-30 | Foto de perfil en bucket privado de Storage; si no hay, la de Google | No inflar el token de sesión con metadatos |
| 2026-10-30 | Modo claro/oscuro/automático con clase `ion-palette-dark` | Un solo mecanismo para el sistema y la elección manual |
| 2026-10-30 | Push e IA con fotos postergados | Requieren secretos/infra del usuario |

## Descartado
- Guardar la foto de perfil en los metadatos del usuario: viajan dentro del token de sesión.
- Campos `fill="outline"` de Ionic: no existen en modo iOS, que es el que usa la app; se dibujan con CSS.
