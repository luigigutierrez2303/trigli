import {
  cardioProgress, isValidMinutes, isValidWaist, isValidWeight, parseDecimal, weekEnd, weekStart, weightDelta,
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
});
