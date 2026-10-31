import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
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
  imports: [IonCard, IonCardContent, IonProgressBar],
  template: `
    @if (loaded()) {
      <ion-card class="tile" [attr.data-status]="trend().status">
        <ion-card-content>
          <div class="eyebrow">Peso · tendencia</div>
          <div class="big">{{ currentKg() !== null ? currentKg() : '—' }}<small> kg</small></div>
          @if (trend().ratePerWeek !== null) { <div class="rate">{{ rateLabel() }}</div> }
          <p class="msg">{{ message() }}</p>
        </ion-card-content>
      </ion-card>

      @if (week(); as w) {
        <ion-card class="tile" [attr.data-status]="w.daysLogged && w.daysOnTarget === w.daysLogged ? 'on_track' : 'stalled'">
          <ion-card-content>
            <div class="eyebrow">Esta semana</div>
            <div class="big">{{ w.daysOnTarget }}<small> de {{ w.daysLogged }} {{ w.daysLogged === 1 ? 'día' : 'días' }} en tu meta</small></div>
            @if (w.daysLogged > 0) {
              <div class="rate">{{ w.deficitKcal }} kcal de déficit</div>
              <p class="msg">Equivale a unos {{ w.estimatedKg }} kg de grasa.</p>
            } @else {
              <p class="msg">Registrá tus comidas para ver cómo va la semana.</p>
            }
          </ion-card-content>
        </ion-card>
      }

      @if (proteinTarget(); as goal) {
        <ion-card class="tile" [attr.data-status]="proteinPct() >= 1 ? 'on_track' : 'stalled'">
          <ion-card-content>
            <div class="eyebrow">Proteína de hoy</div>
            <div class="big">{{ todayProtein() }}<small> / {{ goal }} g</small></div>
            <ion-progress-bar [value]="proteinPct()" />
            <p class="fine">Cuenta solo lo cargado desde la lista de alimentos. Meta: 1,6 g por kg de peso.</p>
          </ion-card-content>
        </ion-card>
      }
    }
  `,
  styles: `
    :host { display: contents; }
    .tile { margin: 0; height: 100%; border-top: 4px solid var(--status-color, var(--ion-color-medium)); }
    .tile[data-status='on_track'] { --status-color: var(--trigli-ok-text); }
    .tile[data-status='stalled'], .tile[data-status='fast'] { --status-color: var(--trigli-warn-text); }
    .tile[data-status='gaining'] { --status-color: var(--trigli-bad-text); }
    .big { margin-top: 8px; font-size: 2.5rem; font-weight: 800; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .big small { font-size: 0.9375rem; font-weight: 600; letter-spacing: 0; color: var(--ion-color-medium); }
    .rate { margin-top: 6px; font-weight: 700; color: var(--status-color, var(--ion-color-medium)); }
    .msg { margin: 8px 0 0; line-height: 1.4; color: var(--ion-color-medium); }
    .fine { margin: 8px 0 0; font-size: 12px; line-height: 1.4; color: var(--ion-color-medium); }
    ion-progress-bar { margin-top: 12px; height: 8px; border-radius: 4px; --progress-background: var(--status-color, var(--ion-color-primary)); }
  `,
})
export class EnergyProgressComponent {
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

  constructor() {
    effect(() => {
      this.profiles.changes();
      untracked(() => void this.load());
    });
  }

  private async load() {
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
