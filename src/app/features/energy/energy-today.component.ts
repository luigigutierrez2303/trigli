import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonProgressBar } from '@ionic/angular';
import { toIsoDate } from '../../core/date';
import { dailyPlan, dayBalance, DAY_LEVEL_LABELS } from './energy';
import { DayEnergy, ProfileService } from './profile.service';

/** Balance de calorías de hoy para el Resumen. Si falta perfil o peso, invita a completarlos. */
@Component({
  selector: 'app-energy-today',
  imports: [IonCard, IonCardContent, IonProgressBar, RouterLink],
  template: `
    @if (loaded()) {
      <ion-card class="energy" [attr.data-kcal]="balance()?.level">
        <ion-card-content>
          @if (balance(); as b) {
            <div class="head">
              <span class="eaten">{{ energy().eaten }}</span><small> / {{ b.budget }} kcal hoy</small>
              <span class="state">{{ levelLabels[b.level] }}</span>
            </div>
            <ion-progress-bar [value]="progress()" />
            <p class="sub">
              @if (b.remaining >= 0) { Te quedan <b>{{ b.remaining }}</b> kcal } @else { Te pasaste por <b>{{ -b.remaining }}</b> kcal }
              @if (energy().burned > 0) { · {{ energy().burned }} kcal de ejercicio sumadas }
            </p>
          } @else {
            <p class="sub">
              Para ver cuántas calorías te quedan hoy, cargá <a routerLink="/cuenta">tu meta</a>
              y tu peso en <a routerLink="/actividad">Actividad</a>.
            </p>
          }
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: `
    .energy { border-top: 4px solid var(--kcal-color, var(--ion-color-medium)); }
    .energy[data-kcal='ok'] { --kcal-color: var(--trigli-ok-text); }
    .energy[data-kcal='low'], .energy[data-kcal='close'] { --kcal-color: var(--trigli-warn-text); }
    .energy[data-kcal='over'] { --kcal-color: var(--trigli-bad-text); }
    .eaten { font-size: 2rem; font-weight: 800; color: var(--kcal-color, var(--ion-text-color)); }
    .state { float: right; font-weight: 600; color: var(--kcal-color, var(--ion-color-medium)); }
    ion-progress-bar { margin-top: 8px; height: 8px; border-radius: 4px; --progress-background: var(--kcal-color, var(--ion-color-primary)); }
    .sub { margin: 8px 0 0; color: var(--ion-color-medium); }
    a { color: var(--trigli-primary-text); font-weight: 600; }
  `,
})
export class EnergyTodayComponent implements OnInit {
  private readonly profiles = inject(ProfileService);

  readonly levelLabels = DAY_LEVEL_LABELS;
  readonly loaded = signal(false);
  readonly target = signal<number | null>(null);
  readonly energy = signal<DayEnergy>({ eaten: 0, burned: 0, protein: 0 });

  readonly balance = computed(() => {
    const target = this.target();
    return target === null ? null : dayBalance(this.energy().eaten, target, this.energy().burned);
  });
  readonly progress = computed(() => {
    const b = this.balance();
    return b ? Math.min(this.energy().eaten / b.budget, 1) : 0;
  });

  async ngOnInit() {
    try {
      const today = toIsoDate(new Date());
      const [profile, weight, energy] = await Promise.all([
        this.profiles.get(), this.profiles.latestWeight(), this.profiles.dayEnergy(today),
      ]);
      this.energy.set(energy);
      if (profile && weight) this.target.set(dailyPlan(profile, weight, today).target);
      this.loaded.set(true);
    } catch { /* el balance es opcional: si falla, el Resumen sigue igual */ }
  }
}
