import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { EnergyProfile } from './energy';

const COLS = 'sex, birth_date, height_cm, goal_weight_kg, activity_level, weekly_loss_kg';

export interface DayEnergy {
  eaten: number;
  burned: number;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly db = inject(Supabase).client;

  async get(): Promise<EnergyProfile | null> {
    const { data, error } = await this.db.from('profile').select(COLS).maybeSingle();
    if (error) throw error;
    return data && ({
      ...data,
      height_cm: Number(data.height_cm),
      goal_weight_kg: Number(data.goal_weight_kg),
      weekly_loss_kg: Number(data.weekly_loss_kg),
    } as EnergyProfile);
  }

  async save(p: EnergyProfile): Promise<void> {
    const { error } = await this.db.from('profile').upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  /** Último peso registrado (o null si nunca cargó uno). */
  async latestWeight(): Promise<number | null> {
    const { data, error } = await this.db
      .from('body_metric')
      .select('weight_kg')
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? Number(data.weight_kg) : null;
  }

  /** Kcal comidas y quemadas entrenando en un día. */
  async dayEnergy(date: string): Promise<DayEnergy> {
    const [meals, workouts] = await Promise.all([
      this.db.from('meal_log').select('kcal').eq('date', date),
      this.db.from('workout').select('kcal').eq('date', date),
    ]);
    if (meals.error) throw meals.error;
    if (workouts.error) throw workouts.error;
    const sum = (rows: { kcal: number | null }[]) => rows.reduce((total, r) => total + (r.kcal ?? 0), 0);
    return { eaten: sum(meals.data), burned: sum(workouts.data) };
  }
}
