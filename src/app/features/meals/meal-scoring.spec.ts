import { ALL_FLAG_DEFS, FLAG_DEFS, hasAlcohol, isEmptyMeal, levelForDay, scoreDay, scoreMeal } from './meal-scoring';

describe('meal scoring', () => {
  it('neutral meal scores the base', () => {
    expect(scoreMeal({})).toBe(6);
  });

  it('healthy meal is capped at 10', () => {
    expect(scoreMeal({ veggies: true, fattyFish: true, legumes: true, wholeGrains: true, leanProtein: true })).toBe(10);
  });

  it('alcohol + sugar + refined carbs bottoms out at 0', () => {
    expect(scoreMeal({ alcohol: true, sugar: true, refinedCarbs: true })).toBe(0);
  });

  it('mixed meal adds weights', () => {
    // 6 - 2 (pasta) + 2 (verduras) + 1 (pollo)
    expect(scoreMeal({ refinedCarbs: true, veggies: true, leanProtein: true })).toBe(7);
  });

  it('ignores false flags', () => {
    expect(scoreMeal({ alcohol: false, veggies: true })).toBe(8);
  });

  it('new flags weigh in', () => {
    expect(scoreMeal({ fattyMeat: true, lateNight: true })).toBe(4);
    expect(scoreMeal({ nuts: true, fruit: true, noSugarDrinks: true })).toBe(9);
  });

  it('sweets and processed meat cost more than a neutral meal', () => {
    expect(scoreMeal({ sweets: true })).toBe(4);
    expect(scoreMeal({ processedMeat: true })).toBe(5);
    expect(scoreMeal({ healthyFats: true })).toBe(7);
  });

  it('every food has a unique key', () => {
    const keys = ALL_FLAG_DEFS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(FLAG_DEFS.length).toBeGreaterThan(40);
  });

  it('scores individual foods', () => {
    expect(scoreMeal({ salmon: true, salad: true })).toBe(10);
    expect(scoreMeal({ pizza: true, beer: true })).toBe(0);
    expect(scoreMeal({ friedMilanesa: true, fries: true, soda: true })).toBe(0);
    expect(scoreMeal({ chicken: true, cookedVeg: true })).toBe(9);
  });

  it('detects alcohol in new foods and old records', () => {
    expect(hasAlcohol({ wine: true })).toBe(true);
    expect(hasAlcohol({ alcohol: true })).toBe(true);
    expect(hasAlcohol({ salad: true })).toBe(false);
  });

  it('day score averages meals * 10', () => {
    expect(scoreDay([8, 6, 4])).toBe(60);
    expect(scoreDay([])).toBeNull();
  });

  it('levels', () => {
    expect(levelForDay(70)).toBe('good');
    expect(levelForDay(69)).toBe('warn');
    expect(levelForDay(39)).toBe('bad');
  });
});

describe('isEmptyMeal', () => {
  it('es vacía sin alimentos, marcas ni notas', () => {
    expect(isEmptyMeal({}, 0, null)).toBe(true);
    expect(isEmptyMeal({ salad: false }, 0, '  ')).toBe(true);
  });

  it('deja de ser vacía con alimentos, una marca o una nota', () => {
    expect(isEmptyMeal({}, 1, null)).toBe(false);
    expect(isEmptyMeal({ salad: true }, 0, null)).toBe(false);
    expect(isEmptyMeal({}, 0, 'cena liviana')).toBe(false);
  });
});
