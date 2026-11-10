import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  basketOutline, beerOutline, cafeOutline, eggOutline, ellipseOutline, fastFoodOutline, fishOutline, flameOutline,
  iceCreamOutline, leafOutline, nutritionOutline, pizzaOutline, restaurantOutline, waterOutline, wineOutline,
} from 'ionicons/icons';
import { foodIconOf } from './foods';

/** Ícono de un alimento sobre un cuadrado con el color suave de su familia (proteína, vegetal, cereal…). */
@Component({
  selector: 'app-food-icon',
  imports: [IonIcon],
  template: `<ion-icon [name]="look().icon" aria-hidden="true" />`,
  host: { '[attr.data-tone]': 'look().tone', '[class.sm]': "size() === 'sm'" },
  styles: `
    :host {
      flex: none; display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 10px; font-size: 18px;
      background: var(--tone-soft, var(--trigli-surface-2)); color: var(--tone-text, var(--ion-color-medium));
    }
    :host(.sm) { width: 22px; height: 22px; border-radius: 7px; font-size: 13px; vertical-align: middle; }
    :host([data-tone='protein']) { --tone-soft: var(--trigli-protein-soft); --tone-text: var(--trigli-protein-text); }
    :host([data-tone='plant']) { --tone-soft: var(--trigli-ok-soft); --tone-text: var(--trigli-ok-text); }
    :host([data-tone='grain']), :host([data-tone='fat']) { --tone-soft: var(--trigli-warn-soft); --tone-text: var(--trigli-warn-text); }
    :host([data-tone='treat']) { --tone-soft: var(--trigli-bad-soft); --tone-text: var(--trigli-bad-text); }
    :host([data-tone='drink']) { --tone-soft: var(--trigli-drink-soft); --tone-text: var(--trigli-drink-text); }
  `,
})
export class FoodIconComponent {
  readonly name = input.required<string>();
  readonly cat = input<string | undefined>();
  readonly size = input<'sm' | 'md'>('md');

  readonly look = computed(() => foodIconOf(this.name(), this.cat()));

  constructor() {
    addIcons({
      basketOutline, beerOutline, cafeOutline, eggOutline, ellipseOutline, fastFoodOutline, fishOutline, flameOutline,
      iceCreamOutline, leafOutline, nutritionOutline, pizzaOutline, restaurantOutline, waterOutline, wineOutline,
    });
  }
}
