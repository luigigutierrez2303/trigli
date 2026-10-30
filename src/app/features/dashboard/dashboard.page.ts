import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader,
  IonIcon, IonProgressBar, IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, logOutOutline } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import { Supabase } from '../../core/supabase';
import { cardioProgress, weekEnd, weekStart } from '../activity/activity';
import { classifyTg, TG_LEVEL_LABELS } from '../labs/labs';
import { dailyBars, summarizeWeek, weekWeightChange } from './dashboard';
import { DashboardService, WeekData } from './dashboard.service';

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

@Component({
  selector: 'app-dashboard',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonBadge, IonProgressBar,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly sb = inject(Supabase);
  private readonly toast = inject(ToastController);

  readonly dayLetters = DAY_LETTERS;
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

  constructor() {
    addIcons({ chevronBack, chevronForward, logOutOutline });
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

  logout() {
    this.sb.signOut().then(() => location.assign('/login'));
  }
}
