import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon, IonProgressBar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, chevronBack, chevronForward } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import { cardioProgress, weekEnd, weekStart } from '../activity/activity';
import { EnergyProgressComponent } from '../energy/energy-progress.component';
import { EnergyTodayComponent } from '../energy/energy-today.component';
import { classifyTg, percentChange, TG_LEVEL_LABELS } from '../labs/labs';
import { LineChartComponent } from '../labs/line-chart.component';
import { MEAL_LABELS, MEAL_ORDER, MealType } from '../meals/meal-scoring';
import { dailyBars, GridDay, summarizeWeek, weekGrid, weekWeightChange } from './dashboard';
import { DashboardService, WeekData } from './dashboard.service';

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

@Component({
  selector: 'app-dashboard',
  imports: [
    IonButton, IonIcon, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonBadge, IonProgressBar, LineChartComponent, RouterLink, EnergyTodayComponent, EnergyProgressComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly toast = inject(ToastController);

  readonly dayLetters = DAY_LETTERS;
  readonly mealOrder = MEAL_ORDER;
  readonly mealLabels = MEAL_LABELS;
  readonly tgRefs = [{ value: 150, label: '' }];
  readonly levelLabels = TG_LEVEL_LABELS;
  readonly classifyTg = classifyTg;

  readonly monday = signal(weekStart(toIsoDate(new Date())));
  readonly data = signal<WeekData | null>(null);

  readonly isCurrentWeek = computed(() => this.monday() === weekStart(toIsoDate(new Date())));
  readonly weekLabel = computed(() => {
    const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    return this.isCurrentWeek() ? 'Esta semana' : `${fmt(this.monday())} – ${fmt(weekEnd(this.monday()))}`;
  });
  readonly summary = computed(() => summarizeWeek(this.data()?.scores ?? [], this.data()?.workouts ?? []));
  readonly cardio = computed(() => cardioProgress(this.summary().cardioMin));
  readonly weightChange = computed(() => weekWeightChange(this.data()?.weights ?? []));
  readonly bars = computed(() => dailyBars(this.monday(), this.data()?.scores ?? []));

  /** "Semana del 26 oct al 1 nov", para el encabezado de escritorio. */
  readonly weekTitle = computed(() => {
    const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    return `Semana del ${fmt(this.monday())} al ${fmt(weekEnd(this.monday()))}`;
  });
  readonly grid = computed(() =>
    weekGrid(this.monday(), toIsoDate(new Date()), {
      meals: this.data()?.meals ?? [],
      workouts: this.data()?.workouts ?? [],
      metrics: this.data()?.metrics ?? [],
    }),
  );
  readonly weightWeekLevel = computed(() => ((this.weightChange() ?? 0) <= 0 ? 'good' : 'warn'));
  readonly tgPoints = computed(() => (this.data()?.tgSeries ?? []).map((r) => ({ label: r.date, value: r.tg })));
  readonly tgChange = computed(() => percentChange((this.data()?.tgSeries ?? []).map((r) => r.tg)));
  readonly firstTgDate = computed(() => this.data()?.tgSeries[0]?.date ?? null);

  constructor() {
    addIcons({ addCircleOutline, chevronBack, chevronForward });
  }

  ngOnInit() {
    this.load();
  }

  async load() {
    try {
      this.data.set(await this.dashboard.week(this.monday(), weekEnd(this.monday())));
    } catch (e) {
      const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error';
      (await this.toast.create({ message, duration: 3000, color: 'danger' })).present();
    }
  }

  shiftWeek(delta: number) {
    const d = new Date(this.monday() + 'T12:00:00');
    d.setDate(d.getDate() + delta * 7);
    this.monday.set(toIsoDate(d));
    this.load();
  }

  /** "Lun 26" para el encabezado de la tabla; el de hoy dice "Hoy 30". */
  dayHeader(day: GridDay, index: number): string {
    const n = Number(day.date.slice(8));
    return `${day.isToday ? 'Hoy' : DAY_NAMES[index]} ${n}`;
  }

  /** Coma decimal para pesos y variaciones: 84,2. */
  decimal(n: number): string {
    return String(n).replace('.', ',');
  }

  /** Variación con signo explícito y menos tipográfico: "−0,6", "+1,2". */
  signed(n: number): string {
    return `${n > 0 ? '+' : n < 0 ? '−' : ''}${this.decimal(Math.abs(n))}`;
  }

  mealQuery(day: GridDay, meal: MealType) {
    return { fecha: day.date, comida: meal };
  }

}
