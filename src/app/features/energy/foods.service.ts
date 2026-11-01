import { computed, inject, Injectable, signal } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { Food, FoodCategory, FOODS, mergeCatalog, UserFood } from './foods';

const COLS = 'name, cat, portion, kcal, protein, grams, flag';

type Row = Omit<Food, 'grams' | 'flag' | 'cat'> & { cat: string; grams: number | null; flag: string | null };

const toFood = (r: Row): Food => ({
  name: r.name, cat: r.cat as FoodCategory, portion: r.portion, kcal: r.kcal, protein: Number(r.protein),
  ...(r.grams ? { grams: r.grams } : {}), ...(r.flag ? { flag: r.flag } : {}),
});

/** Catálogo de alimentos: base global (tabla `food`, con `FOODS` de respaldo) + los ajustes de cada usuario. */
@Injectable({ providedIn: 'root' })
export class FoodsService {
  private readonly db = inject(Supabase).client;
  private readonly base = signal<Food[]>(FOODS);
  private readonly mine = signal<UserFood[]>([]);

  readonly catalog = computed(() => mergeCatalog(this.base(), this.mine()));
  readonly custom = computed(() => this.mine().filter((u) => !u.hidden));

  async load(): Promise<void> {
    const [base, mine] = await Promise.all([
      this.db.from('food').select(COLS),
      this.db.from('user_food').select(`${COLS}, hidden`),
    ]);
    if (!base.error && base.data?.length) this.base.set((base.data as Row[]).map(toFood));
    if (!mine.error) this.mine.set((mine.data as (Row & { hidden: boolean })[]).map((r) => ({ ...toFood(r), hidden: r.hidden })));
  }

  /** Crea o actualiza (por nombre) un alimento propio. */
  async save(food: Food): Promise<void> {
    const row = { name: food.name, cat: food.cat, portion: food.portion, kcal: food.kcal, protein: food.protein, grams: food.grams ?? null, flag: food.flag ?? null, hidden: false };
    const { error } = await this.db.from('user_food').upsert(row, { onConflict: 'user_id,name' });
    if (error) throw error;
    this.mine.update((list) => [...list.filter((u) => u.name !== food.name), { ...food, hidden: false }]);
  }

  /** Quita un alimento propio; si pisaba uno del catálogo, vuelve el original. */
  async remove(name: string): Promise<void> {
    const { error } = await this.db.from('user_food').delete().eq('name', name);
    if (error) throw error;
    this.mine.update((list) => list.filter((u) => u.name !== name));
  }

  /** Oculta un alimento del catálogo base sin tocarlo para los demás. */
  async hide(food: Food): Promise<void> {
    const row = { name: food.name, cat: food.cat, portion: food.portion, kcal: food.kcal, protein: food.protein, grams: food.grams ?? null, flag: food.flag ?? null, hidden: true };
    const { error } = await this.db.from('user_food').upsert(row, { onConflict: 'user_id,name' });
    if (error) throw error;
    this.mine.update((list) => [...list.filter((u) => u.name !== food.name), { ...food, hidden: true }]);
  }
}
