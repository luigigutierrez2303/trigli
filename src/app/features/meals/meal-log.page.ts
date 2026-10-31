import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonHeader,
  IonIcon, IonItem, IonLabel, IonInput, IonList, IonModal, IonSearchbar, IonSegment, IonSegmentButton, IonTextarea, IonTitle, IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, addCircleOutline } from 'ionicons/icons';
import { toIsoDate } from '../../core/date';
import { Supabase } from '../../core/supabase';
import { parseDecimal } from '../activity/activity';
import { dailyPlan, dayBalance, DAY_LEVEL_LABELS, itemsKcal, mergeItems, MealItem } from '../energy/energy';
import { flagsOfItems, Food, FOOD_CATEGORIES, FOODS } from '../energy/foods';
import { ProfileService } from '../energy/profile.service';
import {
  ALL_FLAG_DEFS, FLAG_DEFS, hasAlcohol, levelForDay, levelForMeal, MEAL_LABELS, MEAL_ORDER, MealFlags, MealType, scoreDay, scoreMeal,
} from './meal-scoring';
import { FavoriteMeal, FavoriteService } from './favorite.service';
import { MealLog, MealService } from './meal.service';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-meal-log',
  imports: [
    DecimalPipe, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCard,
    IonCardContent, IonList, IonItem, IonLabel, IonBadge, IonModal, IonSearchbar, IonTextarea, IonInput,
    IonSegment, IonSegmentButton,
  ],
  templateUrl: './meal-log.page.html',
  styleUrl: './meal-log.page.scss',
})
export class MealLogPage implements OnInit {
  private readonly meals = inject(MealService);
  private readonly sb = inject(Supabase);
  private readonly toast = inject(ToastController);
  private readonly route = inject(ActivatedRoute);
  private readonly profiles = inject(ProfileService);
  private readonly favoriteService = inject(FavoriteService);

  readonly flagDefs = FLAG_DEFS;
  /** Catálogo en orden alfabético para recorrerlo con el buscador. */
  readonly foods = [...FLAG_DEFS].sort((a, b) => a.label.localeCompare(b.label, 'es'));
  readonly query = signal('');
  readonly visibleFoods = computed(() => {
    const q = normalize(this.query());
    return q ? this.foods.filter((f) => normalize(`${f.label} ${f.hint}`).includes(q)) : this.foods;
  });
  /** Lo elegido en el editor (incluye marcas viejas), para mostrarlo arriba. */
  /** Lo elegido en el editor (incluye marcas viejas y las que vienen de los alimentos), para mostrarlo arriba. */
  readonly picked = computed(() => ALL_FLAG_DEFS.filter((f) => this.effectiveFlags()[f.key]));
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
  readonly hadAlcohol = computed(() => this.entries().some((e) => hasAlcohol(e.flags)));

  // Calorías
  readonly dayLevelLabels = DAY_LEVEL_LABELS;
  readonly target = signal<number | null>(null);
  readonly burned = signal(0);
  readonly dayKcal = computed(() => this.entries().reduce((sum, e) => sum + (e.kcal ?? 0), 0));
  readonly balance = computed(() => {
    const target = this.target();
    return target === null ? null : dayBalance(this.dayKcal(), target, this.burned(), !this.isToday() || new Date().getHours() >= 19);
  });

  // Editor
  readonly tab = signal<'kcal' | 'calidad'>('kcal');
  readonly draftItems = signal<MealItem[]>([]);
  readonly draftKcal = computed(() => itemsKcal(this.draftItems()));
  readonly foodQuery = signal('');
  readonly foodCategories = FOOD_CATEGORIES;
  /** Categoría elegida ('' = todas). */
  readonly foodCat = signal('');
  readonly visibleKcalFoods = computed(() => {
    const q = normalize(this.foodQuery());
    const cat = this.foodCat();
    const inCat = cat ? FOODS.filter((f) => f.cat === cat) : FOODS;
    const found = q ? inCat.filter((f) => normalize(`${f.name} ${f.portion}`).includes(q)) : inCat;
    return found.slice(0, q || cat ? 60 : 15);
  });
  // Favoritas y repetir
  readonly favorites = signal<FavoriteMeal[]>([]);
  /** Última comida del mismo tipo registrada antes; se ofrece para repetir. */
  readonly previous = signal<MealLog | null>(null);
  readonly manageFavs = signal(false);
  readonly showFavForm = signal(false);
  favName = '';
  readonly favKcal = (fav: FavoriteMeal) => itemsKcal(fav.items);
  manualName = '';
  manualKcalRaw = signal('');
  readonly editing = signal<MealType | null>(null);
  readonly draftFlags = signal<MealFlags>({});
  draftNotes = '';
  /** Marcas que salen solas de los alimentos cargados por calorías. */
  readonly derivedFlags = computed<MealFlags>(() => flagsOfItems(this.draftItems().map((i) => i.name)));
  readonly effectiveFlags = computed<MealFlags>(() => ({ ...this.draftFlags(), ...this.derivedFlags() }));
  readonly draftScore = computed(() => scoreMeal(this.effectiveFlags()));
  readonly saving = signal(false);

