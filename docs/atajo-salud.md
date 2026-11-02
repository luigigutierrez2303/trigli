# Importar entrenos y peso desde Apple Salud

Fitbeing escribe en Apple Salud; un Atajo de iOS lee de ahí y le manda los datos a la Edge Function `importar-salud`.

## Despliegue (una vez)

```bash
supabase db push
supabase functions deploy importar-salud --no-verify-jwt
```

`--no-verify-jwt` es necesario: el Atajo no tiene sesión, se autentica con el código personal (header `x-trigli-token`).

## Código personal

Mi cuenta → "Reloj (Apple Salud)" → Generar código. Se guarda solo el hash; generar otro invalida el anterior.

## Atajo (app Atajos)

1. **Buscar muestras de Salud**: Entrenamientos, fecha de inicio es en los últimos 2 días, orden por fecha de inicio.
2. **Repetir con cada** entrenamiento → armar un diccionario:
   - `id`: fecha de inicio con formato ISO 8601 (identifica el entreno y evita duplicados)
   - `date`: fecha de inicio con formato personalizado `yyyy-MM-dd`
   - `minutes`: duración en minutos
   - `kcal`: energía activa
   - `activity`: tipo de entrenamiento
3. **Buscar muestras de Salud**: Peso corporal, última, → diccionario `weight` con `date` (`yyyy-MM-dd`) y `kg`.
4. **Obtener contenido de URL**:
   - URL: `https://<tu-proyecto>.supabase.co/functions/v1/importar-salud`
   - Método POST, cuerpo JSON `{ "workouts": [...], "weight": {...} }`
   - Header `x-trigli-token`: tu código
5. Automatización (pestaña Automatización): "Hora del día" a la noche, o "Cerrar app Fitbeing". Desactivá "Preguntar antes de ejecutar".

Reenviar es seguro: los entrenos ya importados se ignoran y el peso del día se actualiza.
