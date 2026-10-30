import { levelForDay, scoreDay, scoreMeal } from './meal-scoring';

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
