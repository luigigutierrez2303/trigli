import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Avisos en pantalla: un solo lugar para el texto de los errores y la duración de los toasts. */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly toast = inject(ToastController);

  /** Mensaje legible de un error de Supabase o de JavaScript. */
  static messageOf(e: unknown): string {
    if (e instanceof Error && e.message) return e.message;
    const message = (e as { message?: string } | null)?.message;
    return message || 'Algo salió mal. Probá de nuevo.';
  }

  async error(e: unknown) {
    (await this.toast.create({ message: NotifyService.messageOf(e), duration: 3000, color: 'danger' })).present();
  }

  async success(message: string) {
    (await this.toast.create({ message, duration: 2000, color: 'success' })).present();
  }
}
