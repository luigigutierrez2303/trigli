import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/angular';
import { ProfileService } from '../energy/profile.service';
import { allStepsDone, FirstStep, firstSteps } from './onboarding';
import { OnboardingService } from './onboarding.service';

@Component({
  selector: 'app-first-steps',
  imports: [RouterLink, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton],
  template: `
    @if (steps(); as list) {
      <ion-card>
        <ion-card-header><ion-card-title>Primeros pasos</ion-card-title></ion-card-header>
        <ion-card-content>
          <ul>
            @for (s of list; track s.key) {
              <li [class.done]="s.done">
                <span class="tick" aria-hidden="true">{{ s.done ? '✓' : '' }}</span>
                @if (s.done) { <span>{{ s.label }}</span> } @else { <a [routerLink]="s.link">{{ s.label }}</a> }
              </li>
            }
          </ul>
          <ion-button size="small" fill="clear" color="medium" (click)="hide()">Ocultar</ion-button>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: `
    ul { list-style: none; margin: 0 0 4px; padding: 0; }
    li { display: flex; align-items: center; gap: 12px; min-height: 40px; }
    .tick { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--ion-color-medium); display: grid; place-items: center; font-size: 13px; font-weight: 800; }
    .done .tick { background: var(--trigli-ok-soft); border-color: transparent; color: var(--trigli-ok-text); }
    .done span:last-child { color: var(--ion-color-medium); text-decoration: line-through; }
    a { color: inherit; font-weight: 600; }
  `,
})
export class FirstStepsComponent {
  private readonly onboarding = inject(OnboardingService);
  private readonly profiles = inject(ProfileService);
  readonly steps = signal<FirstStep[] | null>(null);

  constructor() {
    effect(() => {
      this.profiles.changes();
      void this.load();
    });
  }

  private async load() {
    if (this.onboarding.stepsDismissed()) return this.steps.set(null);
    try {
      const list = firstSteps(await this.onboarding.progress());
      this.steps.set(allStepsDone(list) ? null : list);
    } catch {
      this.steps.set(null);
    }
  }

  hide() {
    this.onboarding.dismissSteps();
    this.steps.set(null);
  }
}
