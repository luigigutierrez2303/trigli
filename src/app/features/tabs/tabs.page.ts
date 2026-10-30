import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barbellOutline, flaskOutline, homeOutline, logOutOutline, restaurantOutline, walkOutline,
} from 'ionicons/icons';
import { Supabase } from '../../core/supabase';

/** Una sola fuente para la barra inferior (celular) y el rail lateral (desktop). */
export const NAV = [
  { path: 'resumen', label: 'Resumen', short: 'Resumen', icon: 'home-outline' },
  { path: 'comidas', label: 'Comidas', short: 'Comidas', icon: 'restaurant-outline' },
  { path: 'actividad', label: 'Actividad', short: 'Actividad', icon: 'walk-outline' },
  { path: 'fuerza', label: 'Fuerza', short: 'Fuerza', icon: 'barbell-outline' },
  { path: 'laboratorio', label: 'Laboratorio', short: 'Lab', icon: 'flask-outline' },
] as const;

@Component({
  selector: 'app-tabs',
  imports: [RouterLink, RouterLinkActive, IonIcon, IonLabel, IonTabs, IonTabBar, IonTabButton],
  template: `
    <div class="shell">
      <nav class="rail" aria-label="Navegación principal">
        <div class="logo" aria-hidden="true">T</div>
        @for (n of nav; track n.path) {
          <a class="rail-item" [routerLink]="['/', n.path]" routerLinkActive="active">
            <ion-icon [name]="n.icon" />
            <span>{{ n.short }}</span>
          </a>
        }
        <span class="spacer"></span>
        <button class="rail-item logout" type="button" (click)="logout()" aria-label="Salir">
          <ion-icon name="log-out-outline" />
        </button>
      </nav>

      <ion-tabs class="content">
        <ion-tab-bar slot="bottom">
          @for (n of nav; track n.path) {
            <ion-tab-button [tab]="n.path">
              <ion-icon [name]="n.icon" />
              <ion-label>{{ n.short }}</ion-label>
            </ion-tab-button>
          }
        </ion-tab-bar>
      </ion-tabs>
    </div>
  `,
  styles: `
    .shell { display: flex; height: 100%; }
    .content { flex: 1; min-width: 0; position: relative; }
    .rail { display: none; }

    /* Desktop: rail vertical de 80 px en lugar de la barra inferior. */
    @media (min-width: 1024px) {
      ion-tab-bar { display: none; }

      .rail {
        display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 0 0 80px; padding: 20px 0;
        background: var(--ion-card-background); border-right: 1px solid var(--ion-border-color);
      }
      .logo {
        width: 40px; height: 40px; border-radius: 10px; margin-bottom: 18px; display: flex; align-items: center;
        justify-content: center; background: var(--ion-color-success); color: var(--ion-color-success-contrast);
        font-size: 18px; font-weight: 700;
      }
      .rail-item {
        width: 64px; padding: 8px 0; border: 0; border-radius: 10px; background: transparent; cursor: pointer;
        display: flex; flex-direction: column; align-items: center; gap: 4px; text-decoration: none;
        color: var(--ion-color-medium); font: inherit; font-size: 11px; font-weight: 500;
      }
      .rail-item ion-icon { font-size: 22px; }
      .rail-item:hover { background: var(--trigli-surface-2); }
      .rail-item.active { background: var(--trigli-primary-soft); color: var(--trigli-primary-text); }
      .spacer { flex: 1; }
    }
  `,
})
export class TabsPage {
  private readonly sb = inject(Supabase);
  readonly nav = NAV;

  constructor() {
    addIcons({ homeOutline, restaurantOutline, walkOutline, barbellOutline, flaskOutline, logOutOutline });
  }

  logout() {
    this.sb.signOut().then(() => location.assign('/login'));
  }
}
