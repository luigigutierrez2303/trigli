import { ageOn, ActivityLevel, EnergyProfile, Sex } from '../energy/energy';
import { isValidWaist, isValidWeight, parseDecimal } from '../activity/activity';

export const ONBOARDING_SKIPPED_KEY = 'trigli.onboarding.skipped';
export const FIRST_STEPS_DISMISSED_KEY = 'trigli.firststeps.dismissed';

/** Datos tal cual los escribe la persona en el asistente. */
export interface OnboardingForm {
  sex: Sex;
  birth: string;
  heightRaw: string;
  weightRaw: string;
  waistRaw: string;
  goalRaw: string;
  level: ActivityLevel;
  lossPerWeek: number;
}

export interface OnboardingData {
  profile: EnergyProfile;
  weightKg: number;
  waistCm: number | null;
}

/** Perfil + peso (+ cintura opcional) validados, o null si falta algo o está fuera de rango. */
export function parseOnboarding(f: OnboardingForm, todayIso: string): OnboardingData | null {
  const height = parseDecimal(f.heightRaw);
  const goal = parseDecimal(f.goalRaw);
  const weight = parseDecimal(f.weightRaw);
  const waist = parseDecimal(f.waistRaw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.birth) || f.birth > todayIso) return null;
  const age = ageOn(f.birth, todayIso);
  if (age < 10 || age > 110) return null;
  if (!height || height < 100 || height > 250) return null;
  if (!goal || goal < 30 || goal > 250) return null;
  if (!isValidWeight(weight)) return null;
  if (f.waistRaw.trim() !== '' && !isValidWaist(waist)) return null;
  return {
    profile: {
      sex: f.sex, birth_date: f.birth, height_cm: height, goal_weight_kg: goal,
      activity_level: f.level, weekly_loss_kg: f.lossPerWeek,
    },
    weightKg: weight,
    waistCm: f.waistRaw.trim() === '' ? null : waist,
  };
}

/** Menores de 18: la app calcula un déficit calórico, así que conviene avisar. */
export const isMinor = (birthIso: string, todayIso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(birthIso) && ageOn(birthIso, todayIso) < 18;

/** Triglicéridos opcionales del paso 4: vacío = no cargar; null = valor inválido. */
export function parseTg(raw: string): number | 'none' | null {
  if (raw.trim() === '') return 'none';
  const n = parseDecimal(raw);
  return n !== null && n >= 20 && n <= 5000 ? Math.round(n) : null;
}

/** El asistente aparece si no hay perfil guardado y la persona no lo salteó. */
export const needsOnboarding = (hasProfile: boolean, skipped: boolean) => !hasProfile && !skipped;

export interface FirstStepsState {
  hasMeal: boolean;
  hasWorkout: boolean;
  hasWeight: boolean;
  hasProfile: boolean;
}

export interface FirstStep {
  key: string;
  label: string;
  link: string;
  done: boolean;
}

export function firstSteps(s: FirstStepsState): FirstStep[] {
  return [
    { key: 'profile', label: 'Completá tu meta de calorías', link: '/cuenta', done: s.hasProfile },
    { key: 'meal', label: 'Cargá tu primera comida', link: '/comidas', done: s.hasMeal },
    { key: 'workout', label: 'Anotá un entrenamiento', link: '/actividad', done: s.hasWorkout },
    { key: 'weight', label: 'Registrá tu peso', link: '/actividad', done: s.hasWeight },
  ];
}

export const allStepsDone = (steps: FirstStep[]) => steps.every((s) => s.done);

/** Tarjetas del último paso: qué se carga y dónde. */
export const HOW_IT_WORKS = [
  {
    title: 'Score de cada comida',
    text: 'Cada comida recibe un puntaje de 0 a 10 según lo que comiste. Alcohol, azúcar y harinas refinadas lo bajan; pescado, fibra y verduras lo suben. El del día es el promedio.',
  },
  {
    title: 'Balance de calorías',
    text: 'Resumen compara lo que comiste con tu meta diaria y suma lo que quemás entrenando. Con eso ves tu déficit de la semana.',
  },
  {
    title: 'Dónde se carga cada cosa',
    text: 'Comidas: lo que comés y el agua. Actividad: cardio, peso y cintura. Fuerza: tu rutina con mancuernas. Lab: tus análisis de triglicéridos.',
  },
] as const;
