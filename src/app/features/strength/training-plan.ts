export interface PlanDay {
  key: 'push' | 'pull' | 'legs';
  label: string;
  focus: string;
  exercises: readonly string[];
}

/** Rutina de tres días con mancuernas y banco; los nombres coinciden con el catálogo de ejercicios. */
export const PLAN: readonly PlanDay[] = [
  {
    key: 'push', label: 'Empuje', focus: 'Pecho, hombros y tríceps',
    exercises: ['Press banca con mancuernas', 'Press inclinado con mancuernas', 'Press militar sentado', 'Elevaciones laterales', 'Extensión de tríceps acostado'],
  },
  {
    key: 'pull', label: 'Tracción', focus: 'Espalda y bíceps',
    exercises: ['Remo a una mano', 'Pullover', 'Curl de bíceps', 'Peso muerto rumano'],
  },
  {
    key: 'legs', label: 'Piernas', focus: 'Piernas y glúteos',
    exercises: ['Sentadilla goblet', 'Sentadilla búlgara', 'Estocadas', 'Peso muerto rumano', 'Hip thrust'],
  },
];

/** Qué día del plan fue una sesión: el que comparte más ejercicios con ella (null si no coincide ninguno). */
export function dayOfSession(exerciseNames: readonly string[]): PlanDay | null {
  let best: PlanDay | null = null;
  let bestCount = 0;
  for (const day of PLAN) {
    const count = exerciseNames.filter((n) => day.exercises.includes(n)).length;
    if (count > bestCount) { best = day; bestCount = count; }
  }
  return best;
}

/** El día que toca: el siguiente al de la última sesión, o el primero si no hay historial. */
export function nextDay(lastSessionExercises: readonly string[] | null): PlanDay {
  const last = lastSessionExercises ? dayOfSession(lastSessionExercises) : null;
  if (!last) return PLAN[0];
  return PLAN[(PLAN.findIndex((d) => d.key === last.key) + 1) % PLAN.length];
}
