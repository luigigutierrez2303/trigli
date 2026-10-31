import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { ProfileService } from '../energy/profile.service';
import { MealItem } from '../energy/energy';
import { MealFlags, MealType, scoreMeal } from './meal-scoring';

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  flags: MealFlags;
  score: number;
  notes: string | null;
  kcal: number | null;
  items: MealItem[];
}

const COLS = 'id, date, meal_type, flags, score, notes, kcal, items';

@Injectable({ providedIn: 'root' })
export class MealService {
  private readonly db = inject(Supabase).client;
  private readonly profiles = inject(ProfileService);

  async byDate(date: string): Promise<MealLog[]> {
    const { data, error } = await this.db
      .from('meal_log')
      .select(COLS)
      .eq('date', date);
    if (error) throw error;
    return data as MealLog[];
  }

  /** Una entrada por (día, comida): upsert sobre la unique constraint. */
  async save(date: string, mealType: MealType, flags: MealFlags, notes: string | null, items: MealItem[], kcal: number | null): Promise<MealLog> {
    const clean = Object.fromEntries(Object.entries(flags).filter(([, v]) => v)) as MealFlags;
    const { data, error } = await this.db
      .from('meal_log')
      .upsert(
        { date, meal_type: mealType, flags: clean, score: scoreMeal(clean), notes: notes || null, items, kcal },
        { onConflict: 'user_id,date,meal_type' },
      )
      .select(COLS)
      .single();
    if (error) throw error;
    this.profiles.notifyChange();
    return data as MealLog;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('meal_log').delete().eq('id', id);
    if (error) throw error;
    this.profiles.notifyChange();
  }
}
