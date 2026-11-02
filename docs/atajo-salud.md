# Importar energía activa y peso desde Apple Salud

Fitbeing escribe en Apple Salud; un Atajo de iOS lee de ahí y le manda los datos a la Edge Function `importar-salud`.

Los Atajos no pueden leer los entrenamientos de Salud (no hay tipo "Entrenamientos" en "Buscar muestras de Salud"), así que se importa el **total diario de energía activa**. En Actividad aparece como una fila "Actividad de Salud" por día. Las kcal las estima el iPhone (no Fitbeing), así que los minutos se cargan a mano con el lápiz de esa fila; recién ahí suman al objetivo de aeróbico. Al reenviar el mismo día solo se actualizan las kcal.

## Despliegue (una vez)

```bash
npx supabase db push
npx supabase functions deploy importar-salud --no-verify-jwt
```

`--no-verify-jwt` es necesario: el Atajo no tiene sesión, se autentica con el código personal (header `x-trigli-token`).

La función usa la service role, que necesita permisos explícitos sobre las tablas (migración `service_role_grants`).

## Código personal

Mi cuenta → "Apple Salud" → Generar código. Se guarda solo el hash; generar otro invalida el anterior.

## Atajo (app Atajos)

1. **Buscar muestras de Salud**: Tipo "Energía de actividad", Fecha de inicio en los últimos 2 días, **Agrupar por Día**, **Unidad kcal**.
2. **Repetir con cada** muestra → diccionario con:
   - `date`: fecha de inicio con formato personalizado `yyyy-MM-dd`
   - `kcal`: Valor
   - y "Obtener Diccionario" como último paso del bucle.
3. Tras **Terminar repetición**: **Establecer variable** `entrenos` con "Repetir resultados" de ese primer bucle (si no, el cuerpo toma los resultados del último bucle).
4. Peso: **Buscar muestras de Salud** "Peso corporal", límite 1 → diccionario `weight_dict` con `date` (`yyyy-MM-dd`) y `kg`.
5. **Obtener contenido de URL**: POST a `https://<tu-proyecto>.supabase.co/functions/v1/importar-salud`, encabezados `x-trigli-token` y `Content-Type: application/json`, cuerpo JSON con `days` (la variable `entrenos`) y `weight` (`weight_dict`).
6. Automatización (pestaña Automatización): "Hora del día" a la noche. Desactivá "Preguntar antes de ejecutar".

La respuesta es `{"imported":0,"days":N,"weight":true|false}`. La función también acepta `workouts` (entrenos sueltos con `id`, `date`, `minutes`, `kcal`, `activity`) por si una fuente futura los expone.