  readonly dateLabel = computed(() =>
    new Date(this.date() + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'short',
    }),
  );

  constructor() {
    effect(() => {
      this.profiles.changes();
      untracked(() => void this.loadEnergy());
    });
    addIcons({ chevronBack, chevronForward, addCircleOutline });
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
    this.favoriteService.list().then((list) => this.favorites.set(list)).catch(() => undefined);
  }

  /** Meta diaria y kcal quemadas; se recarga cuando cambia el perfil, el peso o los entrenos. */
  private async loadEnergy() {
    try {
      const [profile, weight, energy] = await Promise.all([
        this.profiles.get(), this.profiles.latestWeight(), this.profiles.dayEnergy(this.date()),
      ]);
      this.target.set(profile && weight ? dailyPlan(profile, weight, toIsoDate(new Date())).target : null);
      this.burned.set(energy.burned);
    } catch { /* el balance es opcional */ }
  }

  async load() {
    this.loading.set(true);
    try {
      this.entries.set(await this.meals.byDate(this.date()));
      await this.loadEnergy();
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
    // Lo que venga de alimentos se recalcula solo: acá queda solo lo marcado a mano.
    const fromItems = flagsOfItems((existing?.items ?? []).map((i) => i.name));
    this.draftFlags.set(Object.fromEntries(Object.entries(existing?.flags ?? {}).filter(([k]) => !fromItems[k])));
    this.draftNotes = existing?.notes ?? '';
    this.draftItems.set((existing?.items ?? []).map((i) => ({ ...i })));
    this.query.set('');
    this.foodQuery.set('');
    this.foodCat.set('');
    this.manualName = '';
    this.manualKcalRaw.set('');
    this.tab.set('kcal');
    this.manageFavs.set(false);
    this.showFavForm.set(false);
    this.favName = '';
    this.previous.set(null);
    this.meals.latestOfType(type, this.date()).then((p) => this.previous.set(p)).catch(() => undefined);
    this.editing.set(type);
  }

  close() {
    this.editing.set(null);
  }

  addFood(food: Food) {
    this.draftItems.update((items) => {
      const same = items.find((i) => i.name === food.name && i.kcal === food.kcal && i.protein === food.protein);
      return same ? items.map((i) => (i === same ? { ...i, qty: i.qty + 1 } : i)) : [...items, { name: food.name, kcal: food.kcal, protein: food.protein, ...(food.grams ? { refGrams: food.grams } : {}), qty: 1 }];
    });
  }

  readonly manualKcal = computed(() => parseDecimal(this.manualKcalRaw()));
  readonly canAddManual = computed(() => {
    const k = this.manualKcal();
    return k !== null && k > 0 && k <= 5000;
  });

  addManual() {
    const kcal = this.manualKcal();
    if (!this.canAddManual() || kcal === null) return;
    this.draftItems.update((items) => [...items, { name: this.manualName.trim() || 'Otro', kcal: Math.round(kcal), qty: 1 }]);
    this.manualName = '';
    this.manualKcalRaw.set('');
  }

  /** Marcas manuales de un conjunto de flags: las que no vienen de los alimentos. */
  private manualFlags(flags: MealFlags, items: MealItem[]): MealFlags {
    const fromItems = flagsOfItems(items.map((i) => i.name));
    return Object.fromEntries(Object.entries(flags).filter(([k, v]) => v && !fromItems[k]));
  }

  /** Copia a la comida en edición los alimentos y marcas de otra (una favorita o la última del tipo). */
  private applyMeal(items: MealItem[], flags: MealFlags) {
    this.draftItems.update((current) => mergeItems(current, items));
    this.draftFlags.update((current) => ({ ...current, ...this.manualFlags(flags, items) }));
  }

  repeatPrevious() {
    const p = this.previous();
    if (p) this.applyMeal(p.items, p.flags);
  }

  applyFavorite(fav: FavoriteMeal) {
    this.applyMeal(fav.items, fav.flags);
  }

  async saveFavorite() {
    const name = this.favName.trim();
    if (!name || !this.draftItems().length) return;
    try {
      const fav = await this.favoriteService.add(name, this.draftItems(), this.manualFlags(this.draftFlags(), this.draftItems()));
      this.favorites.update((list) => [fav, ...list]);
      this.favName = '';
      this.showFavForm.set(false);
    } catch (e) {
      this.showError(e);
    }
  }

  async removeFavorite(id: string) {
    try {
      await this.favoriteService.remove(id);
      this.favorites.update((list) => list.filter((f) => f.id !== id));
    } catch (e) {
      this.showError(e);
    }
  }

  /** Gramos de un ítem que tiene peso de referencia. */
  gramsOf(item: MealItem): number {
    return Math.round(item.qty * (item.refGrams ?? 0));
  }

  qtyLabel(qty: number): string {
    return String(Math.round(qty * 100) / 100).replace('.', ',');
  }

  /** El usuario escribe gramos: se traduce a porciones. Vacío o inválido deja la cantidad como está. */
  setGrams(index: number, raw: string) {
    const grams = parseDecimal(raw);
    if (grams === null || grams <= 0 || grams > 5000) return;
    this.draftItems.update((items) =>
      items.map((item, i) => (i === index && item.refGrams ? { ...item, qty: Math.round((grams / item.refGrams) * 1000) / 1000 } : item)),
    );
  }

  changeQty(index: number, delta: number) {
    this.draftItems.update((items) =>
      items.flatMap((item, i) => (i !== index ? [item] : item.qty + delta <= 0 ? [] : [{ ...item, qty: item.qty + delta }])),
    );
  }

  toggle(key: keyof MealFlags, checked: boolean) {
    this.draftFlags.update((f) => ({ ...f, [key]: checked }));
  }

  async save() {
    const type = this.editing();
    if (!type) return;
    this.saving.set(true);
    try {
      const saved = await this.meals.save(
        this.date(), type, this.effectiveFlags(), this.draftNotes, this.draftItems(), this.draftItems().length ? this.draftKcal() : null,
      );
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
    return ALL_FLAG_DEFS.filter((f) => flags[f.key]).map((f) => f.label).join(' · ');
  }


  private async showError(e: unknown) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error';
    (await this.toast.create({ message, duration: 3000, color: 'danger' })).present();
  }
}
