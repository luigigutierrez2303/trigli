import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toIsoDate } from '../../core/date';
import { Supabase } from '../../core/supabase';
import { ProfileService } from '../energy/profile.service';
import { Reminder, reminders } from './reminders';

/** Avisos al abrir la app: comidas del día, peso y cintura que hace tiempo no se cargan. */
@Component({
  selector: 'app-reminders',
  imports: [RouterLink],
  template: `
    @for (r of items(); track r.key) {
      <div class="reminder" role="status">
        <span>{{ r.text }}</span>
        <a [routerLink]="r.link">{{ r.action }}</a>
      </div>
    }
  `,
  styles: `
    :host { display: grid; gap: 8px; }
    :host:empty { display: none; }
    .reminder { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-radius: var(--trigli-radius-md); background: var(--trigli-primary-soft); color: var(--ion-text-color); font-size: 0.9375rem; }
    a { flex: none; padding: 6px 4px; font-weight: 700; color: var(--trigli-primary-text); text-decoration: none; }
  `,
})
export class RemindersComponent {
  private readonly db = inject(Supabase).client;
  private readonly profiles = inject(ProfileService);

  readonly items = signal<Reminder[]>([]);

  constructor() {
    // Se recalcula al abrir y cada vez que algo cambia (comida, peso, cintura).
    effect(() => {
      this.profiles.changes();
      this.load();
    });
  }

  /** Los avisos son un extra: si la consulta falla, simplemente no se muestran. */
  async load() {
    try {
      const now = new Date();
      const today = toIsoDate(now);
      const latest = async (col: 'weight_kg' | 'waist_cm') => {
        const { data, error } = await this.db.from('body_metric').select('date').not(col, 'is', null).order('date', { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        return (data?.date as string | undefined) ?? null;
      };
      const [lastWeightDate, lastWaistDate, meals] = await Promise.all([
        latest('weight_kg'),
        latest('waist_cm'),
        this.db.from('meal_log').select('id', { count: 'exact', head: true }).eq('date', today),
      ]);
      if (meals.error) throw meals.error;
      this.items.set(reminders({ today, hour: now.getHours(), lastWeightDate, lastWaistDate, mealsToday: meals.count ?? 0 }));
    } catch {
      this.items.set([]);
    }
  }
}
