import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCheckbox, IonContent, IonHeader,
  IonIcon, IonItem, IonLabel, IonList, IonModal, IonNote, IonTextarea, IonTitle, IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, logOutOutline, addCircleOutline } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import { Supabase } from '../../core/supabase';
import {
  FLAG_DEFS, levelForDay, levelForMeal, MEAL_LABELS, MEAL_ORDER, MealFlags, MealType, scoreDay, scoreMeal,
} from './meal-scoring';
import { MealLog, MealService } from './meal.service';

@Component({
  selector: 'app-meal-log',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCard,
    IonCardContent, IonList, IonItem, IonLabel, IonNote, IonBadge, IonModal, IonCheckbox, IonTextarea,
  ],
  templateUrl: './meal-log.page.html',
  styleUrl: './meal-log.page.scss',
})
export class MealLogPage implements OnInit {
  private readonly meals = inject(MealService);
  private readonly sb = inject(Supabase);
  private readonly toast = inject(ToastController);
  private readonly route = inject(ActivatedRoute);

  readonly flagDefs = FLAG_DEFS;
  readonly negativeFlags = FLAG_DEFS.filter((f) => f.weight < 0);
  readonly positiveFlags = FLAG_DEFS.filter((f) => f.weight > 0);
  readonly mealOrder = MEAL_ORDER;
  readonly mealLabels = MEAL_LABELS;
  readonly levelForMeal = levelForMeal;

  readonly date = signal(toIsoDate(new Date()));
  readonly entries = signal<MealLog[]>([]);
  readonly loading = signal(false);

  readonly isToday = computed(() => this.date() === toIsoDate(new Date()));
  readonly byType = computed(() => new Map(this.entries().map((e) => [e.meal_type, e])));
  readonly dayScore = computed(() => scoreDay(this.entries().map((e) => e.score)));
  readonly dayLevel = computed(() => {
    const s = this.dayScore();
    return s === null ? null : levelForDay(s);
  });
  readonly hadAlcohol = computed(() => this.entries().some((e) => e.flags.alcohol));

  // Editor
  readonly editing = signal<MealType | null>(null);
  readonly draftFlags = signal<MealFlags>({});
  draftNotes = '';
  readonly draftScore = computed(() => scoreMeal(this.draftFlags()));
  readonly saving = signal(false);

  readonly dateLabel = computed(() =>
    new Date(this.date() + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'short',
    }),
  );

  constructor() {
    addIcons({ chevronBack, chevronForward, logOutOutline, addCircleOutline });
    // Desde el Resumen: ?fecha=YYYY-MM-DD&comida=dinner abre el editor de esa comida.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(async (params) => {
      const fecha = params.get('fecha');
      const comida = params.get('comida') as MealType | null;
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
      this.date.set(fecha);
      await this.load();
      if (comida && MEAL_ORDER.includes(comida)) this.open(comida);
    });
  }

  ngOnInit() {
    if (!this.route.snapshot.queryParamMap.has('fecha')) this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.entries.set(await this.meals.byDate(this.date()));
    } catch (e) {
      this.showError(e);
    } finally {
      this.loading.set(false);
    }
  }

  shiftDay(delta: number) {
    const d = new Date(this.date() + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    this.date.set(toIsoDate(d));
    this.load();
  }

  open(type: MealType) {
    const existing = this.byType().get(type);
    this.draftFlags.set({ ...(existing?.flags ?? {}) });
    this.draftNotes = existing?.notes ?? '';
    this.editing.set(type);
  }

  close() {
    this.editing.set(null);
  }

  toggle(key: keyof MealFlags, checked: boolean) {
    this.draftFlags.update((f) => ({ ...f, [key]: checked }));
  }

  async save() {
    const type = this.editing();
    if (!type) return;
    this.saving.set(true);
    try {
      const saved = await this.meals.save(this.date(), type, this.draftFlags(), this.draftNotes);
      this.entries.update((list) => [...list.filter((e) => e.meal_type !== type), saved]);
      this.close();
    } catch (e) {
      this.showError(e);
    } finally {
      this.saving.set(false);
    }
  }

  async remove() {
    const existing = this.editing() && this.byType().get(this.editing()!);
    if (!existing) return this.close();
    try {
      await this.meals.remove(existing.id);
      this.entries.update((list) => list.filter((e) => e.id !== existing.id));
      this.close();
    } catch (e) {
      this.showError(e);
    }
  }

  flagLabels(flags: MealFlags): string {
    return FLAG_DEFS.filter((f) => flags[f.key]).map((f) => f.label).join(' · ');
  }

  logout() {
    this.sb.signOut().then(() => location.assign('/login'));
  }

  private async showError(e: unknown) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error';
    (await this.toast.create({ message, duration: 3000, color: 'danger' })).present();
  }
}
