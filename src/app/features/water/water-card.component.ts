import { Component, effect, inject, input, signal } from '@angular/core';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, remove } from 'ionicons/icons';
import { NotifyService } from '../../core/notify';
import { GLASS_ML, litres, stepGlasses, WATER_GOAL_GLASSES } from './water';
import { WaterService } from './water.service';

/** Contador de vasos de agua del día (250 ml cada uno). */
@Component({
  selector: 'app-water-card',
  imports: [IonCard, IonCardContent, IonButton, IonIcon],
  template: `
    <ion-card>
      <ion-card-content class="water">
        <div class="info">
          <div class="title">Agua</div>
          <div class="value"><b>{{ glasses() }}</b> / {{ goal }} vasos <span>· {{ litres(glasses()) }} L</span></div>
          <div class="dots" aria-hidden="true">
            @for (n of dots; track n) { <i [class.on]="n < glasses()"></i> }
          </div>
        </div>
        <div class="steps">
          <ion-button fill="clear" class="touch" [disabled]="glasses() === 0 || busy()" (click)="change(-1)" aria-label="Quitar un vaso"><ion-icon slot="icon-only" name="remove" /></ion-button>
          <ion-button class="touch" [disabled]="busy()" (click)="change(1)" [attr.aria-label]="'Sumar un vaso de ' + glassMl + ' ml'"><ion-icon slot="icon-only" name="add" /></ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    .water { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .title { font-weight: 650; font-size: 1.0625rem; }
    .value { margin-top: 2px; color: var(--ion-text-color); span { color: var(--ion-color-step-650, var(--ion-color-medium)); } }
    .dots { display: flex; gap: 4px; margin-top: 8px; i { width: 14px; height: 6px; border-radius: 3px; background: var(--trigli-bar-off); &.on { background: var(--trigli-primary-text); } } }
    .steps { display: flex; gap: 4px; ion-button { margin: 0; } }
    .touch { min-width: 44px; min-height: 44px; }
  `,
})
export class WaterCardComponent {
  private readonly water = inject(WaterService);
  private readonly notify = inject(NotifyService);

  readonly date = input.required<string>();
  readonly glasses = signal(0);
  readonly busy = signal(false);
  readonly goal = WATER_GOAL_GLASSES;
  readonly glassMl = GLASS_ML;
  readonly dots = Array.from({ length: WATER_GOAL_GLASSES }, (_, i) => i);
  readonly litres = litres;

  constructor() {
    addIcons({ add, remove });
    effect(() => {
      const date = this.date();
      this.water.glasses(date).then((n) => this.glasses.set(n)).catch(() => this.glasses.set(0));
    });
  }

  async change(delta: 1 | -1) {
    const next = stepGlasses(this.glasses(), delta);
    const prev = this.glasses();
    this.glasses.set(next);
    this.busy.set(true);
    try {
      await this.water.set(this.date(), next);
    } catch (e) {
      this.glasses.set(prev);
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
