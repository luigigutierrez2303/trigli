import { dailyBars, summarizeWeek, weekDays, weekWeightChange } from './dashboard';

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
});
