import { describe, expect, it } from 'vitest';
import {
  ageOn, bmr, dailyPlan, dayBalance, EnergyProfile, itemsKcal, kcalBurned, MIN_DAILY_KCAL, tdee, weeksToGoal,
} from './energy';

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
});
