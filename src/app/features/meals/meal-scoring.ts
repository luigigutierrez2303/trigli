export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

/** Clave de un alimento o marca (ver FLAG_DEFS y LEGACY_FLAG_DEFS). */
export type MealFlag = string;

export type MealFlags = Partial<Record<MealFlag, boolean>>;

export interface FlagDef {
  key: MealFlag;
  label: string;
  hint: string;
  weight: number; // negativo = suma TG, positivo = ayuda
  alcohol?: boolean;
}

/** Marcas por grupo de la primera versión: ya no se ofrecen, pero los registros viejos las conservan y puntúan igual. */
export const LEGACY_FLAG_DEFS: readonly FlagDef[] = [
  { key: 'alcohol', label: 'Alcohol', hint: 'Cerveza, vino, fernet…', weight: -4 },
  { key: 'sugar', label: 'Bebidas azucaradas', hint: 'Gaseosa, jugo, licuado, energizante, mate o café con azúcar', weight: -3 },
  { key: 'sweets', label: 'Dulces y postres', hint: 'Facturas, alfajor, helado, dulce de leche, golosinas', weight: -2 },
  { key: 'refinedCarbs', label: 'Harinas refinadas', hint: 'Pan blanco, pasta, pizza, galletitas, arroz blanco', weight: -2 },
  { key: 'friedProcessed', label: 'Frito / ultraprocesado', hint: 'Milanesa frita, empanada frita, papas fritas, snacks, comida rápida', weight: -2 },
  { key: 'processedMeat', label: 'Fiambres y embutidos', hint: 'Salame, jamón, salchicha, chorizo, hamburguesa', weight: -1 },
  { key: 'bigPortion', label: 'Porción grande / repetí', hint: '', weight: -1 },
  { key: 'fattyMeat', label: 'Carne grasa', hint: 'Asado, achuras, costillar, panceta, cortes con mucha grasa', weight: -1 },
  { key: 'creamyCheese', label: 'Cremas / quesos grasos', hint: 'Manteca, crema, queso rallado de más', weight: -1 },
  { key: 'lateNight', label: 'Comida muy tarde', hint: 'Cena pasada la medianoche o picoteo nocturno', weight: -1 },
  { key: 'veggies', label: 'Verduras (½ plato)', hint: 'Ensalada, verduras cocidas, sopa de verduras', weight: 2 },
  { key: 'fattyFish', label: 'Pescado graso', hint: 'Salmón, caballa, sardina, atún, jurel (omega-3)', weight: 2 },
  { key: 'legumes', label: 'Legumbres', hint: 'Lentejas, garbanzos, porotos, arvejas', weight: 1 },
  { key: 'wholeGrains', label: 'Integrales', hint: 'Avena, arroz integral, pan integral', weight: 1 },
  { key: 'leanProtein', label: 'Proteína magra', hint: 'Pollo, pavo, huevo, pescado blanco, cortes magros', weight: 1 },
  { key: 'nuts', label: 'Frutos secos y semillas', hint: 'Nueces, almendras, chía, lino', weight: 1 },
  { key: 'healthyFats', label: 'Palta / aceite de oliva', hint: 'Como grasa principal de la comida', weight: 1 },
  { key: 'fruit', label: 'Fruta entera', hint: 'Con cáscara si se puede; sin jugo ni licuado', weight: 1 },
  { key: 'noSugarDrinks', label: 'Solo agua / sin azúcar', hint: 'Agua, soda, mate o té sin azúcar', weight: 1 },
];


const food = (key: string, label: string, hint: string, weight: number, alcohol = false): FlagDef =>
  ({ key, label, hint, weight, ...(alcohol ? { alcohol } : {}) });

/**
 * Catálogo de alimentos, cada uno con su puntaje según impacto en triglicéridos (alcohol, azúcares simples,
 * harinas refinadas y exceso calórico suben; omega-3, fibra y grasas insaturadas bajan). Ajustables.
 */
