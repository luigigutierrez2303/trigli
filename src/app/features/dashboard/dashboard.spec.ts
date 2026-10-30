import { dailyBars, summarizeWeek, weekDays, weekGrid, weekWeightChange } from './dashboard';

describe('dashboard', () => {
  it('week has 7 days starting Monday', () => {
    const days = weekDays('2026-10-26');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-10-26');
    expect(days[6]).toBe('2026-11-01');
  });

  it('summarizes the week', () => {
    const s = summarizeWeek(
      [{ date: 'a', score: 60 }, { date: 'b', score: 80 }],
      [
        { type: 'cardio', duration_min: 30 },
        { type: 'cardio', duration_min: 40 },
        { type: 'strength', duration_min: 45 },
      ],
    );
    expect(s).toEqual({ avgScore: 70, daysLogged: 2, cardioMin: 70, strengthSessions: 1 });
  });

  it('empty week has no average', () => {
    expect(summarizeWeek([], []).avgScore).toBeNull();
  });

  it('weight change needs two points', () => {
    expect(weekWeightChange([83, 82.4])).toBe(-0.6);
    expect(weekWeightChange([83])).toBeNull();
  });

  it('bars leave unlogged days empty', () => {
    const bars = dailyBars('2026-10-26', [{ date: '2026-10-27', score: 80 }]);
    expect(bars[0].score).toBeNull();
    expect(bars[1].score).toBe(80);
  });

  describe('weekGrid', () => {
    const empty = { meals: [], workouts: [], metrics: [] };

    it('has 7 columns and flags today and future days', () => {
      const grid = weekGrid('2026-10-26', '2026-10-30', empty);
      expect(grid).toHaveLength(7);
      expect(grid.map((d) => d.isToday)).toEqual([false, false, false, false, true, false, false]);
      expect(grid.map((d) => d.isFuture)).toEqual([false, false, false, false, false, true, true]);
    });

    it('empty week has nothing filled in', () => {
      const day = weekGrid('2026-10-26', '2026-10-30', empty)[0];
      expect(day.dayScore).toBeNull();
      expect(day.dayLevel).toBeNull();
      expect(day.cardioMin).toBeNull();
      expect(day.strengthMin).toBeNull();
      expect(day.weightKg).toBeNull();
      expect(Object.values(day.meals).every((m) => m === null)).toBe(true);
    });

    it('scores each meal, the day and marks alcohol', () => {
      const grid = weekGrid('2026-10-26', '2026-10-30', {
        ...empty,
        meals: [
          { date: '2026-10-27', meal_type: 'lunch', score: 8, flags: {} },
          { date: '2026-10-27', meal_type: 'dinner', score: 2, flags: { alcohol: true } },
        ],
      });
      const tue = grid[1];
      expect(tue.meals.lunch).toEqual({ score: 8, level: 'good', alcohol: false });
      expect(tue.meals.dinner).toEqual({ score: 2, level: 'bad', alcohol: true });
      expect(tue.meals.breakfast).toBeNull();
      expect(tue.dayScore).toBe(50);
      expect(tue.dayLevel).toBe('warn');
      expect(grid[0].dayScore).toBeNull();
    });

    it('adds up workouts by day and type', () => {
      const grid = weekGrid('2026-10-26', '2026-10-30', {
        ...empty,
        workouts: [
          { date: '2026-10-28', type: 'cardio', duration_min: 30 },
          { date: '2026-10-28', type: 'cardio', duration_min: 20 },
          { date: '2026-10-28', type: 'strength', duration_min: 45 },
          { date: '2026-10-29', type: 'cardio', duration_min: 15 },
        ],
      });
      expect(grid[2].cardioMin).toBe(50);
      expect(grid[2].strengthMin).toBe(45);
      expect(grid[3].cardioMin).toBe(15);
      expect(grid[3].strengthMin).toBeNull();
    });

    it('picks the weight of the matching day', () => {
      const grid = weekGrid('2026-10-26', '2026-10-30', {
        ...empty,
        metrics: [{ date: '2026-10-26', weight_kg: 84.2 }],
      });
      expect(grid[0].weightKg).toBe(84.2);
      expect(grid[1].weightKg).toBeNull();
    });

    it('ignores data from outside the week', () => {
      const grid = weekGrid('2026-10-26', '2026-10-30', {
        meals: [{ date: '2026-10-25', meal_type: 'lunch', score: 9, flags: {} }],
        workouts: [{ date: '2026-11-02', type: 'cardio', duration_min: 30 }],
        metrics: [],
      });
      expect(grid.every((d) => d.dayScore === null && d.cardioMin === null)).toBe(true);
    });
  });
});
