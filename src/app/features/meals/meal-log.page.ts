import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonFooter, IonHeader,
  IonIcon, IonItem, IonLabel, IonInput, IonList, IonModal, IonSearchbar, IonSegment, IonSegmentButton, IonTextarea, IonTitle, IonToolbar,
  ToastController,
  IonRefresher, IonRefresherContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, addCircleOutline } from 'ionicons/icons';
import { finishRefresh } from '../../core/refresh';
import { NotifyService } from '../../core/notify';
import { toIsoDate } from '../../core/date';
import { Supabase } from '../../core/supabase';
import { parseDecimal } from '../activity/activity';
import { dailyPlan, dayBalance, DAY_LEVEL_LABELS, itemsKcal, itemsProtein, mergeItems, MealItem, proteinGoal } from '../energy/energy';
import { emojiOf, flagsOfItems, Food, FOOD_CATEGORIES } from '../energy/foods';
import { FoodsService } from '../energy/foods.service';
import { ProposedItem } from '../energy/meal-analysis';
import { MealAiError, MealAiService } from './meal-ai.service';
import { frequentItems, HistoryMeal, QTY_CHOICES, streakDays, suggestProtein } from './meal-helpers';
import { SpeechService } from './speech';
import { ProfileService } from '../energy/profile.service';
import {
  ALL_FLAG_DEFS, FLAG_DEFS, hasAlcohol, isEmptyMeal, levelForDay, levelForMeal, MEAL_LABELS, MEAL_ORDER, MealFlags, MealType, scoreDay, scoreMeal,
} from './meal-scoring';
import { FavoriteMeal, FavoriteService } from './favorite.service';
import { MealLog, MealService } from './meal.service';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-meal-log',
  imports: [
    DecimalPipe, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCard,
    IonCardContent, IonFooter, IonList, IonItem, IonLabel, IonBadge, IonModal, IonSearchbar, IonTextarea, IonInput,
    IonSegment, IonSegmentButton, IonRefresher, IonRefresherContent,
  ],
  templateUrl: './meal-log.page.html',
  styleUrl: './meal-log.page.scss',
})
export class MealLogPage implements OnInit {
  private readonly meals = inject(MealService);
  private readonly sb = inject(Supabase);
  private readonly toast = inject(ToastController);
  private readonly notify = inject(NotifyService);
  private readonly route = inject(ActivatedRoute);
  private readonly profiles = inject(ProfileService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly foodsService = inject(FoodsService);
  private readonly mealAi = inject(MealAiService);
  private readonly speech = inject(SpeechService);

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
  /** Comidas del día anterior: para "repetir lo de ayer". */
  readonly yesterday = signal<MealLog[]>([]);
  /** Las de ayer en los momentos del día que hoy todavía están vacíos. */
  readonly repeatable = computed(() => this.yesterday().filter((m) => !this.entries().some((e) => e.meal_type === m.meal_type)));
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
    const all = this.foodsService.catalog();
    const inCat = cat ? all.filter((f) => f.cat === cat) : all;
    const found = q ? inCat.filter((f) => normalize(`${f.name} ${f.portion}`).includes(q)) : inCat;
    return found.slice(0, q || cat ? 60 : 15);
  });
  // Historia: frecuentes por tipo de comida y racha de días
  readonly history = signal<HistoryMeal[]>([]);
  readonly weight = signal<number | null>(null);
  readonly qtyChoices = QTY_CHOICES;
  readonly streak = computed(() => streakDays(this.history().map((h) => h.date), toIsoDate(new Date())));
  /** Lo que más suele cargar en esta comida, sin lo que ya está en el borrador. */
  readonly frequent = computed(() => {
    const type = this.editing();
    if (!type) return [];
    const inDraft = new Set(this.draftItems().map((i) => i.name));
    return frequentItems(this.history(), type, 10).filter((i) => !inDraft.has(i.name)).slice(0, 8);
  });
  emoji(name: string): string {
    return emojiOf(name, this.foodsService.catalog().find((f) => f.name === name)?.cat);
  }

  // Resumen fijo del editor: cuánto queda del día y de proteína con lo que se está cargando
  readonly draftProtein = computed(() => itemsProtein(this.draftItems()));
  private readonly otherEntries = computed(() => this.entries().filter((e) => e.meal_type !== this.editing()));
  readonly afterRemaining = computed(() => {
    const b = this.balance();
    if (!b) return null;
    const others = this.otherEntries().reduce((sum, e) => sum + (e.kcal ?? 0), 0);
    return b.budget - others - this.draftKcal();
  });
  readonly missingProtein = computed(() => {
    const w = this.weight();
    if (!w) return null;
    const others = this.otherEntries().reduce((sum, e) => sum + itemsProtein(e.items ?? []), 0);
    return Math.max(0, proteinGoal(w) - others - this.draftProtein());
  });
  readonly suggestions = computed(() => {
    const missing = this.missingProtein();
    const remaining = this.afterRemaining();
    return missing === null || remaining === null ? [] : suggestProtein(this.foodsService.catalog(), remaining, missing);
  });

  // Análisis con IA (texto o foto)
  readonly aiText = signal('');
  readonly aiImage = signal<File | null>(null);
  readonly aiBusy = signal(false);
  readonly aiError = signal<string | null>(null);
  readonly proposals = signal<ProposedItem[]>([]);
  readonly canAnalyze = computed(() => !this.aiBusy() && (!!this.aiText().trim() || !!this.aiImage()));

  readonly speechSupported = this.speech.supported;
  readonly listening = this.speech.listening;
  /** Nombres de alimentos estimados por la IA que ya se guardaron en "Mis alimentos". */
  readonly savedEstimates = signal<ReadonlySet<string>>(new Set());

  /** Dicta lo que comió; al terminar de hablar se analiza solo. */
  toggleDictation() {
    if (this.listening()) return this.speech.stop();
    this.aiError.set(null);
    this.speech.start((text, error) => {
      if (text) {
        this.aiText.update((t) => (t.trim() ? `${t.trim()} ${text}` : text));
        void this.analyze();
      } else if (error && error !== 'no-speech' && error !== 'aborted') {
        this.aiError.set(error === 'not-allowed' ? 'Dale permiso al micrófono para dictar.' : 'No pudimos escuchar. Probá de nuevo.');
      }
    });
  }

  /** Enter analiza; Shift+Enter hace un salto de línea. */
  onAiKey(event: Event) {
    const e = event as KeyboardEvent;
    if (e.shiftKey) return;
    e.preventDefault();
    void this.analyze();
  }

  async saveEstimate(p: ProposedItem) {
    const food: Food = { name: p.item.name, cat: 'Platos y comidas', portion: p.portion || '1 porción', kcal: p.item.kcal, protein: p.item.protein ?? 0 };
    try {
      await this.foodsService.save(food);
      this.savedEstimates.update((s) => new Set(s).add(food.name));
      (await this.toast.create({ message: 'Guardado en Mis alimentos', duration: 1500 })).present();
    } catch {
      (await this.toast.create({ message: 'No se pudo guardar el alimento', duration: 2500, color: 'danger' })).present();
    }
  }

  pickPhoto(input: HTMLInputElement) {
    this.aiImage.set(input.files?.[0] ?? null);
    input.value = '';
  }

  async analyze() {
    if (!this.canAnalyze()) return;
    this.aiBusy.set(true);
    this.aiError.set(null);
    try {
      const found = await this.mealAi.analyze({ text: this.aiText(), image: this.aiImage() }, this.foodsService.catalog());
      this.proposals.set(found);
      if (!found.length) this.aiError.set('No encontramos comida ahí. Probá describiéndola con otras palabras.');
    } catch (e) {
      this.aiError.set(e instanceof MealAiError ? e.message : 'No pudimos analizar la comida. Probá de nuevo.');
    }
    this.aiBusy.set(false);
  }

  dropProposal(p: ProposedItem) {
    this.proposals.update((list) => list.filter((x) => x !== p));
  }

  /** Suma lo propuesto al borrador de la comida y limpia el análisis. */
  acceptProposals() {
    this.draftItems.update((items) => mergeItems(items, this.proposals().map((p) => p.item)));
    this.clearAnalysis();
  }

  clearAnalysis() {
    this.proposals.set([]);
    this.aiText.set('');
    this.aiImage.set(null);
    this.aiError.set(null);
  }

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
  readonly derivedFlags = computed<MealFlags>(() => flagsOfItems(this.draftItems(), this.foodsService.catalog()));
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
    this.foodsService.load().catch(() => undefined);
    this.meals.recent(60).then((h) => this.history.set(h)).catch(() => undefined);
    this.favoriteService.list().then((list) => this.favorites.set(list)).catch(() => undefined);
  }

  /** Meta diaria y kcal quemadas; se recarga cuando cambia el perfil, el peso o los entrenos. */
  private async loadEnergy() {
    try {
      const [profile, weight, energy] = await Promise.all([
        this.profiles.get(), this.profiles.latestWeight(), this.profiles.dayEnergy(this.date()),
      ]);
      this.weight.set(weight ?? null);
      this.target.set(profile && weight ? dailyPlan(profile, weight, toIsoDate(new Date())).target : null);
      this.burned.set(energy.burned);
    } catch { /* el balance es opcional */ }
  }

  async load() {
    this.loading.set(true);
    try {
      this.entries.set(await this.meals.byDate(this.date()));
      this.loadYesterday();
      await this.loadEnergy();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadYesterday() {
    const d = new Date(this.date() + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    try {
      this.yesterday.set(await this.meals.byDate(toIsoDate(d)));
    } catch {
      this.yesterday.set([]);
    }
  }

  /** Copia al día en pantalla las comidas de ayer que hoy faltan. */
  async repeatYesterday() {
    const todo = this.repeatable();
    if (!todo.length) return;
    this.saving.set(true);
    try {
      for (const m of todo) {
        const saved = await this.meals.save(this.date(), m.meal_type, m.flags, m.notes, m.items, m.kcal);
        this.entries.update((list) => [...list.filter((e) => e.meal_type !== saved.meal_type), saved]);
      }
      this.celebrateRepeat(todo.length);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  private celebrateRepeat(n: number) {
    this.notify.success(n === 1 ? 'Copiamos 1 comida de ayer' : `Copiamos ${n} comidas de ayer`);
  }

  refresh(ev: Event) {
    return finishRefresh(ev, () => this.load());
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
    const fromItems = flagsOfItems(existing?.items ?? [], this.foodsService.catalog(), true);
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
    this.clearAnalysis();
    this.savedEstimates.set(new Set());
    this.meals.latestOfType(type, this.date()).then((p) => this.previous.set(p)).catch(() => undefined);
    this.editing.set(type);
  }

  close() {
    if (this.listening()) this.speech.stop();
    this.clearAnalysis();
    this.savedEstimates.set(new Set());
    this.editing.set(null);
  }

  removePhoto() {
    this.aiImage.set(null);
  }

  addFood(food: Food) {
    this.draftItems.update((items) => {
      const same = items.find((i) => i.name === food.name && i.kcal === food.kcal && i.protein === food.protein);
      return same ? items.map((i) => (i === same ? { ...i, qty: i.qty + 1 } : i)) : [...items, { name: food.name, kcal: food.kcal, protein: food.protein, ...(food.grams ? { refGrams: food.grams } : {}), qty: 1 }];
    });
  }

  addFrequent(item: MealItem) {
    this.draftItems.update((items) => mergeItems(items, [item]));
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

  /** Guarda lo escrito a mano como alimento propio para encontrarlo la próxima vez. */
  async saveManualFood() {
    const kcal = this.manualKcal();
    const name = this.manualName.trim();
    if (!this.canAddManual() || kcal === null || !name) return;
    const food: Food = { name, cat: 'Platos y comidas', portion: '1 porción', kcal: Math.round(kcal), protein: 0 };
    try {
      await this.foodsService.save(food);
      this.addFood(food);
      this.manualName = '';
      this.manualKcalRaw.set('');
      (await this.toast.create({ message: 'Guardado en tu lista', duration: 1500 })).present();
    } catch {
      (await this.toast.create({ message: 'No se pudo guardar el alimento', duration: 2500, color: 'danger' })).present();
    }
  }

  isCustom(food: Food): boolean {
    return this.foodsService.custom().some((c) => c.name === food.name);
  }

  async removeCustom(food: Food, event: Event) {
    event.stopPropagation();
    try {
      await this.foodsService.remove(food.name);
    } catch {
      (await this.toast.create({ message: 'No se pudo quitar el alimento', duration: 2500, color: 'danger' })).present();
    }
  }

  /** Marcas manuales de un conjunto de flags: las que no vienen de los alimentos. */
  private manualFlags(flags: MealFlags, items: MealItem[]): MealFlags {
    const fromItems = flagsOfItems(items, this.foodsService.catalog(), true);
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
      this.notify.error(e);
    }
  }

  async removeFavorite(id: string) {
    try {
      await this.favoriteService.remove(id);
      this.favorites.update((list) => list.filter((f) => f.id !== id));
    } catch (e) {
      this.notify.error(e);
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

  /** Fija la cantidad de porciones de un ítem (los botones ½ · 1 · 1½ · 2). */
  setQty(index: number, qty: number) {
    this.draftItems.update((items) => items.map((item, i) => (i === index ? { ...item, qty } : item)));
  }

  /** Quita un ítem del borrador y ofrece deshacer. */
  removeItem(index: number) {
    const item = this.draftItems()[index];
    if (!item) return;
    this.draftItems.update((items) => items.filter((_, i) => i !== index));
    this.undoToast(`Quitaste ${item.name}`, () => this.draftItems.update((items) => [...items.slice(0, index), item, ...items.slice(index)]));
  }

  private async undoToast(message: string, onUndo: () => void) {
    const t = await this.toast.create({ message, duration: 5000, buttons: [{ text: 'Deshacer', role: 'cancel', handler: onUndo }] });
    t.present();
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
    if (isEmptyMeal(this.effectiveFlags(), this.draftItems().length, this.draftNotes)) return this.remove();
    this.saving.set(true);
    try {
      const saved = await this.meals.save(
        this.date(), type, this.effectiveFlags(), this.draftNotes, this.draftItems(), this.draftItems().length ? this.draftKcal() : null,
      );
      const wasComplete = this.entries().length >= MEAL_ORDER.length;
      this.entries.update((list) => [...list.filter((e) => e.meal_type !== type), saved]);
      this.history.update((h) => [{ date: saved.date, meal_type: saved.meal_type, items: saved.items }, ...h.filter((x) => !(x.date === saved.date && x.meal_type === saved.meal_type))]);
      this.close();
      if (!wasComplete && this.entries().length >= MEAL_ORDER.length) this.celebrate();
    } catch (e) {
      this.notify.error(e);
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
      this.history.update((h) => h.filter((x) => !(x.date === existing.date && x.meal_type === existing.meal_type)));
      this.close();
      this.undoToast(`Borraste ${this.mealLabels[existing.meal_type].toLowerCase()}`, () => void this.restore(existing));
    } catch (e) {
      this.notify.error(e);
    }
  }

  /** Vuelve a guardar una comida borrada. */
  private async restore(meal: MealLog) {
    try {
      const saved = await this.meals.save(meal.date, meal.meal_type, meal.flags, meal.notes, meal.items, meal.kcal);
      if (saved.date === this.date()) this.entries.update((list) => [...list.filter((e) => e.meal_type !== saved.meal_type), saved]);
      this.history.update((h) => [{ date: saved.date, meal_type: saved.meal_type, items: saved.items }, ...h]);
    } catch (e) {
      this.notify.error(e);
    }
  }

  private async celebrate() {
    const n = this.streak();
    const message = n >= 2 ? `🎉 ¡Día completo! 🔥 ${n} días seguidos` : '🎉 ¡Día completo! Registraste las 4 comidas';
    (await this.toast.create({ message, duration: 3500, color: 'success', position: 'top' })).present();
  }

  flagLabels(flags: MealFlags): string {
    return ALL_FLAG_DEFS.filter((f) => flags[f.key]).map((f) => f.label).join(' · ');
  }


}
