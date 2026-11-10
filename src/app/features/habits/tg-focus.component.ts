import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowDown, arrowUp, ellipsisHorizontal } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import { WEEKLY_CARDIO_GOAL_MIN } from '../activity/activity';
import { TG_LEVEL_LABELS } from '../labs/labs';
import { LineChartComponent } from '../labs/line-chart.component';
import { HabitMeal, weekHabits, weekSuggestion } from './habits';
import { FactorLevel, TG_GOAL, TgReading, tgFactors, tgStatus } from './tg-focus';

const LEVEL_OF_TG = { normal: 'good', borderline: 'warn', high: 'bad', 'very-high': 'bad' } as const;
const EFFECT: Record<FactorLevel, string> = {
  good: 'ayuda a bajarlos', warn: 'los empuja hacia arriba', bad: 'los empuja hacia arriba', pending: 'todavía sin efecto claro',
};
const ICON: Record<FactorLevel, string> = { good: 'arrow-down', warn: 'arrow-up', bad: 'arrow-up', pending: 'ellipsis-horizontal' };

const fmtDate = (iso: string, withYear = false) => {
  const d = new Date(iso + 'T12:00:00');
  const dayMonth = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
  return withYear ? `${dayMonth} ${d.getFullYear()}` : dayMonth;
};

/**
 * El objetivo de la app arriba de todo: último TG contra la meta, cuándo repetir el análisis
 * y qué lo está moviendo esta semana (alcohol, azúcar, aeróbico, comidas, fibra, pescado y peso).
 */
