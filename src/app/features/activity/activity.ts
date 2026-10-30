import { toIsoDate } from '../../core/date';

/** Meta semanal de aeróbico (mínimos de actividad moderada recomendados). */
export const WEEKLY_CARDIO_GOAL_MIN = 150;

/** Lunes de la semana (ISO) que contiene `isoDate`. */
export function weekStart(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIsoDate(d);
}

export function weekEnd(isoDate: string): string {
  const d = new Date(weekStart(isoDate) + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return toIsoDate(d);
}

export interface CardioProgress {
  minutes: number;
  pct: number; // 0-100, tope en 100
  remaining: number;
  done: boolean;
}

export function cardioProgress(minutes: number, goal = WEEKLY_CARDIO_GOAL_MIN): CardioProgress {
  const remaining = Math.max(goal - minutes, 0);
  return { minutes, pct: Math.min(Math.round((minutes / goal) * 100), 100), remaining, done: remaining === 0 };
}

/** Acepta coma o punto decimal ("82,5"). Devuelve null si no es un número. */
export function parseDecimal(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : Number(raw.trim().replace(',', '.'));
  return raw === '' || !Number.isFinite(n) ? null : n;
}

export const isValidWeight = (kg: number | null): kg is number => kg !== null && kg >= 20 && kg <= 300;
export const isValidWaist = (cm: number | null): cm is number => cm !== null && cm >= 30 && cm <= 250;
export const isValidMinutes = (min: number | null): min is number =>
  min !== null && Number.isInteger(min) && min > 0 && min <= 600;

/** Diferencia contra la medición anterior (null si no hay dos puntos). */
export function weightDelta(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : Math.round((current - previous) * 10) / 10;
}
