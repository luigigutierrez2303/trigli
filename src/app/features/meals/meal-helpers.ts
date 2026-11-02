import { toIsoDate } from '../../core/date';
import { MealItem } from '../energy/energy';
import { Food } from '../energy/foods';
import { ALL_FLAG_DEFS, MealType } from './meal-scoring';

/** Lo mínimo de una comida registrada que hace falta para aprender de la historia. */
export interface HistoryMeal {
  date: string;
  meal_type: MealType;
  items: MealItem[];
}

/** Porciones que se ofrecen con un toque. */
export const QTY_CHOICES = [0.5, 1, 1.5, 2] as const;

/** Los alimentos que más cargó el usuario en ese tipo de comida, con los valores de la última vez. */
export function frequentItems(history: readonly HistoryMeal[], type: MealType, limit = 8): MealItem[] {
  const seen = new Map<string, { count: number; date: string; item: MealItem }>();
  for (const meal of history) {
    if (meal.meal_type !== type) continue;
    for (const item of meal.items ?? []) {
      const prev = seen.get(item.name);
      const newer = !prev || meal.date >= prev.date;
      seen.set(item.name, { count: (prev?.count ?? 0) + 1, date: newer ? meal.date : prev!.date, item: newer ? item : prev!.item });
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || b.date.localeCompare(a.date) || a.item.name.localeCompare(b.item.name, 'es'))
    .slice(0, limit)
    .map((s) => ({ ...s.item }));
}

const dayBefore = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return toIsoDate(d);
};

/** Días seguidos con alguna comida registrada. Si hoy todavía no registró nada, la racha cuenta desde ayer. */
export function streakDays(dates: readonly string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : dayBefore(today);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = dayBefore(cursor);
  }
  return n;
}

const NEGATIVE_FLAGS = new Set(ALL_FLAG_DEFS.filter((f) => f.weight < 0).map((f) => f.key as string));

/** Alimentos con buena proteína por caloría que entran en lo que queda del día. Vacío si falta poco. */
export function suggestProtein(catalog: readonly Food[], remainingKcal: number, missingProtein: number, limit = 3): Food[] {
  if (missingProtein < 15 || remainingKcal < 80) return [];
  return catalog
    .filter((f) => f.cat !== 'Bebidas' && f.protein >= 8 && f.kcal > 0 && f.kcal <= remainingKcal && !(f.flag && NEGATIVE_FLAGS.has(f.flag)))
    .sort((a, b) => b.protein / b.kcal - a.protein / a.kcal || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit);
}
