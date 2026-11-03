import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { PeriodData } from './habits';

@Injectable({ providedIn: 'root' })
export class HabitsService {
  private readonly db = inject(Supabase).client;

  /** Comidas, entrenos y peso entre dos fechas (inclusive), para comparar períodos entre análisis. */
  async between(from: string, to: string): Promise<PeriodData> {
    const [meals, workouts, metrics] = await Promise.all([
      this.db.from('meal_log').select('date, score, flags').gte('date', from).lte('date', to).limit(5000),
      this.db.from('workout').select('date, type, duration_min').gte('date', from).lte('date', to).limit(5000),
      this.db.from('body_metric').select('date, weight_kg').not('weight_kg', 'is', null).gte('date', from).lte('date', to),
    ]);
    for (const r of [meals, workouts, metrics]) if (r.error) throw r.error;
    return {
      meals: meals.data as PeriodData['meals'],
      workouts: workouts.data as PeriodData['workouts'],
      metrics: metrics.data!.map((m) => ({ date: m.date as string, weight_kg: Number(m.weight_kg) })),
    };
  }

  /** Todo el historial de peso y cintura, para el informe del médico. */
  async bodyHistory(): Promise<{ date: string; weight_kg: number | null; waist_cm: number | null }[]> {
    const { data, error } = await this.db.from('body_metric').select('date, weight_kg, waist_cm').order('date').limit(5000);
    if (error) throw error;
    return data!.map((m) => ({
      date: m.date as string,
      weight_kg: m.weight_kg === null ? null : Number(m.weight_kg),
      waist_cm: m.waist_cm === null ? null : Number(m.waist_cm),
    }));
  }
}
