export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate';

/** Actividad del día a día SIN contar los entrenamientos: esos se suman aparte al registrarlos. */
export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; factor: number }[] = [
  { key: 'sedentary', label: 'Sentado casi todo el día', factor: 1.2 },
  { key: 'light', label: 'Camino o estoy de pie bastante', factor: 1.375 },
  { key: 'moderate', label: 'Trabajo físico', factor: 1.55 },
];

export const WEEKLY_LOSS_OPTIONS = [0.25, 0.5, 0.75] as const;

/** Un kilo de grasa corporal equivale a unas 7700 kcal. */
export const KCAL_PER_KG = 7700;
/** Piso de seguridad: la meta nunca baja de esto, aunque el déficit pedido sea mayor. */
export const MIN_DAILY_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

export interface EnergyProfile {
  sex: Sex;
  birth_date: string; // YYYY-MM-DD
  height_cm: number;
  goal_weight_kg: number;
  activity_level: ActivityLevel;
  weekly_loss_kg: number;
}

export function ageOn(birthIso: string, todayIso: string): number {
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Metabolismo basal (Mifflin-St Jeor), kcal/día. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161));
}

export function tdee(bmrKcal: number, level: ActivityLevel): number {
  const factor = ACTIVITY_LEVELS.find((l) => l.key === level)!.factor;
  return Math.round(bmrKcal * factor);
}

export interface DailyPlan {
  bmr: number;
  tdee: number;
  target: number;
  /** true si el piso de seguridad recortó el déficit pedido. */
  floored: boolean;
}

export function dailyPlan(p: EnergyProfile, weightKg: number, todayIso: string): DailyPlan {
  const base = bmr(p.sex, weightKg, p.height_cm, ageOn(p.birth_date, todayIso));
  const maintenance = tdee(base, p.activity_level);
  const wanted = Math.round(maintenance - (p.weekly_loss_kg * KCAL_PER_KG) / 7);
  const target = Math.max(wanted, MIN_DAILY_KCAL[p.sex]);
  return { bmr: base, tdee: maintenance, target, floored: target > wanted };
}

/** Semanas hasta el peso objetivo al ritmo elegido; null si ya llegó o no hay ritmo. */
export function weeksToGoal(currentKg: number, goalKg: number, weeklyLossKg: number): number | null {
  if (currentKg <= goalKg || weeklyLossKg <= 0) return null;
  return Math.ceil((currentKg - goalKg) / weeklyLossKg);
}

/** Kcal netas (sin contar el gasto en reposo, que ya está en la meta): (MET − 1) × kg × horas. */
export function kcalBurned(met: number, weightKg: number, minutes: number): number {
  return Math.max(Math.round((met - 1) * weightKg * (minutes / 60)), 0);
}

export interface Activity {
  key: string;
  label: string;
  met: number;
}

export const CARDIO_ACTIVITIES: Activity[] = [
  { key: 'walk_easy', label: 'Caminata tranquila', met: 3.0 },
  { key: 'walk_fast', label: 'Caminata rápida', met: 4.3 },
  { key: 'jog', label: 'Trote', met: 7.0 },
  { key: 'run', label: 'Correr', met: 9.8 },
  { key: 'bike', label: 'Bicicleta', met: 6.8 },
  { key: 'bike_indoor', label: 'Bicicleta fija', met: 7.0 },
  { key: 'swim', label: 'Natación', met: 6.0 },
  { key: 'elliptical', label: 'Elíptico', met: 5.0 },
  { key: 'rope', label: 'Soga', met: 11.0 },
  { key: 'dance', label: 'Baile', met: 5.0 },
  { key: 'soccer', label: 'Fútbol', met: 7.0 },
];

/** Fuerza con mancuernas y descansos entre series. */
export const STRENGTH_MET = 4.0;

export const cardioActivity = (key: string | null | undefined) => CARDIO_ACTIVITIES.find((a) => a.key === key) ?? null;

export type DayLevel = 'empty' | 'low' | 'ok' | 'close' | 'over';

export interface DayBalance {
  /** Meta del día más lo quemado entrenando. */
  budget: number;
  remaining: number;
  level: DayLevel;
}

export const DAY_LEVEL_LABELS: Record<DayLevel, string> = {
  empty: 'Sin registrar',
  low: 'Vas con poco',
  ok: 'Vas bien',
  close: 'Casi en el límite',
  over: 'Te pasaste',
};

export function dayBalance(eaten: number, target: number, burned: number): DayBalance {
  const budget = target + burned;
  const remaining = budget - eaten;
  const ratio = eaten / budget;
  const level: DayLevel = eaten === 0 ? 'empty' : ratio < 0.7 ? 'low' : ratio <= 1 ? 'ok' : ratio <= 1.1 ? 'close' : 'over';
  return { budget, remaining, level };
}

export interface MealItem {
  name: string;
  /** kcal de una porción. */
  kcal: number;
  qty: number;
}

export const itemsKcal = (items: MealItem[]) => Math.round(items.reduce((sum, i) => sum + i.kcal * i.qty, 0));
