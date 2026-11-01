import { describe, expect, it } from 'vitest';
import { ALL_FLAG_DEFS } from '../meals/meal-scoring';
import { flagsOfItems, FOOD_CATEGORIES, FOODS, mergeCatalog, UserFood } from './foods';

describe('foods', () => {
  it('no repite nombres (se usan para derivar la calidad)', () => {
    const names = FOODS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('cada marca de calidad existe en el catálogo de puntaje', () => {
    const keys = new Set(ALL_FLAG_DEFS.map((d) => d.key));
    for (const food of FOODS.filter((f) => f.flag)) expect(keys.has(food.flag!), food.name).toBe(true);
  });

  it('usa solo categorías conocidas y valores razonables', () => {
    for (const f of FOODS) {
      expect(FOOD_CATEGORIES, f.name).toContain(f.cat);
      expect(f.kcal, f.name).toBeGreaterThanOrEqual(0);
      expect(f.kcal, f.name).toBeLessThanOrEqual(1000);
      expect(f.protein, f.name).toBeGreaterThanOrEqual(0);
    }
  });

  it('toma los gramos de la porción cuando están indicados', () => {
    const byName = (n: string) => FOODS.find((f) => f.name === n)!;
    expect(byName('Lomo').grams).toBe(100);
    expect(byName('Peceto').grams).toBe(150);
    expect(byName('Huevo').grams).toBeUndefined();
  });

  it('tiene los cortes de carne cargados por 100 g', () => {
    const cuts = FOODS.filter((f) => f.cat === 'Carnes' && f.portion === '100 g');
    expect(cuts.length).toBeGreaterThanOrEqual(20);
  });

  describe('mergeCatalog', () => {
    const mine = (over: Partial<UserFood>): UserFood => ({ name: 'Mi plato', cat: 'Platos y comidas', portion: '1 porción', kcal: 300, protein: 10, hidden: false, ...over });

    it('suma los alimentos propios al catálogo', () => {
      const merged = mergeCatalog(FOODS, [mine({})]);
      expect(merged).toHaveLength(FOODS.length + 1);
      expect(merged.find((f) => f.name === 'Mi plato')).not.toHaveProperty('hidden');
    });

    it('lo propio pisa al base con el mismo nombre', () => {
      const merged = mergeCatalog(FOODS, [mine({ name: 'Huevo', kcal: 90 })]);
      expect(merged.filter((f) => f.name === 'Huevo')).toHaveLength(1);
      expect(merged.find((f) => f.name === 'Huevo')!.kcal).toBe(90);
    });

    it('oculta el alimento base marcado como oculto', () => {
      const merged = mergeCatalog(FOODS, [mine({ name: 'Huevo', hidden: true })]);
      expect(merged.some((f) => f.name === 'Huevo')).toBe(false);
    });

    it('deriva las marcas de calidad desde el catálogo fusionado', () => {
      const merged = mergeCatalog(FOODS, [mine({ name: 'Mi ensalada', flag: 'salad' })]);
      expect(flagsOfItems(['Mi ensalada'], merged)).toEqual({ salad: true });
    });
  });
});
