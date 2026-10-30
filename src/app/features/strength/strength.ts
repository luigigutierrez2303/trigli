/** Doble progresión: se sube la carga cuando todas las series llegan al tope del rango. */
export const REP_RANGE = { min: 8, max: 12 };
export const WEIGHT_STEP_KG = 2;

export interface SetEntry {
  reps: number;
  weight_kg: number | null;
}

export interface Suggestion {
  weight_kg: number | null;
  reps: number;
  reason: 'first' | 'add-rep' | 'add-weight';
}

/** Sugerencia para la próxima sesión a partir de las series de la última vez. */
export function suggestNext(last: SetEntry[]): Suggestion {
  if (!last.length) return { weight_kg: null, reps: REP_RANGE.min, reason: 'first' };

  const weights = last.map((s) => s.weight_kg).filter((w): w is number => w !== null);
  const top = weights.length ? Math.max(...weights) : null;
  const working = last.filter((s) => s.weight_kg === top);
  const minReps = Math.min(...working.map((s) => s.reps));

  if (minReps >= REP_RANGE.max) {
    return top === null
      ? { weight_kg: null, reps: REP_RANGE.max, reason: 'add-rep' }
      : { weight_kg: top + WEIGHT_STEP_KG, reps: REP_RANGE.min, reason: 'add-weight' };
  }
  return { weight_kg: top, reps: Math.max(minReps + 1, REP_RANGE.min), reason: 'add-rep' };
}

/** Volumen = suma de repeticiones × carga (el peso corporal cuenta como 1). */
export function sessionVolume(sets: SetEntry[]): number {
  return Math.round(sets.reduce((sum, s) => sum + s.reps * (s.weight_kg ?? 1), 0));
}

/** 1RM estimado por Epley. */
export function estimate1RM(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export const isValidReps = (n: number | null): n is number => n !== null && Number.isInteger(n) && n >= 1 && n <= 100;
export const isValidLoad = (kg: number | null): kg is number => kg !== null && kg >= 0 && kg <= 500;
