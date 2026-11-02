import { describe, expect, it } from 'vitest';
import { Food } from './foods';
import { clampQty, resolveAnalysis } from './meal-analysis';

const catalog: Food[] = [
  { name: 'Arepa con queso', cat: 'Platos y comidas', portion: '1 unidad', kcal: 340, protein: 11 },
  { name: 'Lomo', cat: 'Carnes', portion: '100 g', kcal: 190, protein: 27, grams: 100 },
];

describe('resolveAnalysis', () => {
  it('toma las kcal del catálogo y no de la IA', () => {
    const [p] = resolveAnalysis({ items: [{ name: 'Arepa con queso', qty: 2, matched: true, kcal: 9999 }] }, catalog);
    expect(p.item).toEqual({ name: 'Arepa con queso', kcal: 340, protein: 11, qty: 2 });
    expect(p.estimated).toBe(false);
  });

  it('empareja sin importar tildes ni mayúsculas y conserva los gramos de referencia', () => {
    const [p] = resolveAnalysis({ items: [{ name: 'AREPA CON QUESÓ'.replace('Ó', 'O'), qty: 1, matched: true }, { name: 'lomo', qty: 1.5, matched: true }] }, catalog);
    expect(p.item.name).toBe('Arepa con queso');
    expect(resolveAnalysis({ items: [{ name: 'lomo', qty: 1.5, matched: true }] }, catalog)[0].item).toMatchObject({ refGrams: 100, qty: 1.5 });
  });

  it('lo que no está en el catálogo queda como estimado, con valores acotados', () => {
    const [p] = resolveAnalysis({ items: [{ name: 'Tequeño raro', qty: 1, matched: false, kcal: 120.4, protein: 3.26, portion: '1 unidad' }] }, catalog);
    expect(p).toMatchObject({ estimated: true, portion: '1 unidad', item: { name: 'Tequeño raro', kcal: 120, protein: 3.3, qty: 1 } });
  });

  it('descarta ítems inválidos o sin kcal cuando no están en el catálogo', () => {
    const bad = [null, 'x', { name: '', qty: 1 }, { name: 'Algo', qty: 'dos' }, { name: 'Algo', qty: 1 }, { name: 'Algo', qty: 1, kcal: 90000 }, { name: 'Algo', qty: 1, kcal: -5 }];
    expect(resolveAnalysis({ items: bad }, catalog)).toEqual([]);
  });

  it('tolera respuestas que no son una lista', () => {
    for (const raw of [null, undefined, 'hola', {}, { items: 'no' }]) expect(resolveAnalysis(raw, catalog)).toEqual([]);
  });

  it('limita la cantidad de ítems', () => {
    const items = Array.from({ length: 50 }, () => ({ name: 'Lomo', qty: 1, matched: true }));
    expect(resolveAnalysis({ items }, catalog)).toHaveLength(20);
  });

  it('marca la duda de la IA', () => {
    expect(resolveAnalysis({ items: [{ name: 'Lomo', qty: 1, matched: true, uncertain: true }] }, catalog)[0].uncertain).toBe(true);
  });
});

describe('clampQty', () => {
  it('redondea a cuartos y acota', () => {
    expect(clampQty(0.1)).toBe(0.25);
    expect(clampQty(1.3)).toBe(1.25);
    expect(clampQty(500)).toBe(20);
  });
});
