import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { ProfileService } from '../energy/profile.service';
import { FirstStepsState, FIRST_STEPS_DISMISSED_KEY, ONBOARDING_SKIPPED_KEY } from './onboarding';

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(key: string, on: boolean) {
  try { on ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly db = inject(Supabase).client;
  private readonly profiles = inject(ProfileService);

  skipped = () => readFlag(ONBOARDING_SKIPPED_KEY);
  setSkipped = (on: boolean) => writeFlag(ONBOARDING_SKIPPED_KEY, on);
  stepsDismissed = () => readFlag(FIRST_STEPS_DISMISSED_KEY);
  dismissSteps = () => writeFlag(FIRST_STEPS_DISMISSED_KEY, true);

  async hasProfile(): Promise<boolean> {
    return (await this.profiles.get()) !== null;
  }

  /** Qué parte de los primeros pasos ya hizo la persona. */
  async progress(): Promise<FirstStepsState> {
    const has = async (table: string, notNull?: string) => {
      let q = this.db.from(table).select('*', { count: 'exact', head: true });
      if (notNull) q = q.not(notNull, 'is', null);
      const { count, error } = await q;
      if (error) throw error;
      return (count ?? 0) > 0;
    };
    const [hasProfile, hasMeal, hasWorkout, hasWeight] = await Promise.all([
      this.hasProfile(), has('meal_log'), has('workout'), has('body_metric', 'weight_kg'),
    ]);
    return { hasProfile, hasMeal, hasWorkout, hasWeight };
  }
}
