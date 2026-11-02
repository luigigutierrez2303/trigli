import { describe, expect, it } from 'vitest';
import { emojiOf, Food } from '../energy/foods';
import { frequentItems, HistoryMeal, streakDays, suggestProtein } from './meal-helpers';

const item = (name: string, kcal = 100) => ({ name, kcal, qty: 1 });

describe('frequentItems', () => {
  const history: HistoryMeal[] = [
    { date: '2026-10-28', meal_type: 'breakfast', items: [item('Café con leche', 70), item('Arepa', 200)] },
    { date: '2026-10-29', meal_type: 'breakfast', items: [item('Arepa', 210)] },
    { date: '2026-10-30', meal_type: 'breakfast', items: [item('Arepa', 220), item('Huevo', 75)] },
    { date: '2026-10-30', meal_type: 'dinner', items: [item('Sopa', 90)] },
  ];

  it('ordena por cantidad de veces y usa los valores de la última', () => {
    const out = frequentItems(history, 'breakfast');
    expect(out.map((i) => i.name)).toEqual(['Arepa', 'Huevo', 'Café con leche']);
    expect(out[0].kcal).toBe(220);
  });

  it('solo mira el tipo de comida pedido y respeta el límite', () => {
    expect(frequentItems(history, 'dinner').map((i) => i.name)).toEqual(['Sopa']);
    expect(frequentItems(history, 'breakfast', 1)).toHaveLength(1);
    expect(frequentItems([], 'lunch')).toEqual([]);
  });
});

describe('streakDays', () => {
  it('cuenta los días seguidos hasta hoy', () => {
    expect(streakDays(['2026-10-31', '2026-11-01', '2026-11-02'], '2026-11-02')).toBe(3);
  });

  it('si hoy no registró nada, cuenta desde ayer', () => {
    expect(streakDays(['2026-10-31', '2026-11-01'], '2026-11-02')).toBe(2);
  });

  it('se corta ante un día sin registros', () => {
    expect(streakDays(['2026-10-29', '2026-11-01', '2026-11-02'], '2026-11-02')).toBe(2);
    expect(streakDays(['2026-10-20'], '2026-11-02')).toBe(0);
    expect(streakDays([], '2026-11-02')).toBe(0);
  });

  it('cruza el cambio de mes', () => {
    expect(streakDays(['2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-01')).toBe(3);
  });
});

describe('suggestProtein', () => {
  const food = (name: string, kcal: number, protein: number, extra: Partial<Food> = {}): Food => ({ name, cat: 'Lácteos y huevos', portion: '1', kcal, protein, ...extra });
  const catalog = [
    food('Pechuga', 240, 45), food('Huevo', 75, 6), food('Yogur griego', 150, 15), food('Milanesa frita', 380, 28, { flag: 'friedMilanesa' }),
    food('Whey', 120, 24, { cat: 'Bebidas' }),
  ];

  it('propone lo más proteico por caloría que entra en lo que queda', () => {
    expect(suggestProtein(catalog, 200, 30).map((f) => f.name)).toEqual(['Yogur griego']);
    expect(suggestProtein(catalog, 500, 30).map((f) => f.name)).toEqual(['Pechuga', 'Yogur griego']);
  });

  it('no propone fritos ni bebidas', () => {
    const names = suggestProtein(catalog, 1000, 40, 10).map((f) => f.name);
    expect(names).not.toContain('Milanesa frita');
    expect(names).not.toContain('Whey');
  });

  it('no sugiere si falta poca proteína o poco margen', () => {
    expect(suggestProtein(catalog, 500, 10)).toEqual([]);
    expect(suggestProtein(catalog, 50, 40)).toEqual([]);
  });
});

describe('emojiOf', () => {
  it('reconoce por nombre, con o sin tildes', () => {
    expect(emojiOf('Arepa con queso')).toBe('🫓');
    expect(emojiOf('Tequeños')).toBe('🫓');
    expect(emojiOf('Café con leche')).toBe('☕');
    expect(emojiOf('Tomate')).toBe('🍅');
    expect(emojiOf('Mate cebado')).toBe('☕');
  });

  it('cae a la categoría y a un plato genérico', () => {
    expect(emojiOf('Cosa rara', 'Frutas')).toBe('🍎');
    expect(emojiOf('Cosa rara')).toBe('🍽️');
  });
});
