import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonProgressBar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, createOutline, trashOutline, walkOutline } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import {
  CardioCombo, cardioProgress, compareWeeks, isValidMinutes, metricPoints, isValidWaist, isValidWeight, parseDecimal, topCombos, weekEnd, weekStart, weightDelta,
  WEEKLY_CARDIO_GOAL_MIN,
} from './activity';
import { CARDIO_ACTIVITIES, cardioActivity, kcalBurned } from '../energy/energy';
import { ProfileService } from '../energy/profile.service';
import { LineChartComponent } from '../labs/line-chart.component';
import { ActivityService, BodyMetric, CardioWorkout } from './activity.service';

@Component({
  selector: 'app-activity',
  imports: [
    IonButton, IonIcon, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonNote, IonBadge, IonInput, IonProgressBar, LineChartComponent,
  ],
  templateUrl: './activity.page.html',
  styleUrl: './activity.page.scss',
})
export class ActivityPage implements OnInit {
  private readonly activity = inject(ActivityService);
  private readonly profiles = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastController);

  readonly weeklyGoal = WEEKLY_CARDIO_GOAL_MIN;

  readonly date = signal(toIsoDate(new Date()));
  /** Cardio de toda la semana de `date`; el del día se deriva de acá. */
  readonly weekCardio = signal<CardioWorkout[]>([]);
  readonly metric = signal<BodyMetric | null>(null);
  readonly prevWeight = signal<number | null>(null);
  readonly saving = signal(false);
  /** Cardio que se está corrigiendo con el formulario de abajo (null = cargando uno nuevo). */
  readonly editingId = signal<string | null>(null);
  readonly suggestions = signal<CardioCombo[]>([]);
  /** Kcal quemadas en la semana en pantalla y en la anterior (cardio, fuerza y el total de Salud). */
  readonly weekKcal = signal<{ now: number; previous: number } | null>(null);
  readonly waistRows = signal<{ date: string; waist_cm: number }[]>([]);
  readonly waistPoints = computed(() => metricPoints(this.waistRows().map((r) => ({ date: r.date, value: r.waist_cm }))));
  readonly kcalCompare = computed(() => {
    const w = this.weekKcal();
    return w ? compareWeeks(w.now, w.previous) : null;
  });

  readonly isToday = computed(() => this.date() === toIsoDate(new Date()));
  readonly dayCardio = computed(() => this.weekCardio().filter((w) => w.date === this.date()));
  readonly editing = computed(() => this.weekCardio().find((w) => w.id === this.editingId()) ?? null);
  /** Con un total de Salud en el día, el cardio manual no suma kcal al balance. */
  readonly hasHealthDay = computed(() => this.dayCardio().some((w) => w.source === 'health'));
  readonly progress = computed(() => cardioProgress(this.weekCardio().reduce((sum, w) => sum + w.duration_min, 0)));
  readonly delta = computed(() => weightDelta(this.metric()?.weight_kg ?? null, this.prevWeight()));
  readonly dateLabel = computed(() =>
    new Date(this.date() + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'short',
    }),
  );

  // Formularios
  readonly minutesRaw = signal('');
  readonly cardioNotes = signal('');
  readonly activities = CARDIO_ACTIVITIES;
  readonly activityKey = signal('walk_fast');
  readonly quickMinutes = [15, 30, 45, 60];
  /** Minutos de cada día de la semana en pantalla, para las barras. */
  readonly weekDays = computed(() => {
    const monday = weekStart(this.date());
    const today = toIsoDate(new Date());
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const days = names.map((name, i) => {
      const d = new Date(monday + 'T12:00:00');
      d.setDate(d.getDate() + i);
      const date = toIsoDate(d);
      const minutes = this.weekCardio().filter((w) => w.date === date).reduce((sum, w) => sum + w.duration_min, 0);
      return { date, name, letter: name[0], minutes, future: date > today, selected: date === this.date(), pct: 0 };
    });
    const top = Math.max(60, ...days.map((d) => d.minutes));
    return days.map((d) => ({ ...d, pct: d.minutes ? Math.max((d.minutes / top) * 100, 8) : 0 }));
  });
  readonly activityLabel = (key: string | null) => cardioActivity(key)?.label ?? null;
  readonly comboLabel = (c: CardioCombo) => `${this.activityLabel(c.activity) ?? c.activity} · ${c.minutes} min`;
  /** Último peso conocido, para estimar las kcal del cardio. */
  private readonly lastWeight = signal<number | null>(null);
  readonly cardioKcal = computed(() => {
    const w = this.lastWeight();
    const min = this.minutes();
    const act = cardioActivity(this.activityKey());
    return w && act && isValidMinutes(min) ? kcalBurned(act.met, w, min) : null;
  });
  readonly weightRaw = signal('');
  readonly waistRaw = signal('');

  readonly minutes = computed(() => parseDecimal(this.minutesRaw()));
  readonly canAddCardio = computed(() => isValidMinutes(this.minutes()));
  readonly weight = computed(() => parseDecimal(this.weightRaw()));
  readonly waist = computed(() => parseDecimal(this.waistRaw()));
  readonly canSaveMetric = computed(() => {
    const hasWeight = this.weightRaw().trim() !== '';
    const hasWaist = this.waistRaw().trim() !== '';
    return (
      (hasWeight || hasWaist) &&
      (!hasWeight || isValidWeight(this.weight())) &&
      (!hasWaist || isValidWaist(this.waist()))
    );
  });

  constructor() {
    addIcons({ chevronBack, chevronForward, createOutline, trashOutline, walkOutline });
    // Desde el Resumen: ?fecha=YYYY-MM-DD abre Actividad en ese día.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const fecha = params.get('fecha');
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
      this.date.set(fecha);
      this.load();
    });
  }

  ngOnInit() {
    if (!this.route.snapshot.queryParamMap.has('fecha')) this.load();
  }

  async load() {
    const date = this.date();
    try {
      const prevMonday = new Date(weekStart(date) + 'T12:00:00');
      prevMonday.setDate(prevMonday.getDate() - 7);
      const prevStart = toIsoDate(prevMonday);
      const [cardio, metric, prev, lastWeight, recent, thisWeek, lastWeek, waist] = await Promise.all([
        this.activity.cardioBetween(weekStart(date), weekEnd(date)),
        this.activity.metricByDate(date),
        this.activity.previousWeight(date),
        this.profiles.latestWeight(),
        this.activity.recentCardio().catch(() => []),
        this.profiles.energyBetween(weekStart(date), weekEnd(date)).catch(() => []),
        this.profiles.energyBetween(prevStart, weekEnd(prevStart)).catch(() => []),
        this.activity.waistSeries().catch(() => []),
      ]);
      const burned = (days: { burned: number }[]) => days.reduce((sum, d) => sum + d.burned, 0);
      this.weekKcal.set({ now: burned(thisWeek), previous: burned(lastWeek) });
      this.waistRows.set(waist);
      this.suggestions.set(topCombos(recent));
      this.weekCardio.set(cardio);
      this.metric.set(metric);
      this.prevWeight.set(prev);
      this.lastWeight.set(lastWeight);
      this.weightRaw.set(metric?.weight_kg != null ? String(metric.weight_kg) : '');
      this.waistRaw.set(metric?.waist_cm != null ? String(metric.waist_cm) : '');
    } catch (e) {
      this.showError(e);
    }
  }

  goTo(date: string) {
    this.date.set(date);
    this.load();
  }

  shiftDay(delta: number) {
    const d = new Date(this.date() + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    this.date.set(toIsoDate(d));
    this.load();
  }

  async addCardio() {
    if (!this.canAddCardio()) return;
    this.saving.set(true);
    try {
      const saved = await this.activity.addCardio(
        this.date(), this.minutes()!, this.cardioNotes(), this.activityKey(), this.cardioKcal(),
      );
      this.weekCardio.update((list) => [...list, saved]);
      this.minutesRaw.set('');
      this.cardioNotes.set('');
    } catch (e) {
      this.showError(e);
    } finally {
      this.saving.set(false);
    }
  }

  async quickAdd(c: CardioCombo) {
    this.activityKey.set(c.activity);
    this.minutesRaw.set(String(c.minutes));
    await this.addCardio();
  }

  startEdit(w: CardioWorkout) {
    this.editingId.set(w.id);
    this.activityKey.set(w.activity ?? this.activityKey());
    this.minutesRaw.set(w.duration_min ? String(w.duration_min) : '');
    this.cardioNotes.set(w.notes ?? '');
    document.getElementById('cardio-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.minutesRaw.set('');
    this.cardioNotes.set('');
  }

  async saveEdit() {
    const w = this.editing();
    if (!w || !this.canAddCardio()) return;
    this.saving.set(true);
    try {
      // El total de Salud conserva sus kcal; las de un cardio manual se recalculan con el tipo y los minutos nuevos.
      const kcal = w.source === 'health' ? null : this.cardioKcal();
      const saved = await this.activity.updateCardio(w.id, {
        duration_min: this.minutes()!, activity: this.activityKey(), notes: this.cardioNotes().trim() || null,
        ...(kcal !== null ? { kcal } : {}),
      });
      this.weekCardio.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
      this.cancelEdit();
    } catch (e) {
      this.showError(e);
    } finally {
      this.saving.set(false);
    }
  }

  async removeCardio(id: string) {
    try {
      await this.activity.removeWorkout(id);
      this.weekCardio.update((list) => list.filter((w) => w.id !== id));
      if (this.editingId() === id) this.cancelEdit();
    } catch (e) {
      this.showError(e);
    }
  }

  async saveMetric() {
    if (!this.canSaveMetric()) return;
    this.saving.set(true);
    try {
      const values: { weight_kg?: number; waist_cm?: number } = {};
      if (this.weightRaw().trim() !== '') values.weight_kg = this.weight()!;
      if (this.waistRaw().trim() !== '') values.waist_cm = this.waist()!;
      this.metric.set(await this.activity.saveMetric(this.date(), values));
      this.waistRows.set(await this.activity.waistSeries().catch(() => this.waistRows()));
      this.lastWeight.set(await this.profiles.latestWeight());
    } catch (e) {
      this.showError(e);
    } finally {
      this.saving.set(false);
    }
  }


  private async showError(e: unknown) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error';
    (await this.toast.create({ message, duration: 3000, color: 'danger' })).present();
  }
}
