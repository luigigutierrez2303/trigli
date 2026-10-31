import { describe, expect, it } from 'vitest';
import { ALL_FLAG_DEFS } from '../meals/meal-scoring';
import { FOOD_CATEGORIES, FOODS } from './foods';

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
});
