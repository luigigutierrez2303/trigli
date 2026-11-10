import { WeekHabits } from './habits';
import { FactorInput, paceLevel, tgFactors, tgStatus } from './tg-focus';

const habits = (over: Partial<WeekHabits> = {}): WeekHabits => ({
  elapsedDays: 7, loggedDays: 7, fishDays: 2, fiberDays: 5, alcoholDays: 0, sugarDays: 0, ...over,
});
const input = (over: Partial<FactorInput> = {}): FactorInput => ({
  habits: habits(), cardioMin: 150, cardioGoal: 150, avgScore: 80, weightChange: -0.4, ...over,
});
const level = (f: ReturnType<typeof tgFactors>, key: string) => f.find((x) => x.key === key)!.level;

describe('tgStatus', () => {
  it('sin análisis no hay estado', () => {
    expect(tgStatus([], '2026-11-10')).toBeNull();
  });

  it('calcula cuánto falta para quedar debajo de 150 y cuándo repetir el análisis', () => {
    const s = tgStatus([{ date: '2026-05-21', tg: 411 }, { date: '2026-10-23', tg: 409 }], '2026-11-10')!;
    expect(s.level).toBe('high');
    expect(s.toGoal).toBe(260);
    expect(s.first).toEqual({ date: '2026-05-21', tg: 411 });
    expect(s.nextRetest).toBe('2027-01-15');
    expect(s.retestDue).toBe(false);
  });

  it('en la meta no falta nada; un solo análisis no tiene "primero"', () => {
    const s = tgStatus([{ date: '2026-01-10', tg: 120 }], '2026-11-10')!;
    expect(s.toGoal).toBe(0);
    expect(s.first).toBeNull();
    expect(s.retestDue).toBe(true);
  });
});

describe('paceLevel', () => {
  it('cumplido, al ritmo, atrasado o en cero', () => {
    expect(paceLevel(150, 150, 3)).toBe('good');
    expect(paceLevel(80, 150, 2)).toBe('pending');
    expect(paceLevel(70, 150, 3)).toBe('pending');
    expect(paceLevel(40, 150, 5)).toBe('warn');
    expect(paceLevel(0, 2, 6)).toBe('bad');
  });
});

describe('tgFactors', () => {
  it('una semana buena: todo ayuda a bajar', () => {
    expect(tgFactors(input()).every((f) => f.level === 'good')).toBe(true);
  });

  it('el alcohol y el azúcar pesan primero y empujan hacia arriba', () => {
    const f = tgFactors(input({ habits: habits({ alcoholDays: 2, sugarDays: 2 }) }));
    expect(f[0].key).toBe('alcohol');
    expect(level(f, 'alcohol')).toBe('bad');
    expect(level(f, 'sugar')).toBe('warn');
  });

  it('sin comidas cargadas los factores de comida quedan pendientes', () => {
    const f = tgFactors(input({ habits: habits({ loggedDays: 0 }), avgScore: null }));
    for (const key of ['alcohol', 'sugar', 'fiber', 'fish', 'score']) expect(level(f, key)).toBe('pending');
    expect(f.find((x) => x.key === 'alcohol')!.value).toBe('—');
  });

  it('peso: bajar ayuda, subir empuja y sin pesajes queda pendiente', () => {
    expect(tgFactors(input({ weightChange: -0.4 })).find((x) => x.key === 'weight')!.value).toBe('−0,4 kg');
    expect(level(tgFactors(input({ weightChange: 0.3 })), 'weight')).toBe('warn');
    expect(level(tgFactors(input({ weightChange: null })), 'weight')).toBe('pending');
  });
});
