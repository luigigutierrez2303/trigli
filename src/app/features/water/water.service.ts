import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';

@Injectable({ providedIn: 'root' })
export class WaterService {
  private readonly db = inject(Supabase).client;

  async glasses(date: string): Promise<number> {
    const { data, error } = await this.db.from('water_log').select('glasses').eq('date', date).maybeSingle();
    if (error) throw error;
    return data?.glasses ?? 0;
  }

  async set(date: string, glasses: number): Promise<void> {
    const { error } = await this.db.from('water_log').upsert({ date, glasses }, { onConflict: 'user_id,date' });
    if (error) throw error;
  }
}
