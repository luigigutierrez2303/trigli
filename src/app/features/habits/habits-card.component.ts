import { Component, computed, input } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/angular';
import { toIsoDate } from '../../core/date';
import { WEEKLY_CARDIO_GOAL_MIN } from '../activity/activity';
import { FIBER_DAYS_TARGET, FISH_WEEKLY_TARGET, HabitMeal, weekHabits, weekSuggestion } from './habits';

type Level = 'good' | 'warn' | 'bad';

/** Lo que más mueve los triglicéridos en la semana: omega-3 y fibra (bajan), alcohol y azúcar (suben). */
@Component({
  selector: 'app-habits-card',
  imports: [IonCard, IonCardContent, IonCardHeader, IonCardTitle],
  template: `
    <ion-card>
      <ion-card-header><ion-card-title>Hábitos que mueven los TG</ion-card-title></ion-card-header>
      <ion-card-content>
        @if (habits().loggedDays === 0) {
          <p class="empty">Cargá comidas esta semana para ver omega-3, fibra, alcohol y azúcar.</p>
        } @else {
          <ul class="rows">
            @for (r of rows(); track r.label) {
              <li [attr.data-level]="r.level">
                <span class="label">{{ r.label }}</span>
                <span class="value">{{ r.value }}</span>
              </li>
            }
          </ul>
          @if (suggestion(); as s) { <p class="tip">{{ s }}</p> }
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    :host { display: block; }
    ion-card { margin: 0 0 16px; }
    .rows { list-style: none; margin: 0; padding: 0; }
    li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--ion-border-color); }
    li:last-child { border-bottom: 0; }
    .label { color: var(--ion-text-color); }
    .value { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--level-text); }
    .empty { margin: 0; color: var(--ion-color-step-650, var(--ion-color-medium)); }
    .tip { margin: 12px 0 0; padding: 12px 14px; border-radius: var(--trigli-radius-md); background: var(--trigli-primary-soft); color: var(--ion-text-color); font-size: 0.9375rem; }
  `,
})
export class HabitsCardComponent {
  readonly monday = input.required<string>();
  readonly meals = input.required<readonly HabitMeal[]>();
  readonly cardioMin = input(0);

  readonly habits = computed(() => weekHabits(this.monday(), toIsoDate(new Date()), this.meals()));
  readonly suggestion = computed(() => weekSuggestion(this.habits(), this.cardioMin(), WEEKLY_CARDIO_GOAL_MIN));
  readonly rows = computed(() => {
    const h = this.habits();
    const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
    const lowIsGood = (n: number): Level => (n === 0 ? 'good' : n === 1 ? 'warn' : 'bad');
    const target = (n: number, goal: number): Level => (n >= goal ? 'good' : n > 0 ? 'warn' : 'bad');
    return [
      { label: 'Pescado graso (omega-3)', value: `${h.fishDays} / ${FISH_WEEKLY_TARGET}`, level: target(h.fishDays, FISH_WEEKLY_TARGET) },
      { label: 'Días con fibra', value: `${h.fiberDays} / ${FIBER_DAYS_TARGET}`, level: target(h.fiberDays, FIBER_DAYS_TARGET) },
      { label: 'Con alcohol', value: days(h.alcoholDays), level: lowIsGood(h.alcoholDays) },
      { label: 'Con azúcar o dulces', value: days(h.sugarDays), level: h.sugarDays <= 1 ? 'good' : h.sugarDays <= 3 ? 'warn' : 'bad' },
    ];
  });
}
