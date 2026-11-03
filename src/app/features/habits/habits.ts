import { toIsoDate } from '../../core/date';
import { hasAlcohol, MealFlags } from '../meals/meal-scoring';

/** Marcas de omega-3 (pescado graso). */
export const FISH_FLAGS: readonly string[] = ['salmon', 'sardines', 'fattyFish'];
/** Marcas que aportan fibra: verduras, legumbres, fruta entera, integrales, semillas y frutos secos. */
export const FIBER_FLAGS: readonly string[] = [
  'salad', 'cookedVeg', 'lentils', 'wholeFruit', 'oats', 'wholeBread', 'brownRice', 'quinoa', 'seeds', 'nutsSeeds',
  'veggies', 'legumes', 'wholeGrains', 'nuts', 'fruit',
];
/** Azúcares simples: bebidas azucaradas y dulces. */
export const SUGAR_FLAGS: readonly string[] = [
  'soda', 'juice', 'energy', 'iceCream', 'alfajor', 'dulceLeche', 'cake', 'candy', 'pastries', 'cookies', 'sugar', 'sweets',
];

export const FISH_WEEKLY_TARGET = 2;
/** Un día "con fibra" tiene al menos dos comidas con alguna marca de fibra. */
export const FIBER_MEALS_PER_DAY = 2;
export const FIBER_DAYS_TARGET = 5;

export interface HabitMeal {
  date: string;
  flags: MealFlags;
}

export interface WeekHabits {
  /** Días de la semana ya transcurridos (hasta hoy), de 1 a 7. */
  elapsedDays: number;
  loggedDays: number;
  fishDays: number;
  fiberDays: number;
  alcoholDays: number;
  sugarDays: number;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

const anyFlag = (flags: MealFlags, keys: readonly string[]) => keys.some((k) => flags[k]);

/** Hábitos de la semana que empieza en `monday`: días con cada factor (los que más suben o bajan los TG). */
export function weekHabits(monday: string, today: string, meals: readonly HabitMeal[]): WeekHabits {
  const sunday = addDays(monday, 6);
  const last = today < sunday ? today : sunday;
  const elapsedDays = last < monday ? 0 : Math.round((Date.parse(last) - Date.parse(monday)) / 86_400_000) + 1;
  const days = new Map<string, { fiber: number; fish: boolean; alcohol: boolean; sugar: boolean }>();
  for (const m of meals) {
    if (m.date < monday || m.date > sunday) continue;
    const d = days.get(m.date) ?? { fiber: 0, fish: false, alcohol: false, sugar: false };
    if (anyFlag(m.flags, FIBER_FLAGS)) d.fiber++;
    if (anyFlag(m.flags, FISH_FLAGS)) d.fish = true;
    if (hasAlcohol(m.flags)) d.alcohol = true;
    if (anyFlag(m.flags, SUGAR_FLAGS)) d.sugar = true;
    days.set(m.date, d);
  }
  const all = [...days.values()];
  return {
    elapsedDays: Math.min(7, Math.max(0, elapsedDays)),
    loggedDays: all.length,
    fishDays: all.filter((d) => d.fish).length,
    fiberDays: all.filter((d) => d.fiber >= FIBER_MEALS_PER_DAY).length,
    alcoholDays: all.filter((d) => d.alcohol).length,
    sugarDays: all.filter((d) => d.sugar).length,
  };
}

/** Una sugerencia concreta para lo que queda de la semana, o null si no hay nada que marcar. */
export function weekSuggestion(h: WeekHabits, cardioMin: number, goalMin: number): string | null {
  if (h.loggedDays === 0) return null;
  const left = 7 - h.elapsedDays;
  if (h.alcoholDays >= 2) return `Tomaste alcohol ${h.alcoholDays} días: es lo que más sube los triglicéridos. Probá dejarlo lo que resta de la semana.`;
  if (h.sugarDays >= 3) return `Hubo azúcar o dulces ${h.sugarDays} días. Cambiá gaseosa o jugo por agua o soda.`;
  if (h.fishDays < FISH_WEEKLY_TARGET && left <= 3) {
    return `Te falta${FISH_WEEKLY_TARGET - h.fishDays > 1 ? 'n' : ''} ${FISH_WEEKLY_TARGET - h.fishDays} ${FISH_WEEKLY_TARGET - h.fishDays > 1 ? 'comidas' : 'comida'} con pescado graso (salmón, sardinas, caballa) para llegar a ${FISH_WEEKLY_TARGET}.`;
  }
  const missing = goalMin - cardioMin;
  if (missing > 0 && left <= 3) return `Te faltan ${missing} min de aeróbico: ${Math.ceil(missing / Math.max(left, 1))} min por día alcanzan.`;
  if (h.fiberDays < Math.min(FIBER_DAYS_TARGET, h.elapsedDays)) return 'Sumá verduras, legumbres o fruta en al menos dos comidas por día: la fibra baja los triglicéridos.';
  return null;
}

export interface PeriodData {
  meals: readonly (HabitMeal & { score: number })[];
  workouts: readonly { date: string; type: 'cardio' | 'strength'; duration_min: number }[];
  metrics: readonly { date: string; weight_kg: number }[];
}

export interface PeriodStats {
  weeks: number;
  cardioMinPerWeek: number;
  avgScore: number | null;
  alcoholDaysPerWeek: number;
  fishDaysPerWeek: number;
  weightChange: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Promedios por semana de lo que pasó entre dos análisis (`from` a `to`, ambos inclusive). */
export function periodStats(from: string, to: string, data: PeriodData): PeriodStats {
  const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1);
  const weeks = days / 7;
  const inRange = (d: string) => d >= from && d <= to;
  const meals = data.meals.filter((m) => inRange(m.date));
  const byDay = (pred: (f: MealFlags) => boolean) => new Set(meals.filter((m) => pred(m.flags)).map((m) => m.date)).size;
  const cardio = data.workouts.filter((w) => inRange(w.date) && w.type === 'cardio').reduce((s, w) => s + w.duration_min, 0);
  const weights = data.metrics.filter((m) => inRange(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  return {
    weeks: round1(weeks),
    cardioMinPerWeek: Math.round(cardio / weeks),
    avgScore: meals.length ? Math.round((meals.reduce((s, m) => s + m.score, 0) / meals.length) * 10) : null,
    alcoholDaysPerWeek: round1(byDay(hasAlcohol) / weeks),
    fishDaysPerWeek: round1(byDay((f) => anyFlag(f, FISH_FLAGS)) / weeks),
    weightChange: weights.length >= 2 ? round1(weights.at(-1)!.weight_kg - weights[0].weight_kg) : null,
  };
}
