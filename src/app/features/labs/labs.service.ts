import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';

export interface LabResult {
  id: string;
  date: string;
  tg: number | null;
  hdl: number | null;
  ldl: number | null;
  total_chol: number | null;
  glucose: number | null;
  notes: string | null;
}

export type NewLab = Partial<Omit<LabResult, 'id'>> & { date: string };

const COLS = 'id, date, tg, hdl, ldl, total_chol, glucose, notes';

@Injectable({ providedIn: 'root' })
export class LabService {
  private readonly db = inject(Supabase).client;

  /** Más antiguo primero, listo para graficar. */
  async all(): Promise<LabResult[]> {
    const { data, error } = await this.db.from('lab_result').select(COLS).order('date');
    if (error) throw error;
    return data as LabResult[];
  }

  async add(lab: NewLab): Promise<LabResult> {
    const { data, error } = await this.db.from('lab_result').insert(lab).select(COLS).single();
    if (error) throw error;
    return data as LabResult;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('lab_result').delete().eq('id', id);
    if (error) throw error;
  }
}
