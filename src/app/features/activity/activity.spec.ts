import {
  burnedKcal, cardioProgress, compareWeeks, metricPoints, isValidMinutes, isValidWaist, isValidWeight, parseDecimal, topCombos, weekEnd, weekStart, weightDelta,
} from './activity';

describe('activity', () => {
  it('week starts on Monday', () => {
    expect(weekStart('2026-10-30')).toBe('2026-10-26'); // viernes
    expect(weekStart('2026-10-26')).toBe('2026-10-26'); // lunes
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // domingo
  });

  it('week ends on Sunday', () => {
    expect(weekEnd('2026-10-30')).toBe('2026-11-01');
  });

  it('cardio progress is capped at 100%', () => {
    expect(cardioProgress(75)).toEqual({ minutes: 75, pct: 50, remaining: 75, done: false });
    expect(cardioProgress(200)).toEqual({ minutes: 200, pct: 100, remaining: 0, done: true });
  });

  it('parses decimals with comma or dot', () => {
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal(' 82.5 ')).toBe(82.5);
    expect(parseDecimal(70)).toBe(70);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal(null)).toBeNull();
  });

  it('validates ranges', () => {
    expect(isValidWeight(82.5)).toBe(true);
    expect(isValidWeight(5)).toBe(false);
    expect(isValidWeight(null)).toBe(false);
    expect(isValidWaist(95)).toBe(true);
    expect(isValidWaist(10)).toBe(false);
    expect(isValidMinutes(30)).toBe(true);
    expect(isValidMinutes(0)).toBe(false);
    expect(isValidMinutes(30.5)).toBe(false);
  });

  it('weight delta rounds to one decimal', () => {
    expect(weightDelta(82.4, 83)).toBe(-0.6);
    expect(weightDelta(82, null)).toBeNull();
  });

  it('burned kcal ignores manual cardio on days with a Salud total, but keeps strength', () => {
    const rows = [
      { type: 'cardio', kcal: 95, source: 'health' },
      { type: 'cardio', kcal: 200, source: 'manual' },
      { type: 'strength', kcal: 150, source: 'manual' },
    ];
    expect(burnedKcal(rows)).toBe(245);
    expect(burnedKcal(rows.slice(1))).toBe(350);
    expect(burnedKcal([])).toBe(0);
    const withFunctional = [...rows, { type: 'cardio', kcal: 80, source: 'manual', activity: 'functional' }];
    expect(burnedKcal(withFunctional)).toBe(325);
  });

  it('top combos orders by repetitions, then recency, and skips Salud rows', () => {
    const rows = [
      { activity: 'run', duration_min: 20, source: 'manual' },
      { activity: 'walk_fast', duration_min: 40, source: 'manual' },
      { activity: 'walk_fast', duration_min: 40, source: 'manual' },
      { activity: null, duration_min: 30, source: 'manual' },
      { activity: 'walk_fast', duration_min: 15, source: 'health' },
    ];
    expect(topCombos(rows)).toEqual([
      { activity: 'walk_fast', minutes: 40, count: 2 },
      { activity: 'run', minutes: 20, count: 1 },
    ]);
    expect(topCombos(rows, 1)).toHaveLength(1);
  });

  it('compares weeks only when the previous one has data', () => {
    expect(compareWeeks(1200, 900)).toEqual({ now: 1200, previous: 900, delta: 300 });
    expect(compareWeeks(500, 900).delta).toBe(-400);
    expect(compareWeeks(500, 0).delta).toBeNull();
  });

  it('metric points skip days without a measurement', () => {
    expect(metricPoints([
      { date: '2026-10-30', value: 95 },
      { date: '2026-10-31', value: null },
      { date: '2026-11-01', value: 94.5 },
    ])).toEqual([{ label: '2026-10-30', value: 95 }, { label: '2026-11-01', value: 94.5 }]);
  });
});
