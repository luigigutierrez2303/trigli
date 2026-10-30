export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type MealFlag =
  | 'alcohol'
  | 'sugar'
  | 'refinedCarbs'
  | 'friedProcessed'
  | 'bigPortion'
  | 'veggies'
  | 'legumes'
  | 'fattyFish'
  | 'wholeGrains'
  | 'leanProtein';

export type MealFlags = Partial<Record<MealFlag, boolean>>;

export interface FlagDef {
  key: MealFlag;
  label: string;
  hint: string;
  weight: number; // negativo = suma TG, positivo = ayuda
}

/** Pesos según impacto en triglicéridos. Ajustables. */
export const FLAG_DEFS: readonly FlagDef[] = [
  { key: 'alcohol', label: 'Alcohol', hint: 'Cerveza, vino, fernet…', weight: -4 },
  { key: 'sugar', label: 'Azúcar / bebidas azucaradas', hint: 'Gaseosa, jugo, postre, facturas', weight: -3 },
  { key: 'refinedCarbs', label: 'Harinas refinadas', hint: 'Pan blanco, pasta, pizza, galletitas', weight: -2 },
  { key: 'friedProcessed', label: 'Frito / ultraprocesado', hint: 'Papas fritas, embutidos, snacks', weight: -2 },
  { key: 'bigPortion', label: 'Porción grande / repetí', hint: '', weight: -1 },
  { key: 'veggies', label: 'Verduras (½ plato)', hint: '', weight: 2 },
  { key: 'fattyFish', label: 'Pescado graso', hint: 'Salmón, caballa, sardina, atún', weight: 2 },
  { key: 'legumes', label: 'Legumbres', hint: 'Lentejas, garbanzos, porotos', weight: 1 },
  { key: 'wholeGrains', label: 'Integrales', hint: 'Avena, arroz integral, pan integral', weight: 1 },
  { key: 'leanProtein', label: 'Proteína magra', hint: 'Pollo, huevo, carne magra', weight: 1 },
];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  snack: 'Merienda',
  dinner: 'Cena',
};

export const MEAL_ORDER: readonly MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

const BASE = 6;
const MIN = 0;
const MAX = 10;

/** Score de una comida, 0-10. Base 6 + pesos de los flags marcados. */
export function scoreMeal(flags: MealFlags): number {
  const delta = FLAG_DEFS.reduce((acc, f) => acc + (flags[f.key] ? f.weight : 0), 0);
  return Math.max(MIN, Math.min(MAX, BASE + delta));
}

/** Score diario 0-100: promedio de comidas registradas * 10. null si no hay comidas. */
export function scoreDay(mealScores: readonly number[]): number | null {
  if (mealScores.length === 0) return null;
  const avg = mealScores.reduce((a, b) => a + b, 0) / mealScores.length;
  return Math.round(avg * 10);
}

export type ScoreLevel = 'good' | 'warn' | 'bad';

export function levelForDay(score: number): ScoreLevel {
  if (score >= 70) return 'good';
  if (score >= 40) return 'warn';
  return 'bad';
}

export function levelForMeal(score: number): ScoreLevel {
  return levelForDay(score * 10);
}
