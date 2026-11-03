import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonSearchbar, IonSelect, IonSelectOption, IonText,
  IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { Food, FoodDraft, FoodOrigin, FOOD_CATEGORIES, parseFoodDraft } from '../energy/foods';
import { FoodsService } from '../energy/foods.service';
import { FLAG_DEFS } from '../meals/meal-scoring';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const MAX_LISTED = 80;

const ORIGIN_LABELS: Record<FoodOrigin, string> = { base: '', modified: 'Modificado', custom: 'Propio' };

const emptyDraft = (): FoodDraft => ({ name: '', cat: 'Platos y comidas', portion: '1 porción', kcal: '', protein: '', grams: '', flag: '' });

@Component({
  selector: 'app-foods',
  imports: [
    RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonModal, IonInput, IonSearchbar,
    IonSelect, IonSelectOption, IonText,
  ],
  template: `
    <ion-content class="ion-padding">
      <a class="back" routerLink="/cuenta">‹ Mi cuenta</a>
      <div class="page-head">
        <h1>Mis alimentos</h1>
        <ion-button size="small" (click)="openNew()">+ Nuevo</ion-button>
      </div>
      <p class="fine">Tocá un alimento para corregir sus calorías o porción. Los cambios son solo tuyos; el catálogo original no se toca.</p>

      <ion-searchbar placeholder="Buscar alimento" [debounce]="150" (ionInput)="query.set($any($event.target).value ?? '')" />
      <div class="cats" role="group" aria-label="Categorías">
        <button type="button" class="cat" [class.on]="cat() === ''" (click)="cat.set('')">Todos</button>
        <button type="button" class="cat" [class.on]="cat() === MINE" (click)="cat.set(MINE)">Los míos</button>
        @for (c of categories; track c) {
          <button type="button" class="cat" [class.on]="cat() === c" (click)="cat.set(c)">{{ c }}</button>
        }
      </div>

      <div class="food-list">
        @for (f of visible(); track f.name) {
          <button type="button" class="food" (click)="openEdit(f)">
            <span>
              <b>{{ f.name }}</b>
              <small>{{ f.portion }}</small>
            </span>
            <span class="food-end">
              @if (originLabel(f.name); as tag) { <span class="tag">{{ tag }}</span> }
              <span class="food-kcal">{{ f.kcal }} kcal</span>
            </span>
          </button>
        } @empty {
          <p class="muted">No hay alimentos que coincidan. Podés crear uno con “+ Nuevo”.</p>
        }
        @if (more() > 0) { <p class="muted">Hay {{ more() }} más. Buscá por nombre o elegí una categoría.</p> }
      </div>

      @if (hidden().length) {
        <h2>Ocultos</h2>
        <div class="food-list">
          @for (f of hidden(); track f.name) {
            <div class="food off">
              <span><b>{{ f.name }}</b><small>{{ f.portion }}</small></span>
              <ion-button size="small" fill="outline" (click)="restore(f.name)">Mostrar</ion-button>
            </div>
          }
        </div>
      }
    </ion-content>

    <ion-modal [isOpen]="editing() !== null" (didDismiss)="close()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start"><ion-button fill="clear" (click)="close()">Cancelar</ion-button></ion-buttons>
            <ion-title>{{ isNew() ? 'Nuevo alimento' : 'Editar alimento' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" strong (click)="save()" [disabled]="!parsed() || saving()">Guardar</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="form">
            <ion-input label="Nombre" labelPlacement="stacked" placeholder="Ej. Arepa de queso" [value]="draft().name"
              [disabled]="!isNew()" (ionInput)="set('name', $event)" />
            <ion-select label="Categoría" labelPlacement="stacked" cancelText="Cancelar" okText="Aceptar" [value]="draft().cat" (ionChange)="set('cat', $event)">
              @for (c of categories; track c) { <ion-select-option [value]="c">{{ c }}</ion-select-option> }
            </ion-select>
            <ion-input label="Porción" labelPlacement="stacked" placeholder="1 unidad, 1 plato…" [value]="draft().portion"
              (ionInput)="set('portion', $event)" />
            <div class="row">
              <ion-input label="kcal" labelPlacement="stacked" inputmode="decimal" placeholder="0" [value]="draft().kcal"
                (ionInput)="set('kcal', $event)" />
              <ion-input label="Proteína (g)" labelPlacement="stacked" inputmode="decimal" placeholder="0" [value]="draft().protein"
                (ionInput)="set('protein', $event)" />
              <ion-input label="Gramos (opc.)" labelPlacement="stacked" inputmode="numeric" placeholder="150" [value]="draft().grams"
                (ionInput)="set('grams', $event)" />
            </div>
            <ion-select label="Marca de calidad" labelPlacement="stacked" cancelText="Cancelar" okText="Aceptar" [value]="draft().flag" (ionChange)="set('flag', $event)">
              <ion-select-option value="">Ninguna</ion-select-option>
              @for (d of flags; track d.key) { <ion-select-option [value]="d.key">{{ d.label }}</ion-select-option> }
            </ion-select>
            <p class="fine">La marca suma o resta al puntaje de la comida cuando agregás este alimento. Dejala en “Ninguna” si no aplica.</p>
            @if (error()) { <ion-text color="danger"><p>{{ error() }}</p></ion-text> }

            @if (!isNew()) {
              @switch (origin()) {
                @case ('custom') {
                  <ion-button expand="block" fill="outline" color="danger" (click)="remove()">Eliminar de mi lista</ion-button>
                }
                @case ('modified') {
                  <ion-button expand="block" fill="outline" (click)="remove()">Volver al original</ion-button>
                }
                @default {
                  <ion-button expand="block" fill="outline" color="medium" (click)="hide()">Ocultar del buscador</ion-button>
                }
              }
            }
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 4px; color: var(--ion-color-medium); text-decoration: none; font-weight: 600; }
    .page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-head h1 { margin: 0 0 8px; font-family: 'Bricolage Grotesque', var(--ion-font-family); font-weight: 800; letter-spacing: -0.03em; }
    h2 { margin: 24px 0 4px; font-size: 16px; }
    .fine { margin: 6px 0; font-size: 12px; line-height: 1.4; color: var(--ion-color-medium); }
    .muted { color: var(--ion-color-medium); font-size: 14px; }
    .cats { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 8px; }
    .cat { flex: none; padding: 6px 12px; border: 1px solid var(--ion-color-step-200, #ccc); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
    .cat.on { background: var(--trigli-primary-soft); border-color: transparent; font-weight: 600; }
    .food-list { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 16px; }
    .food { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 52px; padding: 8px 14px; border: 1px solid var(--ion-color-step-150, #ddd); border-radius: 12px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    .food.off { cursor: default; opacity: 0.8; }
    .food span:first-child { display: flex; flex-direction: column; min-width: 0; }
    .food small { color: var(--ion-color-medium); }
    .food-end { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
    .food-kcal { font-weight: 600; }
    .tag { padding: 2px 8px; border-radius: 999px; background: var(--trigli-primary-soft); font-size: 11px; font-weight: 600; }
    .form { display: flex; flex-direction: column; gap: 16px; }
    .row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    @media (min-width: 1024px) { ion-content > * { max-width: 640px; } }
  `,
})
export class FoodsPage implements OnInit {
  private readonly foods = inject(FoodsService);
  private readonly toast = inject(ToastController);

