import { periodStats, weekHabits, weekSuggestion } from './habits';

const meal = (date: string, ...flags: string[]) => ({ date, flags: Object.fromEntries(flags.map((f) => [f, true])) });

describe('habits', () => {
  const monday = '2026-11-02';

  it('cuenta días con cada factor y los días transcurridos', () => {
    const h = weekHabits(monday, '2026-11-04', [
      meal('2026-11-02', 'salad', 'lentils', 'beer'),
      meal('2026-11-02', 'soda'),
      meal('2026-11-03', 'salmon', 'cookedVeg'),
      meal('2026-11-03', 'wholeFruit'),
      meal('2026-10-30', 'beer'),
    ]);
    expect(h).toEqual({ elapsedDays: 3, loggedDays: 2, fishDays: 1, fiberDays: 1, alcoholDays: 1, sugarDays: 1 });
  });

  it('semana pasada: 7 días transcurridos', () => {
    expect(weekHabits(monday, '2026-12-01', []).elapsedDays).toBe(7);
  });

  it('prioriza alcohol en la sugerencia', () => {
    const h = { elapsedDays: 4, loggedDays: 4, fishDays: 0, fiberDays: 4, alcoholDays: 2, sugarDays: 0 };
    expect(weekSuggestion(h, 0, 150)).toContain('alcohol');
  });

  it('sin registros no sugiere nada', () => {
    expect(weekSuggestion({ elapsedDays: 2, loggedDays: 0, fishDays: 0, fiberDays: 0, alcoholDays: 0, sugarDays: 0 }, 0, 150)).toBeNull();
  });

  it('pide pescado cuando quedan pocos días', () => {
    const h = { elapsedDays: 5, loggedDays: 5, fishDays: 1, fiberDays: 5, alcoholDays: 0, sugarDays: 0 };
    expect(weekSuggestion(h, 150, 150)).toContain('1 comida con pescado');
  });

  it('periodStats promedia por semana entre dos análisis', () => {
    const s = periodStats('2026-10-05', '2026-10-18', {
      meals: [
        { ...meal('2026-10-06', 'beer'), score: 4 },
        { ...meal('2026-10-07', 'salmon'), score: 8 },
        { ...meal('2026-10-30', 'beer'), score: 0 },
      ],
      workouts: [{ date: '2026-10-08', type: 'cardio', duration_min: 140 }, { date: '2026-10-09', type: 'strength', duration_min: 45 }],
      metrics: [{ date: '2026-10-05', weight_kg: 85 }, { date: '2026-10-18', weight_kg: 83.5 }],
    });
    expect(s).toEqual({ weeks: 2, cardioMinPerWeek: 70, avgScore: 60, alcoholDaysPerWeek: 0.5, fishDaysPerWeek: 0.5, weightChange: -1.5 });
  });
});
