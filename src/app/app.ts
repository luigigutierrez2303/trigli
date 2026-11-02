import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AppUpdateService } from './core/app-update';
import { ThemeService } from './core/theme';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`,
})
export class App {
  /** Se instancia al arrancar para aplicar el tema guardado. */
  private readonly theme = inject(ThemeService);
  /** Busca y aplica versiones nuevas de la PWA. */
  private readonly update = inject(AppUpdateService);
}
