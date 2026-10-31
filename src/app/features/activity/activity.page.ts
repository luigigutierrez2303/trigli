import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader,
  IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonProgressBar, IonSelect, IonSelectOption, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, logOutOutline, trashOutline, walkOutline } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import { Supabase } from '../../core/supabase';
import {
  cardioProgress, isValidMinutes, isValidWaist, isValidWeight, parseDecimal, weekEnd, weekStart, weightDelta,
  WEEKLY_CARDIO_GOAL_MIN,
} from './activity';
import { CARDIO_ACTIVITIES, cardioActivity, kcalBurned } from '../energy/energy';
import { ProfileService } from '../energy/profile.service';
import { ActivityService, BodyMetric, CardioWorkout } from './activity.service';

@Component({
  selector: 'app-activity',
  imports: [
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonNote, IonBadge, IonInput, IonProgressBar,
    IonSelect, IonSelectOption,
  ],
  templateUrl: './activity.page.html',
  styleUrl: './activity.page.scss',
})
export class ActivityPage implements OnInit {
  private readonly activity = inject(ActivityService);
  private readonly profiles = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly sb = inject(Supabase);
  private readonly toast = inject(ToastController);

  readonly weeklyGoal = WEEKLY_CARDIO_GOAL_MIN;

  readonly date = signal(toIsoDate(new Date()));
  /** Cardio de toda la semana de `date`; el del día se deriva de acá. */
  readonly weekCardio = signal<CardioWorkout[]>([]);
  readonly metric = signal<BodyMetric | null>(null);
  readonly prevWeight = signal<number | null>(null);
  readonly saving = signal(false);

  readonly isToday = computed(() => this.date() === toIsoDate(new Date()));
  readonly dayCardio = computed(() => this.weekCardio().filter((w) => w.date === this.date()));
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
  readonly activityLabel = (key: string | null) => cardioActivity(key)?.label ?? null;
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
    addIcons({ chevronBack, chevronForward, logOutOutline, trashOutline, walkOutline });
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
      const [cardio, metric, prev, lastWeight] = await Promise.all([
        this.activity.cardioBetween(weekStart(date), weekEnd(date)),
        this.activity.metricByDate(date),
        this.activity.previousWeight(date),
        this.profiles.latestWeight(),
      ]);
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

  async removeCardio(id: string) {
    try {
      await this.activity.removeWorkout(id);
      this.weekCardio.update((list) => list.filter((w) => w.id !== id));
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
      this.lastWeight.set(await this.profiles.latestWeight());
    } catch (e) {
      this.showError(e);
    } finally {
      this.saving.set(false);
    }
  }

  logout() {
    this.sb.signOut().then(() => location.assign('/login'));
  }

  private async showError(e: unknown) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error';
    (await this.toast.create({ message, duration: 3000, color: 'danger' })).present();
  }
}
