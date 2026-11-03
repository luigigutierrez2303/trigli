export const GLASS_ML = 250;
export const WATER_GOAL_GLASSES = 8;
export const MAX_GLASSES = 30;

/** Vasos tras sumar o restar uno, sin salirse de 0 a 30. */
export const stepGlasses = (current: number, delta: 1 | -1): number => Math.min(MAX_GLASSES, Math.max(0, current + delta));

export const litres = (glasses: number): string => (glasses * GLASS_ML / 1000).toFixed(2).replace('.', ',').replace(/0$/, '');
