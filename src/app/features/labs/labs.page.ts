import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader,
  IonIcon, IonInput, IonItem, IonLabel, IonNote, IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, trashOutline, flaskOutline } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import { Supabase } from '../../core/supabase';
import { parseDecimal } from '../activity/activity';
import { classifyTg, percentChange, TG_LEVEL_LABELS } from './labs';
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
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonNote, IonBadge, IonInput, LineChartComponent,
  ],
  templateUrl: './labs.page.html',
  styleUrl: './labs.page.scss',
})
export class LabsPage implements OnInit {
  private readonly labs = inject(LabService);
  private readonly sb = inject(Supabase);
  private readonly toast = inject(ToastController);

  readonly fields = FIELDS;
  readonly tgRefs = [{ value: 150, label: '150 normal' }, { value: 200, label: '200 alto' }];
  readonly levelLabels = TG_LEVEL_LABELS;
  readonly classifyTg = classifyTg;

  readonly results = signal<LabResult[]>([]);
  readonly saving = signal(false);

  readonly today = toIsoDate(new Date());
  readonly dateRaw = signal(this.today);
  readonly raw = signal<Record<FieldKey, string>>({ tg: '', hdl: '', ldl: '', total_chol: '', glucose: '' });

  readonly withTg = computed(() => this.results().filter((r) => r.tg !== null));
  readonly tgPoints = computed(() => this.withTg().map((r) => ({ label: r.date, value: r.tg! })));
  readonly latestTg = computed(() => this.withTg().at(-1)?.tg ?? null);
  readonly tgChange = computed(() => percentChange(this.withTg().map((r) => r.tg!)));
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
    addIcons({ logOutOutline, trashOutline, flaskOutline });
  }

  async ngOnInit() {
    try {
      this.results.set(await this.labs.all());
    } catch (e) {
      this.showError(e);
    }
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
      this.raw.set({ tg: '', hdl: '', ldl: '', total_chol: '', glucose: '' });
    } catch (e) {
      this.showError(e);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string) {
    try {
      await this.labs.remove(id);
      this.results.update((list) => list.filter((r) => r.id !== id));
    } catch (e) {
      this.showError(e);
    }
  }

  summary(r: LabResult): string {
    return FIELDS.filter((f) => r[f.key] !== null).map((f) => `${f.label.split(' ')[0]} ${r[f.key]}`).join(' · ');
  }

  logout() {
    this.sb.signOut().then(() => location.assign('/login'));
  }

  private async showError(e: unknown) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error';
    (await this.toast.create({ message, duration: 3000, color: 'danger' })).present();
  }
}
