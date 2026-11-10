export type TgLevel = 'normal' | 'borderline' | 'high' | 'very-high';

/** Categorías de triglicéridos en ayunas (mg/dL). */
export function classifyTg(tg: number): TgLevel {
  if (tg < 150) return 'normal';
  if (tg < 200) return 'borderline';
  if (tg < 500) return 'high';
  return 'very-high';
}

export const TG_LEVEL_LABELS: Record<TgLevel, string> = {
  normal: 'Normal',
  borderline: 'Límite alto',
  high: 'Alto',
  'very-high': 'Muy alto',
};

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartGeometry {
  path: string;
  dots: { x: number; y: number; label: string; value: number }[];
  yOf: (value: number) => number;
  min: number;
  max: number;
}

/**
 * Rango del eje Y ajustado a los datos (y a las referencias), con un margen arriba y abajo.
 * No arranca en 0: así una serie de 411 → 409 o una cintura estable no se ven como una línea pegada al techo.
 * Si todos los valores son positivos, el piso nunca baja de 0.
 */
export function chartDomain(values: number[]): { min: number; max: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.1, 1);
  const margin = span * 0.2;
  return { min: lo >= 0 ? Math.max(0, lo - margin) : lo - margin, max: hi + margin };
}

/** Convierte una serie en coordenadas SVG con el eje Y de `chartDomain`. */
export function chartGeometry(
  points: ChartPoint[], width: number, height: number, pad = 16, extraValues: number[] = [],
): ChartGeometry {
  const { min, max } = chartDomain([...points.map((p) => p.value), ...extraValues]);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const yOf = (v: number) => pad + innerH - ((v - min) / (max - min)) * innerH;
  const xOf = (i: number) => (points.length === 1 ? width / 2 : pad + (i / (points.length - 1)) * innerW);

  const dots = points.map((p, i) => ({ x: xOf(i), y: yOf(p.value), label: p.label, value: p.value }));
  const path = dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' ');
  return { path, dots, yOf, min, max };
}

/** Variación porcentual entre la primera y la última medición (null si no hay dos). */
export function percentChange(values: number[]): number | null {
  if (values.length < 2 || values[0] === 0) return null;
  return Math.round(((values[values.length - 1] - values[0]) / values[0]) * 100);
}
