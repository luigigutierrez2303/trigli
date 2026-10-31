import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { IonCard, IonCardContent } from '@ionic/angular';
import { toIsoDate } from '../../core/date';
import { projectGoal, smoothWeights, WeightPoint, weightTrend } from './energy';
import { ProfileService } from './profile.service';

const HISTORY_DAYS = 90;
/** Cuánto se dibuja de la proyección (entre 30 y 120 días, según el historial); la fecha de llegada puede ser más lejana y va en el texto. */
const MIN_DRAWN_DAYS = 30;
const MAX_DRAWN_DAYS = 120;
/** En celular el SVG se dibuja a su tamaño real (360 de ancho) para que textos y trazos no queden diminutos. */
const NARROW = typeof window !== 'undefined' && window.innerWidth < 600;
const W = NARROW ? 360 : 800;
const H = NARROW ? 280 : 260;
const PAD = NARROW ? { left: 34, right: 12, top: 14, bottom: 26 } : { left: 48, right: 20, top: 16, bottom: 30 };
const MIN_LABEL_GAP = NARROW ? 64 : 90;

const DAY_MS = 86_400_000;
const dayOf = (iso: string) => Date.parse(iso + 'T12:00:00') / DAY_MS;
const addDays = (iso: string, delta: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
};
const shortDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
const longDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Peso de los últimos 90 días con su tendencia suavizada, la meta y la fecha estimada de llegada. */
@Component({
  selector: 'app-weight-chart',
  imports: [IonCard, IonCardContent],
  template: `
    @if (loaded() && points().length >= 2) {
      <ion-card class="tile">
        <ion-card-content>
          <div class="head">
            <div>
              <div class="eyebrow">Peso y meta</div>
              <p class="summary">{{ summary() }}</p>
            </div>
            <ul class="legend" aria-label="Referencias">
              <li><i class="k raw"></i>Pesajes</li>
              <li><i class="k trend"></i>Tendencia</li>
              @if (goal() !== null) { <li><i class="k goal"></i>Meta</li> }
              @if (projection()) { <li><i class="k proj"></i>Proyección</li> }
            </ul>
          </div>
          <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" role="img" aria-label="Evolución del peso, tendencia y meta">
            @for (t of yTicks(); track t.kg) {
              <line [attr.x1]="pad.left" [attr.x2]="w - pad.right" [attr.y1]="t.y" [attr.y2]="t.y" class="grid" />
              <text [attr.x]="pad.left - 8" [attr.y]="t.y + 4" class="tick" text-anchor="end">{{ t.kg }}</text>
            }
            @if (goalY(); as gy) {
              <line [attr.x1]="pad.left" [attr.x2]="w - pad.right" [attr.y1]="gy" [attr.y2]="gy" class="goal" />
              <text [attr.x]="pad.left + 6" [attr.y]="gy - 6" class="goal-label">Meta {{ goal() }} kg</text>
            }
            @if (projLine(); as pl) { <path [attr.d]="pl" class="proj" /> }
            <path [attr.d]="trendPath()" class="trend" />
            @for (d of rawDots(); track d.date) {
              <circle [attr.cx]="d.x" [attr.cy]="d.y" r="3.5" class="raw"><title>{{ d.date }}: {{ d.kg }} kg</title></circle>
            }
            @for (x of xLabels(); track x.date) {
              <text [attr.x]="x.x" [attr.y]="h - 8" class="tick" [attr.text-anchor]="x.anchor">{{ x.label }}</text>
            }
          </svg>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: `
    :host { display: contents; }
    .tile { grid-column: 1 / -1; margin: 0; }
    .head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 8px 24px; margin-bottom: 8px; }
    .summary { margin: 4px 0 0; line-height: 1.4; max-width: 60ch; }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; font-size: 0.8125rem; color: var(--ion-color-medium); }
    .k { display: inline-block; margin-right: 6px; vertical-align: middle; }
    .k.raw { width: 8px; height: 8px; border-radius: 50%; background: var(--trigli-primary-text); opacity: 0.45; }
    .k.trend { width: 16px; height: 3px; border-radius: 2px; background: var(--trigli-primary-text); }
    .k.goal { width: 16px; border-top: 2px dashed var(--ion-color-medium); }
    .k.proj { width: 16px; border-top: 2px dotted var(--trigli-primary-text); }
    svg { width: 100%; height: auto; display: block; }
    .grid { stroke: var(--ion-border-color); stroke-width: 1; }
    .tick { fill: var(--ion-color-medium); font-size: 12px; }
    path.trend { fill: none; stroke: var(--trigli-primary-text); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
    path.proj { fill: none; stroke: var(--trigli-primary-text); stroke-width: 2.5; stroke-dasharray: 2 6; stroke-linecap: round; }
    circle.raw { fill: var(--trigli-primary-text); opacity: 0.45; }
    line.goal { stroke: var(--ion-color-medium); stroke-width: 1.5; stroke-dasharray: 6 5; }
    .goal-label { fill: var(--ion-color-medium); font-size: 12px; font-weight: 600; }
  `,
})
export class WeightChartComponent {
  private readonly profiles = inject(ProfileService);

  readonly w = W;
  readonly h = H;
  readonly pad = PAD;

  readonly loaded = signal(false);
  readonly points = signal<WeightPoint[]>([]);
  readonly goal = signal<number | null>(null);
  private readonly plannedRate = signal(0);

  private readonly smoothed = computed(() => smoothWeights(this.points()));
  private readonly trend = computed(() => weightTrend(this.points()));

  /** Ritmo para proyectar: el medido si hay datos suficientes y baja, si no el planeado en la meta. */
  private readonly rate = computed(() => {
    const measured = this.trend().ratePerWeek;
    return measured !== null && measured < 0 ? { value: measured, measured: true } : { value: -this.plannedRate(), measured: false };
  });

  private readonly lastDate = computed(() => this.points().at(-1)?.date ?? null);
  private readonly lastSmoothed = computed(() => this.smoothed().at(-1) ?? null);

  /** Fecha estimada de llegada al peso objetivo (hasta dos años), o null si no se puede estimar. */
  readonly projection = computed(() => {
    const last = this.lastSmoothed();
    const goal = this.goal();
    return last && goal !== null ? projectGoal(last.kg, goal, this.rate().value, last.date) : null;
  });

  /** Hasta dónde se dibuja la proyección y con qué peso termina la línea. */
  private readonly projEnd = computed(() => {
    const last = this.lastSmoothed();
    const proj = this.projection();
    const goal = this.goal();
    if (!last || !proj || goal === null) return null;
    const days = dayOf(proj) - dayOf(last.date);
    const pts = this.points();
    const history = dayOf(pts.at(-1)!.date) - dayOf(pts[0].date);
    const drawn = Math.min(MAX_DRAWN_DAYS, Math.max(MIN_DRAWN_DAYS, history));
    if (days <= drawn) return { date: proj, kg: goal, reachesGoal: true };
    return {
      date: addDays(last.date, drawn),
      kg: last.kg + (this.rate().value / 7) * drawn,
      reachesGoal: false,
    };
  });

  readonly summary = computed(() => {
    const last = this.lastSmoothed();
    const goal = this.goal();
    if (!last) return '';
    if (goal === null) return `Tu tendencia está en ${last.kg} kg. Cargá tu peso objetivo en Mi cuenta para ver la meta.`;
    if (last.kg <= goal) return `Llegaste a tu meta de ${goal} kg. ¡Felicitaciones!`;
    const proj = this.projection();
    const rate = Math.abs(this.rate().value).toLocaleString('es-AR', { maximumFractionDigits: 2 });
    if (proj) {
      return `Te faltan ${Math.round((last.kg - goal) * 10) / 10} kg. Al ritmo ${this.rate().measured ? 'que venís llevando' : 'que planeaste'} (${rate} kg por semana) llegás cerca del ${longDate(proj)}.`;
    }
    return `Te faltan ${Math.round((last.kg - goal) * 10) / 10} kg. Con el ritmo actual todavía no se puede estimar cuándo llegás.`;
  });

  // ---- geometría
  private readonly domain = computed(() => {
    const pts = this.points();
    const t0 = dayOf(pts[0].date);
    const endDate = this.projEnd()?.date ?? pts.at(-1)!.date;
    const t1 = Math.max(dayOf(endDate), t0 + 7);
    const kgs = [...pts.map((p) => p.kg), ...this.smoothed().map((p) => p.kg)];
    const goal = this.goal();
    if (goal !== null) kgs.push(goal);
    const end = this.projEnd();
    if (end) kgs.push(end.kg);
    const lo = Math.floor(Math.min(...kgs)) - 1;
    const hi = Math.ceil(Math.max(...kgs)) + 1;
    return { t0, t1, lo, hi };
  });

  private x(iso: string) {
    const { t0, t1 } = this.domain();
    return PAD.left + ((dayOf(iso) - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  }
  private y(kg: number) {
    const { lo, hi } = this.domain();
    return PAD.top + (1 - (kg - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  }

  readonly rawDots = computed(() => this.points().map((p) => ({ date: p.date, kg: p.kg, x: this.x(p.date), y: this.y(p.kg) })));
  readonly trendPath = computed(() =>
    this.smoothed().map((p, i) => `${i ? 'L' : 'M'}${this.x(p.date).toFixed(1)},${this.y(p.kg).toFixed(1)}`).join(' '),
  );
  readonly goalY = computed(() => (this.goal() === null ? null : this.y(this.goal()!)));
  readonly projLine = computed(() => {
    const last = this.lastSmoothed();
    const end = this.projEnd();
    if (!last || !end) return null;
    return `M${this.x(last.date).toFixed(1)},${this.y(last.kg).toFixed(1)} L${this.x(end.date).toFixed(1)},${this.y(end.kg).toFixed(1)}`;
  });
  readonly yTicks = computed(() => {
    const { lo, hi } = this.domain();
    const step = [1, 2, 5, 10, 20].find((st) => (hi - lo) / st <= 5) ?? 20;
    const ticks: { kg: number; y: number }[] = [];
    for (let kg = Math.ceil(lo / step) * step; kg <= hi; kg += step) ticks.push({ kg, y: this.y(kg) });
    return ticks;
  });
  readonly xLabels = computed(() => {
    const pts = this.points();
    const labels = [{ date: pts[0].date, x: this.x(pts[0].date), anchor: 'start', label: shortDate(pts[0].date) }];
    const end = this.projEnd();
    const lastDate = pts.at(-1)!.date;
    labels.push({ date: lastDate, x: this.x(lastDate), anchor: end ? 'middle' : 'end', label: shortDate(lastDate) });
    if (end) labels.push({ date: end.date, x: this.x(end.date), anchor: 'end', label: shortDate(end.date) });
    // La del medio (última fecha medida) se descarta si queda pegada a la primera o a la última.
    if (labels.length === 3) {
      const [first, mid, last] = labels;
      const apart = Math.abs(mid.x - first.x) >= MIN_LABEL_GAP && Math.abs(last.x - mid.x) >= MIN_LABEL_GAP;
      return apart ? labels : [first, last];
    }
    return labels;
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
      const [profile, weights] = await Promise.all([this.profiles.get(), this.profiles.weightsSince(addDays(today, -HISTORY_DAYS))]);
      this.points.set(weights);
      this.goal.set(profile?.goal_weight_kg ?? null);
      this.plannedRate.set(profile?.weekly_loss_kg ?? 0);
      this.loaded.set(true);
    } catch { /* tarjeta opcional */ }
  }
}