@Component({
  selector: 'app-tg-focus',
  imports: [IonCard, IonCardContent, IonIcon, RouterLink, LineChartComponent],
  template: `
    <ion-card class="tg-focus">
      <ion-card-content>
        <div class="top">
          <div class="main">
            <div class="eyebrow">Triglicéridos</div>
            @if (status(); as s) {
              <div class="value" [attr.data-level]="tgLevel()">
                <span class="num">{{ s.latest.tg }}</span><small>mg/dL</small>
                <span class="chip">{{ levelLabels[s.level] }}</span>
              </div>
              <p class="goal">
                @if (s.toGoal > 0) {
                  Meta: menos de {{ goal }}. Te faltan bajar <b>{{ s.toGoal }} mg/dL</b>.
                } @else {
                  <b>Estás en la meta</b> (menos de {{ goal }}). Sostené los hábitos.
                }
              </p>
              <p class="meta">
                @if (s.first) { {{ s.first.tg }} → {{ s.latest.tg }} desde el {{ fmt(s.first.date, true) }} · }
                @if (s.retestDue) {
                  <a routerLink="/laboratorio">Es buen momento para repetir el análisis</a>
                } @else {
                  Próximo análisis sugerido: {{ fmt(s.nextRetest, true) }}
                }
              </p>
            } @else {
              <p class="goal">Cargá tu último análisis para seguir tu objetivo: menos de {{ goal }} mg/dL.</p>
              <a class="cta" routerLink="/laboratorio">Cargar análisis</a>
            }
          </div>
          @if (points().length > 1) {
            <app-line-chart class="spark" [points]="points()" [refs]="refs" [width]="320" [height]="120" ariaLabel="Triglicéridos en el tiempo" />
          }
        </div>

        <div class="factors-head">
          <span>Qué los mueve · {{ weekLabel() }}</span>
          <span class="key"><ion-icon name="arrow-down" class="good" aria-hidden="true" /> baja <ion-icon name="arrow-up" class="bad" aria-hidden="true" /> sube</span>
        </div>
        <ul class="factors">
          @for (f of factors(); track f.key) {
            <li [attr.data-level]="f.level" [attr.aria-label]="f.label + ': ' + f.value + ', ' + effect[f.level]">
              <ion-icon [name]="icon[f.level]" aria-hidden="true" />
              <span class="label">{{ f.label }}</span>
              <b class="val">{{ f.value }}</b>
            </li>
          }
        </ul>
        @if (suggestion(); as tip) { <p class="tip">{{ tip }}</p> }
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    :host { display: block; }
    .tg-focus { margin: 0 0 16px; }
    .top { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 32px; }
    .main { flex: 1 1 280px; min-width: 0; }
    .spark { flex: 1 1 260px; min-width: 0; max-width: 460px; }
    .value { display: flex; align-items: baseline; gap: 8px; margin-top: 6px; }
    .num { font-size: 3rem; font-weight: 800; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; color: var(--level-text); }
    .value small { color: var(--ion-color-medium); font-weight: 600; }
    .chip { align-self: center; padding: 3px 10px; border-radius: 999px; font-size: 0.8125rem; font-weight: 700; background: var(--level-soft); color: var(--level-text); }
    .goal { margin: 10px 0 0; line-height: 1.4; color: var(--ion-text-color); }
    .meta { margin: 4px 0 0; font-size: 0.875rem; line-height: 1.4; color: var(--ion-color-medium); }
    a { color: var(--trigli-primary-text); font-weight: 600; }
    .cta { display: inline-block; margin-top: 8px; }

    .factors-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; margin: 20px 0 8px; font-size: 0.875rem; font-weight: 600; color: var(--ion-color-medium); }
    .key { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
    .key ion-icon { font-size: 14px; }
    .key .good { color: var(--trigli-ok-text); }
    .key .bad { color: var(--trigli-bad-text); margin-left: 6px; }
    .factors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
    @media (min-width: 600px) { .factors { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); } }
    li {
      display: grid; grid-template-columns: auto 1fr; grid-template-areas: 'icon label' 'icon val'; align-items: center; column-gap: 8px;
      min-width: 0; padding: 10px; border-radius: var(--trigli-radius-md); background: var(--trigli-surface-2);
    }
    li ion-icon { grid-area: icon; width: 26px; height: 26px; padding: 5px; box-sizing: border-box; border-radius: 50%; background: var(--level-soft, var(--ion-card-background)); color: var(--level-text, var(--ion-color-medium)); }
    li .label { grid-area: label; font-size: 0.8125rem; color: var(--ion-color-medium); }
    li .val { grid-area: val; font-size: 0.9375rem; font-variant-numeric: tabular-nums; }
    .tip { margin: 12px 0 0; padding: 12px 14px; border-radius: var(--trigli-radius-md); background: var(--trigli-primary-soft); color: var(--ion-text-color); font-size: 0.9375rem; line-height: 1.4; }
  `,
})
export class TgFocusComponent {
  /** Todas las mediciones de TG, de la más antigua a la más reciente. */
  readonly series = input.required<readonly TgReading[]>();
  readonly monday = input.required<string>();
  readonly meals = input.required<readonly HabitMeal[]>();
  readonly cardioMin = input(0);
  readonly avgScore = input<number | null>(null);
  readonly weightChange = input<number | null>(null);
  readonly weekLabel = input('Esta semana');

  readonly goal = TG_GOAL;
  readonly refs = [{ value: TG_GOAL, label: String(TG_GOAL) }];
  readonly levelLabels = TG_LEVEL_LABELS;
  readonly effect = EFFECT;
  readonly icon = ICON;
  readonly fmt = fmtDate;

  private readonly today = toIsoDate(new Date());
  readonly status = computed(() => tgStatus(this.series(), this.today));
  readonly tgLevel = computed(() => {
    const s = this.status();
    return s ? LEVEL_OF_TG[s.level] : null;
  });
  readonly points = computed(() => this.series().map((r) => ({ label: r.date, value: r.tg })));

  private readonly habits = computed(() => weekHabits(this.monday(), this.today, this.meals()));
  readonly factors = computed(() =>
    tgFactors({
      habits: this.habits(),
      cardioMin: this.cardioMin(),
      cardioGoal: WEEKLY_CARDIO_GOAL_MIN,
      avgScore: this.avgScore(),
      weightChange: this.weightChange(),
    }),
  );
  readonly suggestion = computed(() => weekSuggestion(this.habits(), this.cardioMin(), WEEKLY_CARDIO_GOAL_MIN));

  constructor() {
    addIcons({ arrowDown, arrowUp, ellipsisHorizontal });
  }
}