  readonly MINE = '__mine';
  readonly categories = FOOD_CATEGORIES;
  readonly flags = [...FLAG_DEFS].sort((a, b) => a.label.localeCompare(b.label, 'es'));

  readonly query = signal('');
  readonly cat = signal('');
  readonly hidden = this.foods.hidden;

  private readonly filtered = computed(() => {
    const q = normalize(this.query());
    const cat = this.cat();
    const mine = new Set(this.foods.custom().map((c) => c.name));
    return this.foods.catalog().filter((f) =>
      (cat === '' || (cat === this.MINE ? mine.has(f.name) : f.cat === cat)) &&
      (!q || normalize(`${f.name} ${f.portion}`).includes(q)));
  });
  readonly visible = computed(() => this.filtered().slice(0, MAX_LISTED));
  readonly more = computed(() => Math.max(0, this.filtered().length - MAX_LISTED));

  /** null = modal cerrado; con valor, el alimento original (o '' si es nuevo). */
  readonly editing = signal<string | null>(null);
  readonly isNew = computed(() => this.editing() === '');
  readonly draft = signal<FoodDraft>(emptyDraft());
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly parsed = computed(() => parseFoodDraft(this.draft()));
  readonly origin = computed(() => this.foods.origin(this.editing() ?? ''));

  ngOnInit() {
    this.foods.load().catch(() => undefined);
  }

  originLabel(name: string): string {
    return ORIGIN_LABELS[this.foods.origin(name)];
  }

  openNew() {
    this.draft.set(emptyDraft());
    this.error.set(null);
    this.editing.set('');
  }

  openEdit(f: Food) {
    this.draft.set({
      name: f.name, cat: f.cat, portion: f.portion, kcal: String(f.kcal), protein: String(f.protein),
      grams: f.grams ? String(f.grams) : '', flag: f.flag ?? '',
    });
    this.error.set(null);
    this.editing.set(f.name);
  }

  close() {
    this.editing.set(null);
  }

  set(field: keyof FoodDraft, event: Event) {
    const detail = (event as CustomEvent<{ value?: unknown }>).detail;
    const target = event.target as { value?: unknown } | null;
    const value = String(detail?.value ?? target?.value ?? '');
    this.draft.update((d) => ({ ...d, [field]: value }));
  }

  async save() {
    const food = this.parsed();
    if (!food || this.saving()) return;
    if (this.isNew() && this.foods.catalog().some((f) => normalize(f.name) === normalize(food.name))) {
      this.error.set('Ya hay un alimento con ese nombre. Buscalo y editalo.');
      return;
    }
    await this.run(() => this.foods.save(food), 'Guardado');
  }

  remove() {
    return this.run(() => this.foods.remove(this.editing()!), this.origin() === 'custom' ? 'Eliminado' : 'Volvió al original');
  }

  hide() {
    const food = this.foods.catalog().find((f) => f.name === this.editing());
    return food ? this.run(() => this.foods.hide(food), 'Oculto del buscador') : undefined;
  }

  async restore(name: string) {
    try {
      await this.foods.remove(name);
    } catch {
      (await this.toast.create({ message: 'No se pudo mostrar el alimento', duration: 2500, color: 'danger' })).present();
    }
  }

  private async run(action: () => Promise<void>, done: string) {
    this.saving.set(true);
    this.error.set(null);
    try {
      await action();
      this.close();
      (await this.toast.create({ message: done, duration: 1500 })).present();
    } catch {
      this.error.set('No pudimos guardar el cambio. Revisá tu conexión y probá de nuevo.');
    }
    this.saving.set(false);
  }
}