export const FLAG_DEFS: readonly FlagDef[] = [
  // Bebidas
  food('beer', 'Cerveza', 'Cualquier medida', -4, true),
  food('wine', 'Vino', 'Una copa o más', -3, true),
  food('spirits', 'Fernet / tragos', 'Fernet con cola, gin, whisky, aperitivos', -4, true),
  food('soda', 'Gaseosa', 'Común o light en exceso', -3),
  food('juice', 'Jugo o licuado', 'Envasado o exprimido', -3),
  food('energy', 'Energizante', '', -3),
  food('water', 'Agua / soda', '', 1),
  food('unsweetened', 'Mate / café / té sin azúcar', '', 1),
  // Panificados, harinas y cereales
  food('whiteBread', 'Pan blanco', 'Francés, de miga, lactal', -2),
  food('pasta', 'Pasta', 'Fideos, ñoquis, ravioles, lasagna', -2),
  food('pizza', 'Pizza / fugazzeta', '', -3),
  food('whiteRice', 'Arroz blanco', '', -1),
  food('cookies', 'Galletitas', 'Dulces o saladas', -2),
  food('pastries', 'Facturas / medialunas', '', -3),
  food('wholeBread', 'Pan integral / tostadas integrales', '', 1),
  food('oats', 'Avena', '', 1),
  food('brownRice', 'Arroz integral', '', 1),
  food('quinoa', 'Quinoa / cebada / trigo burgol', '', 1),
  // Fritos y ultraprocesados
  food('friedMilanesa', 'Milanesa frita', 'Carne o pollo', -2),
  food('friedEmpanada', 'Empanada frita', '', -2),
  food('bakedEmpanada', 'Empanada al horno', '', -1),
  food('fries', 'Papas fritas', '', -2),
  food('snacks', 'Snacks de bolsa', 'Papas, palitos, maní frito', -2),
  food('popcornHome', 'Pochoclo casero', 'Maíz pisingallo, poco aceite, sin azúcar ni manteca', 0),
  food('fastFood','Hamburguesa / comida rápida', '', -3),
  food('choripan', 'Choripán / pancho', '', -3),
  // Carnes, pescados y huevo
  food('grill', 'Asado / achuras', 'Costillar, vacío, chinchulines, morcilla', -2),
  food('fattyCut', 'Carne grasa', 'Bondiola, costillitas de cerdo', -1),
  food('coldCuts', 'Fiambres', 'Salame, jamón, mortadela, paleta', -2),
  food('sausage', 'Chorizo / salchicha', '', -2),
  food('chicken', 'Pollo sin piel', 'Hervido, al horno o a la plancha', 1),
  food('turkey', 'Pavo', '', 1),
  food('leanBeef', 'Carne magra', 'Peceto, nalga, cuadril, lomo', 1),
  food('egg', 'Huevo', '', 1),
  food('whiteFish', 'Merluza / pescado blanco', '', 1),
  food('canTuna', 'Atún en lata', 'Al natural', 1),
  food('salmon', 'Salmón', '', 2),
  food('sardines', 'Sardinas / caballa / jurel', '', 2),
  // Lácteos y grasas
  food('creamCheese', 'Quesos cremosos / crema', 'Queso rallado en exceso, crema, queso azul', -1),
  food('butter', 'Manteca', '', -1),
  food('freshCheese', 'Queso fresco / ricota', '', 0),
  food('yogurt', 'Yogur natural', 'Sin azúcar', 1),
  food('avocado', 'Palta', '', 1),
  food('oliveOil', 'Aceite de oliva', 'Como aderezo', 1),
  food('nutsSeeds', 'Frutos secos', 'Nueces, almendras, castañas', 1),
  food('seeds', 'Semillas', 'Chía, lino, girasol', 1),
  // Verduras, legumbres y frutas
  food('salad', 'Ensalada', 'Hojas verdes, tomate, zanahoria, etc.', 2),
  food('cookedVeg', 'Verduras cocidas', 'Zapallo, brócoli, berenjena, espinaca', 2),
  food('lentils', 'Lentejas / garbanzos / porotos', '', 1),
  food('wholeFruit', 'Fruta entera', 'Con cáscara si se puede', 1),
  food('potatoSweet', 'Papa / batata / choclo', 'Hervida o al horno', 0),
  // Dulces
  food('iceCream', 'Helado', '', -2),
  food('alfajor', 'Alfajor / chocolate con leche', '', -3),
  food('dulceLeche', 'Dulce de leche / mermelada', '', -2),
  food('cake', 'Torta / postre / flan', '', -3),
  food('candy', 'Golosinas', '', -3),
  food('darkChoc', 'Chocolate amargo', 'Hasta 2 cuadraditos', 0),
  // Cómo comiste
  food('bigPortionMeal', 'Porción grande / repetí', '', -1),
  food('lateMeal', 'Comida muy tarde', 'Pasada la medianoche o picoteo nocturno', -1),
];

/** Todo lo que puede puntuar: el catálogo actual más las marcas viejas. */
export const ALL_FLAG_DEFS: readonly FlagDef[] = [...FLAG_DEFS, ...LEGACY_FLAG_DEFS];

export function hasAlcohol(flags: MealFlags): boolean {
  return ALL_FLAG_DEFS.some((f) => flags[f.key] && (f.alcohol || f.key === 'alcohol'));
}

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
  const delta = ALL_FLAG_DEFS.reduce((acc, f) => acc + (flags[f.key] ? f.weight : 0), 0);
  return Math.max(MIN, Math.min(MAX, BASE + delta));
}

/** Una comida sin alimentos, marcas ni notas no dice nada: no se guarda (y si existía, se borra). */
export function isEmptyMeal(flags: MealFlags, itemCount: number, notes: string | null): boolean {
  return itemCount === 0 && !notes?.trim() && !Object.values(flags).some(Boolean);
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
