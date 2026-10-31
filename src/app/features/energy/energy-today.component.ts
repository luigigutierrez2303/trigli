import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent } from '@ionic/angular';
import { toIsoDate } from '../../core/date';
import { dailyPlan, dayBalance, DAY_LEVEL_LABELS } from './energy';
import { DayEnergy, ProfileService } from './profile.service';

/** Balance de calorías de hoy para el Resumen. Si falta perfil o peso, invita a completarlos. */
@Component({
  selector: 'app-energy-today',
  imports: [IonCard, IonCardContent, RouterLink],
  template: `
    @if (loaded()) {
      <ion-card class="tile" [attr.data-kcal]="balance()?.level">
        <ion-card-content>
          <div class="eyebrow">Hoy</div>
          @if (balance(); as b) {
            <div class="ring-row">
              <div class="ring" role="img" [attr.aria-label]="energy().eaten + ' de ' + b.budget + ' kcal'">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="44" class="track" />
                  <circle cx="50" cy="50" r="44" class="fill" [attr.stroke-dasharray]="dash()" transform="rotate(-90 50 50)" />
                </svg>
                <div class="ring-text"><b>{{ energy().eaten }}</b><small>de {{ b.budget }} kcal</small></div>
              </div>
              <div class="info">
                <div class="state">{{ levelLabels[b.level] }}</div>
                <p class="sub">
                  @if (b.remaining >= 0) { Te quedan <b>{{ b.remaining }}</b> kcal } @else { Te pasaste por <b>{{ -b.remaining }}</b> kcal }
                </p>
                @if (energy().burned > 0) { <p class="sub">Incluye {{ energy().burned }} kcal de ejercicio</p> }
              </div>
            </div>
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
    :host { display: contents; }
    .tile { margin: 0; height: 100%; border-top: 4px solid var(--kcal-color, var(--ion-color-medium)); }
    .tile[data-kcal='ok'] { --kcal-color: var(--trigli-ok-text); }
    .tile[data-kcal='low'], .tile[data-kcal='close'] { --kcal-color: var(--trigli-warn-text); }
    .tile[data-kcal='over'] { --kcal-color: var(--trigli-bad-text); }
    .ring-row { display: flex; align-items: center; gap: 18px; margin-top: 10px; }
    .ring { position: relative; flex: none; width: 112px; height: 112px; }
    .ring svg { width: 100%; height: 100%; }
    .track, .fill { fill: none; stroke-width: 9; }
    .track { stroke: var(--trigli-bar-off); }
    .fill { stroke: var(--kcal-color, var(--ion-color-primary)); stroke-linecap: round; }
    .ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; }
    .ring-text b { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    .ring-text small { font-size: 0.6875rem; color: var(--ion-color-medium); }
    .state { font-size: 1.125rem; font-weight: 700; color: var(--kcal-color, var(--ion-text-color)); }
    .sub { margin: 4px 0 0; color: var(--ion-color-medium); line-height: 1.4; }
    a { color: var(--trigli-primary-text); font-weight: 600; }
  `,
})
export class EnergyTodayComponent {
  private readonly profiles = inject(ProfileService);

  readonly levelLabels = DAY_LEVEL_LABELS;
  readonly loaded = signal(false);
  readonly target = signal<number | null>(null);
  readonly energy = signal<DayEnergy>({ eaten: 0, burned: 0, protein: 0 });

  readonly balance = computed(() => {
    const target = this.target();
    return target === null ? null : dayBalance(this.energy().eaten, target, this.energy().burned);
  });
  /** Arco del anillo: r = 44, circunferencia 276,46. */
  readonly dash = computed(() => {
    const b = this.balance();
    const pct = b ? Math.min(this.energy().eaten / b.budget, 1) : 0;
    return `${(pct * 276.46).toFixed(1)} 276.46`;
  });

  constructor() {
    effect(() => {
      this.profiles.changes();
      untracked(() => void this.load());
    });
  }

  private async load() {
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
