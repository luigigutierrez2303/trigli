import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { ProfileService } from '../energy/profile.service';

export interface CardioWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  duration_min: number;
  notes: string | null;
  activity: string | null;
  kcal: number | null;
}

export interface BodyMetric {
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
}

const WORKOUT_COLS = 'id, date, duration_min, notes, activity, kcal';
const METRIC_COLS = 'date, weight_kg, waist_cm';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly db = inject(Supabase).client;
  private readonly profiles = inject(ProfileService);

  /** Cardio entre dos fechas inclusive (para el día y para la semana). */
  async cardioBetween(from: string, to: string): Promise<CardioWorkout[]> {
    const { data, error } = await this.db
      .from('workout')
      .select(WORKOUT_COLS)
      .eq('type', 'cardio')
      .gte('date', from)
      .lte('date', to)
      .order('created_at');
    if (error) throw error;
    return data as CardioWorkout[];
  }

  async addCardio(
    date: string, durationMin: number, notes: string | null, activity: string, kcal: number | null,
  ): Promise<CardioWorkout> {
    const { data, error } = await this.db
      .from('workout')
      .insert({ date, type: 'cardio', duration_min: durationMin, notes: notes || null, activity, kcal })
      .select(WORKOUT_COLS)
      .single();
    if (error) throw error;
    this.profiles.notifyChange();
    return data as CardioWorkout;
  }

  async removeWorkout(id: string): Promise<void> {
    const { error } = await this.db.from('workout').delete().eq('id', id);
    if (error) throw error;
    this.profiles.notifyChange();
  }

  async metricByDate(date: string): Promise<BodyMetric | null> {
    const { data, error } = await this.db.from('body_metric').select(METRIC_COLS).eq('date', date).maybeSingle();
    if (error) throw error;
    return data as BodyMetric | null;
  }

  /** Última medición de peso anterior a `date`, para mostrar la variación. */
  async previousWeight(date: string): Promise<number | null> {
    const { data, error } = await this.db
      .from('body_metric')
      .select('weight_kg')
      .lt('date', date)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? Number(data.weight_kg) : null;
  }

  /** Una fila por día. Solo se envían los campos informados, así no pisa los otros. */
  async saveMetric(date: string, values: { weight_kg?: number; waist_cm?: number }): Promise<BodyMetric> {
    const { data, error } = await this.db
      .from('body_metric')
      .upsert({ date, ...values }, { onConflict: 'user_id,date' })
      .select(METRIC_COLS)
      .single();
    if (error) throw error;
    this.profiles.notifyChange();
    return data as BodyMetric;
  }
}
