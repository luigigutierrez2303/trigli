import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { MealItem } from '../energy/energy';
import { MealFlags } from './meal-scoring';

export interface FavoriteMeal {
  id: string;
  name: string;
  items: MealItem[];
  flags: MealFlags;
}

const COLS = 'id, name, items, flags';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly db = inject(Supabase).client;

  async list(): Promise<FavoriteMeal[]> {
    const { data, error } = await this.db.from('favorite_meal').select(COLS).order('created_at', { ascending: false });
    if (error) throw error;
    return data as FavoriteMeal[];
  }

  async add(name: string, items: MealItem[], flags: MealFlags): Promise<FavoriteMeal> {
    const { data, error } = await this.db.from('favorite_meal').insert({ name, items, flags }).select(COLS).single();
    if (error) throw error;
    return data as FavoriteMeal;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('favorite_meal').delete().eq('id', id);
    if (error) throw error;
  }
}
