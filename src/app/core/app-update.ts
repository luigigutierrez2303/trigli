import { inject, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';
import { filter } from 'rxjs';

/**
 * En una PWA de iOS la app se suspende en vez de cerrarse, así que el service worker baja la versión nueva
 * pero la pantalla sigue con la vieja. Acá se busca una versión al volver a la app y se aplica.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly sw = inject(SwUpdate);
  private readonly toast = inject(ToastController);
  private ready = false;

  constructor() {
    if (!this.sw.isEnabled) return;

    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.ready = true;
        if (document.visibilityState === 'visible') this.offerReload();
      });
    this.sw.unrecoverable.subscribe(() => location.reload());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      // Ya había una versión lista de antes: se aplica al volver, que es cuando no se pierde nada a medio escribir.
      if (this.ready) location.reload();
      else this.sw.checkForUpdate().catch(() => {});
    });
    this.sw.checkForUpdate().catch(() => {});
  }

  private async offerReload() {
    const toast = await this.toast.create({
      message: 'Hay una versión nueva de Trigli',
      position: 'bottom',
      buttons: [{ text: 'Actualizar', handler: () => location.reload() }],
    });
    await toast.present();
  }
}
