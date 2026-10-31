import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { EnergyProfile, itemsProtein, MealItem, WeightPoint } from './energy';

const COLS = 'sex, birth_date, height_cm, goal_weight_kg, activity_level, weekly_loss_kg';

export interface DayEnergy {
  eaten: number;
  burned: number;
  protein: number;
}

export interface WeekEnergyDay extends DayEnergy {
  date: string;
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

  /** Kcal y proteína comidas, y kcal quemadas entrenando, por día entre dos fechas inclusive. */
  async energyBetween(from: string, to: string): Promise<WeekEnergyDay[]> {
    const [meals, workouts] = await Promise.all([
      this.db.from('meal_log').select('date, kcal, items').gte('date', from).lte('date', to),
      this.db.from('workout').select('date, kcal').gte('date', from).lte('date', to),
    ]);
    if (meals.error) throw meals.error;
    if (workouts.error) throw workouts.error;

    const days = new Map<string, WeekEnergyDay>();
    const day = (date: string) => {
      if (!days.has(date)) days.set(date, { date, eaten: 0, burned: 0, protein: 0 });
      return days.get(date)!;
    };
    for (const m of meals.data) {
      const d = day(m.date as string);
      d.eaten += (m.kcal as number | null) ?? 0;
      d.protein += itemsProtein((m.items ?? []) as MealItem[]);
    }
    for (const w of workouts.data) day(w.date as string).burned += (w.kcal as number | null) ?? 0;
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async dayEnergy(date: string): Promise<DayEnergy> {
    const [today] = await this.energyBetween(date, date);
    return today ?? { eaten: 0, burned: 0, protein: 0 };
  }

  /** Pesos registrados desde una fecha, del más viejo al más nuevo. */
  async weightsSince(from: string): Promise<WeightPoint[]> {
    const { data, error } = await this.db
      .from('body_metric')
      .select('date, weight_kg')
      .not('weight_kg', 'is', null)
      .gte('date', from)
      .order('date');
    if (error) throw error;
    return data.map((r) => ({ date: r.date as string, kg: Number(r.weight_kg) }));
  }
}
