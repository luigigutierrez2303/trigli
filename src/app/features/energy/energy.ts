export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate';

/** Actividad del día a día SIN contar los entrenamientos: esos se suman aparte al registrarlos. */
export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; factor: number }[] = [
  { key: 'sedentary', label: 'Sentado casi todo el día', factor: 1.2 },
  { key: 'light', label: 'Camino o estoy de pie bastante', factor: 1.375 },
  { key: 'moderate', label: 'Trabajo físico', factor: 1.55 },
];

export const LOSS_PACES = [
  { value: 0.25, name: 'Suave' },
  { value: 0.5, name: 'Moderado' },
  { value: 0.75, name: 'Rápido' },
] as const;

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
  /** Proteína (g) de una porción; ausente en lo cargado a mano o antes de existir el dato. */
  protein?: number;
  /** Gramos de una porción, si se conocen: la cantidad también se puede dar en gramos. */
  refGrams?: number;
  /** Cuántas porciones; puede ser fraccionaria (150 g de una porción de 100 g = 1,5). */
  qty: number;
}

export const itemsKcal = (items: MealItem[]) => Math.round(items.reduce((sum, i) => sum + i.kcal * i.qty, 0));
export const itemsProtein = (items: MealItem[]) => Math.round(items.reduce((sum, i) => sum + (i.protein ?? 0) * i.qty, 0));

/** Suma `extra` a `base`: un alimento que ya está (mismo nombre y valores) acumula porciones en vez de repetirse. */
export function mergeItems(base: MealItem[], extra: MealItem[]): MealItem[] {
  const out = base.map((i) => ({ ...i }));
  for (const item of extra) {
    const same = out.find((i) => i.name === item.name && i.kcal === item.kcal && i.protein === item.protein);
    if (same) same.qty = Math.round((same.qty + item.qty) * 1000) / 1000;
    else out.push({ ...item });
  }
  return out;
}

/** Proteína diaria para cuidar el músculo mientras se baja de peso: ~1,6 g por kg. */
export const proteinGoal = (weightKg: number) => Math.round(weightKg * 1.6);

export interface WeightPoint {
  date: string;
  kg: number;
}

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);

/** Promedio móvil: cada punto promedia los pesos de los 7 días que terminan en su fecha. */
export function smoothWeights(points: WeightPoint[], windowDays = 7): WeightPoint[] {
  return points.map((p) => {
    const window = points.filter((q) => daysBetween(q.date, p.date) >= 0 && daysBetween(q.date, p.date) < windowDays);
    return { date: p.date, kg: Math.round((window.reduce((sum, q) => sum + q.kg, 0) / window.length) * 10) / 10 };
  });
}

/**
 * Fecha estimada para llegar al peso objetivo si seguís bajando al ritmo dado (kg por semana, negativo = bajando).
 * null si ya llegaste, si no estás bajando o si queda a más de dos años.
 */
export function projectGoal(currentKg: number, goalKg: number, ratePerWeek: number, fromIso: string): string | null {
  if (currentKg <= goalKg || ratePerWeek >= 0) return null;
  const weeks = (currentKg - goalKg) / -ratePerWeek;
  if (weeks > 104) return null;
  const d = new Date(fromIso + 'T12:00:00');
  d.setDate(d.getDate() + Math.ceil(weeks * 7));
  return d.toISOString().slice(0, 10);
}

export type TrendStatus = 'insufficient' | 'gaining' | 'stalled' | 'on_track' | 'fast';

export interface WeightTrend {
  status: TrendStatus;
  /** kg por semana; negativo = bajando. null si faltan datos. */
  ratePerWeek: number | null;
  smoothed: WeightPoint[];
}

export const TREND_MESSAGES: Record<TrendStatus, string> = {
  insufficient: 'Pesate al menos dos veces con una semana de diferencia para ver tu tendencia.',
  gaining: 'Tu peso viene subiendo. Revisá las porciones y los extras de la semana.',
  stalled: 'Estás estancado hace un par de semanas. Es normal: revisá que estés registrando todo.',
  on_track: 'Vas bajando a un ritmo saludable. Seguí así.',
  fast: 'Estás bajando muy rápido. Comé un poco más para no perder músculo.',
};

/**
 * Tendencia sobre el peso suavizado (el dato diario fluctúa por agua y comida).
 * Necesita al menos 7 días entre la primera y la última medición; "muy rápido" y "estancado" piden 14,
 * porque en menos tiempo el agua mueve el peso más que la grasa.
 */
export function weightTrend(points: WeightPoint[]): WeightTrend {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const smoothed = smoothWeights(sorted);
  if (sorted.length < 2) return { status: 'insufficient', ratePerWeek: null, smoothed };
  const first = smoothed[0];
  const last = smoothed[smoothed.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days < 7) return { status: 'insufficient', ratePerWeek: null, smoothed };

  const rate = Math.round(((last.kg - first.kg) / (days / 7)) * 100) / 100;
  const loss = -rate;
  const status: TrendStatus =
    loss > last.kg * 0.01 && days >= 14 ? 'fast' : loss >= 0.1 ? 'on_track' : rate > 0.1 ? 'gaining' : days >= 14 ? 'stalled' : 'on_track';
  return { status, ratePerWeek: rate, smoothed };
}

export interface WeekDay {
  eaten: number;
  burned: number;
}

export interface WeekEnergy {
  daysLogged: number;
  /** Días registrados en los que no te pasaste de tu presupuesto. */
  daysOnTarget: number;
  /** Déficit real acumulado: gasto de mantenimiento + ejercicio − lo comido, solo en días registrados. */
  deficitKcal: number;
  estimatedKg: number;
}

export function weekEnergy(days: WeekDay[], target: number, maintenance: number): WeekEnergy {
  const logged = days.filter((d) => d.eaten > 0);
  const deficitKcal = logged.reduce((sum, d) => sum + (maintenance + d.burned - d.eaten), 0);
  return {
    daysLogged: logged.length,
    daysOnTarget: logged.filter((d) => d.eaten <= (target + d.burned) * 1.1).length,
    deficitKcal,
    estimatedKg: Math.round((deficitKcal / KCAL_PER_KG) * 100) / 100,
  };
}
