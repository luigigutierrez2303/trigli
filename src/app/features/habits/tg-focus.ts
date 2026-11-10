import { toIsoDate } from '../../core/date';
import { classifyTg, TgLevel } from '../labs/labs';
import { FIBER_DAYS_TARGET, FISH_WEEKLY_TARGET, WeekHabits } from './habits';

/** Meta de triglicéridos en ayunas (mg/dL): debajo de esto es "normal". */
export const TG_GOAL = 150;
/** Cada cuánto conviene repetir el análisis cuando se están cambiando hábitos. */
export const RETEST_WEEKS = 12;

export interface TgReading {
  date: string;
  tg: number;
}

export interface TgStatus {
  latest: TgReading;
  level: TgLevel;
  /** Primera medición, si hay más de una. */
  first: TgReading | null;
  /** Cuánto falta bajar para llegar a la meta (0 si ya está). */
  toGoal: number;
  /** Fecha sugerida para el próximo análisis. */
  nextRetest: string;
  /** true si ya pasó el plazo sugerido. */
  retestDue: boolean;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

/** Dónde está el TG hoy respecto de la meta y cuándo conviene volver a medirlo. `series` va de la más antigua a la más reciente. */
export function tgStatus(series: readonly TgReading[], today: string): TgStatus | null {
  const latest = series.at(-1);
  if (!latest) return null;
  const nextRetest = addDays(latest.date, RETEST_WEEKS * 7);
  return {
    latest,
    level: classifyTg(latest.tg),
    first: series.length > 1 ? series[0] : null,
    toGoal: Math.max(0, latest.tg - (TG_GOAL - 1)),
    nextRetest,
    retestDue: today >= nextRetest,
  };
}

/**
 * Efecto de un factor sobre los TG en la semana:
 * good = ayuda a bajarlos, warn/bad = empuja hacia arriba, pending = todavía no se puede decir (semana recién empezada o sin datos).
 */
export type FactorLevel = 'good' | 'warn' | 'bad' | 'pending';

export interface TgFactor {
  key: 'alcohol' | 'sugar' | 'cardio' | 'score' | 'fiber' | 'fish' | 'weight';
  label: string;
  value: string;
  level: FactorLevel;
}

export interface FactorInput {
  habits: WeekHabits;
  cardioMin: number;
  cardioGoal: number;
  /** Score promedio de la semana (0-100) o null si no hay comidas. */
  avgScore: number | null;
  /** Cambio de peso de la semana en kg o null si hay menos de dos pesajes. */
  weightChange: number | null;
}

/**
 * Nivel de un hábito con meta semanal, teniendo en cuenta cuánto de la semana pasó:
 * cumplido = good; al ritmo esperado o con la semana recién empezada = pending; atrasado = warn (o bad si está en cero).
 */
export function paceLevel(done: number, target: number, elapsedDays: number): FactorLevel {
  if (done >= target) return 'good';
  if (elapsedDays <= 2 || done >= (target * elapsedDays) / 7) return 'pending';
  return done > 0 ? 'warn' : 'bad';
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
const kg = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('es-AR')} kg`;

/** Los factores que más mueven los TG en la semana, del que más pesa al que menos. */
export function tgFactors(i: FactorInput): TgFactor[] {
  const h = i.habits;
  const noMeals = h.loggedDays === 0;
  const meal = (level: FactorLevel): FactorLevel => (noMeals ? 'pending' : level);
  return [
    {
      key: 'alcohol', label: 'Alcohol', value: noMeals ? '—' : days(h.alcoholDays),
      level: meal(h.alcoholDays === 0 ? 'good' : h.alcoholDays === 1 ? 'warn' : 'bad'),
    },
    {
      key: 'sugar', label: 'Azúcar', value: noMeals ? '—' : days(h.sugarDays),
      level: meal(h.sugarDays <= 1 ? 'good' : h.sugarDays <= 3 ? 'warn' : 'bad'),
    },
    {
      key: 'cardio', label: 'Aeróbico', value: `${i.cardioMin} / ${i.cardioGoal} min`,
      level: paceLevel(i.cardioMin, i.cardioGoal, h.elapsedDays),
    },
    {
      key: 'score', label: 'Score comidas', value: i.avgScore === null ? '—' : String(i.avgScore),
      level: i.avgScore === null ? 'pending' : i.avgScore >= 70 ? 'good' : i.avgScore >= 50 ? 'warn' : 'bad',
    },
    {
      key: 'fiber', label: 'Fibra', value: noMeals ? '—' : `${h.fiberDays} / ${FIBER_DAYS_TARGET} días`,
      level: meal(paceLevel(h.fiberDays, FIBER_DAYS_TARGET, h.elapsedDays)),
    },
    {
      key: 'fish', label: 'Pescado graso', value: noMeals ? '—' : `${h.fishDays} / ${FISH_WEEKLY_TARGET}`,
      level: meal(paceLevel(h.fishDays, FISH_WEEKLY_TARGET, h.elapsedDays)),
    },
    {
      key: 'weight', label: 'Peso', value: i.weightChange === null ? 'sin datos' : kg(i.weightChange),
      level: i.weightChange === null ? 'pending' : i.weightChange <= 0 ? 'good' : 'warn',
    },
  ];
}
