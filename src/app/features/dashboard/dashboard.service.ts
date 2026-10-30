import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { DailyScore, WeekWorkout } from './dashboard';

export interface WeekData {
  scores: DailyScore[];
  workouts: WeekWorkout[];
  weights: number[];
  latestTg: { date: string; tg: number } | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly db = inject(Supabase).client;

  async week(from: string, to: string): Promise<WeekData> {
    const [scores, workouts, metrics, lab] = await Promise.all([
      this.db.from('meal_daily_score').select('date, score').gte('date', from).lte('date', to).order('date'),
      this.db.from('workout').select('type, duration_min').gte('date', from).lte('date', to),
      this.db.from('body_metric').select('weight_kg').not('weight_kg', 'is', null).gte('date', from).lte('date', to).order('date'),
      this.db.from('lab_result').select('date, tg').not('tg', 'is', null).order('date', { ascending: false }).limit(1),
    ]);
    for (const r of [scores, workouts, metrics, lab]) if (r.error) throw r.error;

    return {
      scores: scores.data as DailyScore[],
      workouts: workouts.data as WeekWorkout[],
      weights: metrics.data!.map((m) => Number(m.weight_kg)),
      latestTg: lab.data![0] ? { date: lab.data![0].date, tg: lab.data![0].tg } : null,
    };
  }
}
