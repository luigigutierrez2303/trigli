import { describe, expect, it } from 'vitest';
import { ALL_FLAG_DEFS } from '../meals/meal-scoring';
import { flagsOfItems, FoodDraft, foodOrigin, FOOD_CATEGORIES, FOODS, mergeCatalog, parseFoodDraft, UserFood } from './foods';

describe('foods', () => {
  it('no repite nombres (se usan para derivar la calidad)', () => {
    const names = FOODS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('cada marca de calidad existe en el catálogo de puntaje', () => {
    const keys = new Set(ALL_FLAG_DEFS.map((d) => d.key));
    for (const food of FOODS.filter((f) => f.flag)) expect(keys.has(food.flag!), food.name).toBe(true);
  });

  it('usa solo categorías conocidas y valores razonables', () => {
    for (const f of FOODS) {
      expect(FOOD_CATEGORIES, f.name).toContain(f.cat);
      expect(f.kcal, f.name).toBeGreaterThanOrEqual(0);
      expect(f.kcal, f.name).toBeLessThanOrEqual(1000);
      expect(f.protein, f.name).toBeGreaterThanOrEqual(0);
    }
  });

  it('toma los gramos de la porción cuando están indicados', () => {
    const byName = (n: string) => FOODS.find((f) => f.name === n)!;
    expect(byName('Lomo').grams).toBe(100);
    expect(byName('Peceto').grams).toBe(150);
    expect(byName('Huevo').grams).toBeUndefined();
  });

  it('tiene los cortes de carne cargados por 100 g', () => {
    const cuts = FOODS.filter((f) => f.cat === 'Carnes' && f.portion === '100 g');
    expect(cuts.length).toBeGreaterThanOrEqual(20);
  });

  describe('mergeCatalog', () => {
    const mine = (over: Partial<UserFood>): UserFood => ({ name: 'Mi plato', cat: 'Platos y comidas', portion: '1 porción', kcal: 300, protein: 10, hidden: false, ...over });

    it('suma los alimentos propios al catálogo', () => {
      const merged = mergeCatalog(FOODS, [mine({})]);
      expect(merged).toHaveLength(FOODS.length + 1);
      expect(merged.find((f) => f.name === 'Mi plato')).not.toHaveProperty('hidden');
    });

    it('lo propio pisa al base con el mismo nombre', () => {
      const merged = mergeCatalog(FOODS, [mine({ name: 'Huevo', kcal: 90 })]);
      expect(merged.filter((f) => f.name === 'Huevo')).toHaveLength(1);
      expect(merged.find((f) => f.name === 'Huevo')!.kcal).toBe(90);
    });

    it('oculta el alimento base marcado como oculto', () => {
      const merged = mergeCatalog(FOODS, [mine({ name: 'Huevo', hidden: true })]);
      expect(merged.some((f) => f.name === 'Huevo')).toBe(false);
    });

    it('deriva las marcas de calidad desde el catálogo fusionado', () => {
      const merged = mergeCatalog(FOODS, [mine({ name: 'Mi ensalada', flag: 'salad' })]);
      expect(flagsOfItems(['Mi ensalada'], merged)).toEqual({ salad: true });
    });
  });

  describe('parseFoodDraft', () => {
    const draft = (over: Partial<FoodDraft> = {}): FoodDraft => ({ name: ' Arepa rellena ', cat: 'Platos y comidas', portion: '1 unidad', kcal: '350,4', protein: '12,25', grams: '', flag: '', ...over });

    it('limpia y convierte los textos del formulario', () => {
      expect(parseFoodDraft(draft())).toEqual({ name: 'Arepa rellena', cat: 'Platos y comidas', portion: '1 unidad', kcal: 350, protein: 12.3 });
    });

    it('guarda gramos y marca solo si se completaron', () => {
      expect(parseFoodDraft(draft({ grams: '150', flag: 'salad' }))).toMatchObject({ grams: 150, flag: 'salad' });
    });

    it('rechaza datos inválidos', () => {
      for (const bad of [{ name: ' ' }, { portion: '' }, { kcal: '' }, { kcal: '-1' }, { kcal: '9000' }, { protein: 'x' }, { grams: '0' }, { grams: '1,5' }, { cat: 'Otra' }]) {
        expect(parseFoodDraft(draft(bad)), JSON.stringify(bad)).toBeNull();
      }
    });
  });

  describe('foodOrigin', () => {
    const own = (name: string): UserFood => ({ name, cat: 'Platos y comidas', portion: '1', kcal: 1, protein: 0, hidden: false });

    it('distingue base, modificado y propio', () => {
      const mine = [own('Huevo'), own('Mi plato')];
      expect(foodOrigin('Salmón', FOODS, mine)).toBe('base');
      expect(foodOrigin('Huevo', FOODS, mine)).toBe('modified');
      expect(foodOrigin('Mi plato', FOODS, mine)).toBe('custom');
    });
  });
});

describe('café con leche', () => {
  it('sin azúcar cuenta como bebida sin azúcar y con azúcar como azucarada', () => {
    expect(flagsOfItems(['Café con leche'])).toEqual({ unsweetened: true });
    expect(flagsOfItems(['Café con leche venezolano (marrón)'])).toEqual({ unsweetened: true });
    expect(flagsOfItems(['Café con leche con azúcar'])).toEqual({ sugar: true });
  });
});
