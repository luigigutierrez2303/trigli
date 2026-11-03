import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonRefresher, IonRefresherContent, IonSkeletonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, flaskOutline } from 'ionicons/icons';
import { finishRefresh } from '../../core/refresh';
import { NotifyService } from '../../core/notify';
import { toIsoDate } from '../../core/date';
import { parseDecimal } from '../activity/activity';
import { classifyTg, percentChange, TG_LEVEL_LABELS } from './labs';
import { HabitsService } from '../habits/habits.service';
import { reportCsv, reportHtml, reportRows } from '../report/report';
import { periodStats, PeriodStats } from '../habits/habits';
import { LabResult, LabService, NewLab } from './labs.service';
import { LineChartComponent } from './line-chart.component';

const FIELDS = [
  { key: 'tg', label: 'Triglicéridos (mg/dL)' },
  { key: 'hdl', label: 'HDL' },
  { key: 'ldl', label: 'LDL' },
  { key: 'total_chol', label: 'Colesterol total' },
  { key: 'glucose', label: 'Glucosa' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

const isLabValue = (n: number | null): n is number => n !== null && Number.isInteger(n) && n >= 1 && n <= 5000;

@Component({
  selector: 'app-labs',
  imports: [
    IonButton, IonIcon, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonBadge, IonInput, IonRefresher, IonRefresherContent, IonSkeletonText, LineChartComponent,
  ],
  templateUrl: './labs.page.html',
  styleUrl: './labs.page.scss',
})
export class LabsPage implements OnInit {
  private readonly labs = inject(LabService);
  private readonly notify = inject(NotifyService);
  private readonly habits = inject(HabitsService);

  readonly fields = FIELDS;
  readonly tgRefs = [{ value: 150, label: '150' }, { value: 200, label: '200' }];
  readonly levelLabels = TG_LEVEL_LABELS;
  readonly classifyTg = classifyTg;

  readonly results = signal<LabResult[]>([]);
  readonly saving = signal(false);
  readonly loaded = signal(false);
  /** Cada intervalo entre dos análisis de TG con lo que pasó en el medio (los últimos tres). */
  readonly intervals = signal<{ from: string; to: string; tgFrom: number; tgTo: number; stats: PeriodStats }[]>([]);

  readonly today = toIsoDate(new Date());
  readonly dateRaw = signal(this.today);
  readonly raw = signal<Record<FieldKey, string>>({ tg: '', hdl: '', ldl: '', total_chol: '', glucose: '' });

  readonly withTg = computed(() => this.results().filter((r) => r.tg !== null));
  readonly tgPoints = computed(() => this.withTg().map((r) => ({ label: r.date, value: r.tg! })));
  readonly latestTg = computed(() => this.withTg().at(-1)?.tg ?? null);
  readonly tgChange = computed(() => percentChange(this.withTg().map((r) => r.tg!)));
  /** Proporción del gráfico según el ancho de pantalla, para que el texto no quede diminuto en celular. */
  readonly chartSize = window.innerWidth < 600 ? { w: 360, h: 240 } : { w: 640, h: 220 };
  readonly latestDate = computed(() => this.withTg().at(-1)?.date ?? null);
  readonly fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  readonly newestFirst = computed(() => [...this.results()].reverse());

  /** Valores cargados; vacío = no medido. Cada campo informado debe ser entero razonable. */
  private readonly parsed = computed(() => {
    const entries = FIELDS.map((f) => [f.key, this.raw()[f.key].trim()] as const).filter(([, v]) => v !== '');
    return entries.map(([key, v]) => [key, parseDecimal(v)] as const);
  });
  readonly canSave = computed(
    () => /^\d{4}-\d{2}-\d{2}$/.test(this.dateRaw()) && this.parsed().length > 0 &&
      this.parsed().every(([, n]) => isLabValue(n)),
  );

  constructor() {
    addIcons({ trashOutline, flaskOutline });
  }

  ngOnInit() {
    return this.load();
  }

  refresh(ev: Event) {
    return finishRefresh(ev, () => this.load());
  }

  private async load() {
    try {
      this.results.set(await this.labs.all());
      this.loaded.set(true);
      this.loadIntervals();
    } catch (e) {
      this.notify.error(e);
      this.loaded.set(true);
    }
  }

  /** Las métricas de hábitos son un extra: si falla la consulta, el resto de la pantalla sigue andando. */
  private async loadIntervals() {
    const tg = this.withTg();
    const pairs = tg.slice(-4).flatMap((cur, i, arr) => (i === 0 ? [] : [[arr[i - 1], cur] as const]));
    if (!pairs.length) return;
    try {
      const data = await this.habits.between(pairs[0][0].date, pairs.at(-1)![1].date);
      this.intervals.set(
        pairs.map(([a, b]) => ({ from: a.date, to: b.date, tgFrom: a.tg!, tgTo: b.tg!, stats: periodStats(a.date, b.date, data) })).reverse(),
      );
    } catch {
      this.intervals.set([]);
    }
  }

  readonly exporting = signal(false);

  /** Análisis + peso y cintura en una sola tabla. */
  private async reportData() {
    return reportRows(this.results(), await this.habits.bodyHistory());
  }

  async exportCsv() {
    this.exporting.set(true);
    try {
      const blob = new Blob([reportCsv(await this.reportData())], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `trigli-${this.today}.csv` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.exporting.set(false);
    }
  }

  /** Abre el informe en otra pestaña listo para imprimir o guardar como PDF. */
  async exportPdf() {
    this.exporting.set(true);
    try {
      const html = reportHtml(await this.reportData(), new Date().toLocaleDateString('es-AR'));
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const win = window.open(url, '_blank');
      if (!win) throw new Error('El navegador bloqueó la ventana. Permitila e intentá de nuevo.');
      win.addEventListener('load', () => win.print());
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.exporting.set(false);
    }
  }

  decimal(n: number): string {
    return String(n).replace('.', ',');
  }

  setField(key: FieldKey, value: string) {
    this.raw.update((r) => ({ ...r, [key]: value }));
  }

  async save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    try {
      const lab: NewLab = { date: this.dateRaw(), ...Object.fromEntries(this.parsed()) };
      const saved = await this.labs.add(lab);
      this.results.update((list) => [...list, saved].sort((a, b) => a.date.localeCompare(b.date)));
      this.loadIntervals();
      this.raw.set({ tg: '', hdl: '', ldl: '', total_chol: '', glucose: '' });
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string) {
    try {
      await this.labs.remove(id);
      this.results.update((list) => list.filter((r) => r.id !== id));
      this.loadIntervals();
    } catch (e) {
      this.notify.error(e);
    }
  }

  /** Los valores de un análisis menos los triglicéridos, que van destacados aparte. */
  summary(r: LabResult): string {
    return FIELDS.filter((f) => f.key !== 'tg' && r[f.key] !== null).map((f) => `${f.label.split(' ')[0]} ${r[f.key]}`).join(' · ');
  }


}
