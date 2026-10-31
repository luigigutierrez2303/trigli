import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonProgressBar } from '@ionic/angular';
import { toIsoDate } from '../../core/date';
import { weekEnd, weekStart } from '../activity/activity';
import {
  dailyPlan, DailyPlan, proteinGoal, TREND_MESSAGES, weekEnergy, weightTrend, WeightPoint,
} from './energy';
import { ProfileService, WeekEnergyDay } from './profile.service';

const TREND_DAYS = 28;

const addDays = (iso: string, delta: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
};

/** "¿Voy bien?": tendencia de peso suavizada, déficit de la semana y proteína de hoy. */
@Component({
  selector: 'app-energy-progress',
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonProgressBar],
  template: `
    @if (loaded()) {
      <ion-card class="progress" [attr.data-status]="trend().status">
        <ion-card-header><ion-card-title>¿Voy bien?</ion-card-title></ion-card-header>
        <ion-card-content>
          <div class="row">
            <span class="big">{{ currentKg() !== null ? currentKg() + ' kg' : '—' }}</span>
            @if (trend().ratePerWeek !== null) {
              <span class="rate">{{ rateLabel() }}</span>
            }
          </div>
          <p class="msg">{{ message() }}</p>

          @if (week(); as w) {
            <hr />
            <div class="row"><b>Esta semana</b></div>
            <p class="msg">
              {{ w.daysOnTarget }} de {{ w.daysLogged }} {{ w.daysLogged === 1 ? 'día registrado' : 'días registrados' }} dentro de tu meta.
              @if (w.daysLogged > 0) {
                Déficit acumulado: <b>{{ w.deficitKcal }} kcal</b> (≈ {{ w.estimatedKg }} kg de grasa).
              }
            </p>
          }

          @if (proteinTarget(); as goal) {
            <hr />
            <div class="row"><b>Proteína de hoy</b><span class="rate">{{ todayProtein() }} / {{ goal }} g</span></div>
            <ion-progress-bar [value]="proteinPct()" />
            <p class="fine">Solo cuenta lo cargado desde la lista de alimentos. Meta de 1,6 g por kg de peso.</p>
          }
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: `
    .progress { border-top: 4px solid var(--status-color, var(--ion-color-medium)); }
    .progress[data-status='on_track'] { --status-color: var(--trigli-ok-text); }
    .progress[data-status='stalled'], .progress[data-status='fast'] { --status-color: var(--trigli-warn-text); }
    .progress[data-status='gaining'] { --status-color: var(--trigli-bad-text); }
    .row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .big { font-size: 2rem; font-weight: 800; }
    .rate { font-weight: 600; color: var(--status-color, var(--ion-color-medium)); }
    .msg { margin: 6px 0 0; line-height: 1.4; }
    .fine { margin: 6px 0 0; font-size: 12px; color: var(--ion-color-medium); }
    hr { border: 0; border-top: 1px solid var(--ion-border-color); margin: 14px 0; }
    ion-progress-bar { height: 8px; border-radius: 4px; margin-top: 8px; }
  `,
})
export class EnergyProgressComponent implements OnInit {
  private readonly profiles = inject(ProfileService);

  readonly loaded = signal(false);
  private readonly weights = signal<WeightPoint[]>([]);
  private readonly days = signal<WeekEnergyDay[]>([]);
  private readonly plan = signal<DailyPlan | null>(null);
  private readonly lastWeight = signal<number | null>(null);

  readonly trend = computed(() => weightTrend(this.weights()));
  readonly currentKg = computed(() => this.trend().smoothed.at(-1)?.kg ?? null);
  readonly message = computed(() => TREND_MESSAGES[this.trend().status]);
  readonly rateLabel = computed(() => {
    const rate = this.trend().ratePerWeek!;
    const text = Math.abs(rate).toLocaleString('es-AR', { maximumFractionDigits: 2 });
    return rate < 0 ? `bajás ${text} kg por semana` : rate > 0 ? `subís ${text} kg por semana` : 'sin cambios';
  });

  readonly week = computed(() => {
    const plan = this.plan();
    return plan ? weekEnergy(this.days(), plan.target, plan.tdee) : null;
  });

  readonly proteinTarget = computed(() => {
    const w = this.lastWeight();
    return w ? proteinGoal(w) : null;
  });
  readonly todayProtein = computed(() => this.days().find((d) => d.date === toIsoDate(new Date()))?.protein ?? 0);
  readonly proteinPct = computed(() => Math.min(this.todayProtein() / (this.proteinTarget() || 1), 1));

  async ngOnInit() {
    try {
      const today = toIsoDate(new Date());
      const [profile, weight, weights, days] = await Promise.all([
        this.profiles.get(),
        this.profiles.latestWeight(),
        this.profiles.weightsSince(addDays(today, -TREND_DAYS)),
        this.profiles.energyBetween(weekStart(today), weekEnd(today)),
      ]);
      this.weights.set(weights);
      this.days.set(days);
      this.lastWeight.set(weight);
      if (profile && weight) this.plan.set(dailyPlan(profile, weight, today));
      this.loaded.set(true);
    } catch { /* tarjeta opcional: si falla, el Resumen sigue igual */ }
  }
}
