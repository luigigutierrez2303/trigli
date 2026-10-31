import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { SetEntry } from './strength';

export interface Exercise {
  id: string;
  name: string;
  muscle: string | null;
}

export interface NewSet extends SetEntry {
  exercise_id: string;
  set_number: number;
}

export interface StrengthSession {
  id: string;
  date: string;
  duration_min: number;
  notes: string | null;
  kcal: number | null;
  workout_set: { set_number: number; reps: number; weight_kg: number | null; exercise: { name: string } | null }[];
}

@Injectable({ providedIn: 'root' })
export class StrengthService {
  private readonly db = inject(Supabase).client;

  async exercises(): Promise<Exercise[]> {
    const { data, error } = await this.db.from('exercise').select('id, name, muscle').order('name');
    if (error) throw error;
    return data as Exercise[];
  }

  /** Series de la última sesión de fuerza que incluyó el ejercicio (para sugerir la carga). */
  async lastSets(exerciseId: string): Promise<SetEntry[]> {
    const { data: workouts, error } = await this.db
      .from('workout')
      .select('id')
      .eq('type', 'strength')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(15);
    if (error) throw error;
    if (!workouts.length) return [];

    const { data: sets, error: setsError } = await this.db
      .from('workout_set')
      .select('workout_id, set_number, reps, weight_kg')
      .eq('exercise_id', exerciseId)
      .in('workout_id', workouts.map((w) => w.id))
      .order('set_number');
    if (setsError) throw setsError;

    const latest = workouts.find((w) => sets.some((s) => s.workout_id === w.id));
    return sets
      .filter((s) => s.workout_id === latest?.id)
      .map((s) => ({ reps: s.reps, weight_kg: s.weight_kg === null ? null : Number(s.weight_kg) }));
  }

  async saveSession(date: string, durationMin: number, notes: string | null, sets: NewSet[], kcal: number | null): Promise<void> {
    const { data: workout, error } = await this.db
      .from('workout')
      .insert({ date, type: 'strength', duration_min: durationMin, notes: notes || null, kcal })
      .select('id')
      .single();
    if (error) throw error;

    const { error: setsError } = await this.db
      .from('workout_set')
      .insert(sets.map((s) => ({ ...s, workout_id: workout.id })));
    if (setsError) {
      await this.db.from('workout').delete().eq('id', workout.id); // no dejar sesiones vacías
      throw setsError;
    }
  }

  async recentSessions(limit = 5): Promise<StrengthSession[]> {
    const { data, error } = await this.db
      .from('workout')
      .select('id, date, duration_min, notes, kcal, workout_set(set_number, reps, weight_kg, exercise(name))')
      .eq('type', 'strength')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as unknown as StrengthSession[];
  }

  async removeSession(id: string): Promise<void> {
    const { error } = await this.db.from('workout').delete().eq('id', id);
    if (error) throw error;
  }
}
