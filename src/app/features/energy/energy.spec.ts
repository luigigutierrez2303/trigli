import { describe, expect, it } from 'vitest';
import {
  ageOn, bmr, dailyPlan, dayBalance, EnergyProfile, itemsKcal, itemsProtein, kcalBurned, MIN_DAILY_KCAL, proteinGoal, smoothWeights, tdee, weekEnergy, weeksToGoal,
  mergeItems, projectGoal, weightTrend,
} from './energy';
import { flagsOfItems } from './foods';

const profile: EnergyProfile = {
  sex: 'male', birth_date: '1990-06-15', height_cm: 175, goal_weight_kg: 80, activity_level: 'sedentary', weekly_loss_kg: 0.5,
};

describe('energy', () => {
  it('calcula la edad según el cumpleaños', () => {
    expect(ageOn('1990-06-15', '2026-06-14')).toBe(35);
    expect(ageOn('1990-06-15', '2026-06-15')).toBe(36);
  });

  it('calcula el metabolismo basal (Mifflin-St Jeor)', () => {
    expect(bmr('male', 90, 175, 36)).toBe(1819);
    expect(bmr('female', 70, 165, 30)).toBe(1420);
  });

  it('aplica el factor de actividad', () => {
    expect(tdee(1819, 'sedentary')).toBe(2183);
  });

  it('arma la meta con el déficit semanal', () => {
    const plan = dailyPlan(profile, 90, '2026-10-30');
    expect(plan.bmr).toBe(1819);
    expect(plan.tdee).toBe(2183);
    expect(plan.target).toBe(1633); // 2183 - 0,5 kg × 7700 / 7
    expect(plan.floored).toBe(false);
  });

  it('no baja del piso de seguridad', () => {
    const small: EnergyProfile = { ...profile, sex: 'female', height_cm: 150, weekly_loss_kg: 1 };
    const plan = dailyPlan(small, 50, '2026-10-30');
    expect(plan.target).toBe(MIN_DAILY_KCAL.female);
    expect(plan.floored).toBe(true);
  });

  it('estima las semanas hasta el objetivo', () => {
    expect(weeksToGoal(90, 80, 0.5)).toBe(20);
    expect(weeksToGoal(80, 80, 0.5)).toBeNull();
    expect(weeksToGoal(90, 80, 0)).toBeNull();
  });

  it('calcula kcal netas por MET', () => {
    expect(kcalBurned(4.3, 90, 30)).toBe(149); // (4,3 − 1) × 90 × 0,5
    expect(kcalBurned(1, 90, 30)).toBe(0);
  });

  it('clasifica el día contra el presupuesto', () => {
    expect(dayBalance(0, 1500, 0).level).toBe('empty');
    expect(dayBalance(900, 1500, 0).level).toBe('low');
    expect(dayBalance(1400, 1500, 0).level).toBe('ok');
    expect(dayBalance(1600, 1500, 0).level).toBe('close');
    expect(dayBalance(1800, 1500, 0).level).toBe('over');
    expect(dayBalance(1800, 1500, 300)).toEqual({ budget: 1800, remaining: 0, level: 'ok' });
  });

  it('suma las kcal de los ítems', () => {
    expect(itemsKcal([{ name: 'a', kcal: 250, qty: 2 }, { name: 'b', kcal: 90, qty: 1 }])).toBe(590);
    expect(itemsKcal([])).toBe(0);
  });

  it('suma la proteína de los ítems y calcula la meta', () => {
    expect(itemsProtein([{ name: 'a', kcal: 1, protein: 30, qty: 2 }, { name: 'b', kcal: 1, qty: 1 }])).toBe(60);
    expect(proteinGoal(90)).toBe(144);
  });

  it('suaviza el peso con promedio móvil de 7 días', () => {
    const out = smoothWeights([{ date: '2026-10-01', kg: 90 }, { date: '2026-10-02', kg: 92 }, { date: '2026-10-20', kg: 88 }]);
    expect(out.map((p) => p.kg)).toEqual([90, 91, 88]);
  });

  it('detecta la tendencia de peso', () => {
    const series = (kgs: number[], step = 7) =>
      kgs.map((kg, i) => ({ date: new Date(Date.UTC(2026, 9, 1 + i * step)).toISOString().slice(0, 10), kg }));
    expect(weightTrend(series([90])).status).toBe('insufficient');
    expect(weightTrend(series([90, 89.5])).status).toBe('on_track');
    expect(weightTrend(series([90, 88])).status).toBe('on_track'); // 1 semana: puede ser agua
    expect(weightTrend(series([90, 89, 88])).status).toBe('fast');
    expect(weightTrend(series([90, 90, 90])).status).toBe('stalled');
    expect(weightTrend(series([90, 91])).status).toBe('gaining');
    expect(weightTrend(series([90, 89.5])).ratePerWeek).toBe(-0.5);
  });

  it('resume la semana con el déficit real', () => {
    const w = weekEnergy([{ eaten: 1500, burned: 200 }, { eaten: 0, burned: 0 }, { eaten: 2400, burned: 0 }], 1600, 2200);
    expect(w.daysLogged).toBe(2);
    expect(w.daysOnTarget).toBe(1);
    expect(w.deficitKcal).toBe(900 + -200); // (2200+200-1500) + (2200-2400)
    expect(w.estimatedKg).toBe(0.09);
  });

  it('deriva las marcas de calidad de los alimentos', () => {
    expect(flagsOfItems(['Salmón', 'Ensalada mixta', 'Otro'])).toEqual({ salmon: true, salad: true });
    expect(flagsOfItems([])).toEqual({});
  });

  it('mezcla ítems acumulando porciones de los repetidos', () => {
    const base = [{ name: 'Huevo', kcal: 75, protein: 6, qty: 2 }];
    const out = mergeItems(base, [{ name: 'Huevo', kcal: 75, protein: 6, qty: 1 }, { name: 'Palta', kcal: 120, qty: 1 }]);
    expect(out).toEqual([{ name: 'Huevo', kcal: 75, protein: 6, qty: 3 }, { name: 'Palta', kcal: 120, qty: 1 }]);
    expect(base[0].qty).toBe(2); // no muta lo original
  });

  it('proyecta la fecha de llegada al peso objetivo', () => {
    expect(projectGoal(90, 80, -0.5, '2026-10-30')).toBe('2027-03-19'); // 20 semanas
    expect(projectGoal(80, 80, -0.5, '2026-10-30')).toBeNull();
    expect(projectGoal(90, 80, 0.2, '2026-10-30')).toBeNull();
    expect(projectGoal(90, 40, -0.1, '2026-10-30')).toBeNull(); // más de dos años
  });
});
