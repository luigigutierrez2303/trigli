import { Component, inject, signal } from '@angular/core';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText } from '@ionic/angular';
import { Supabase } from '../../core/supabase';

const TOKEN_BYTES = 32;

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(s: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
}

@Component({
  selector: 'app-health-link',
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonText],
  template: `
    <ion-card>
      <ion-card-header><ion-card-title>Apple Salud</ion-card-title></ion-card-header>
      <ion-card-content>
        <p class="fine">Un Atajo de iOS manda tu peso y tu actividad del día (kcal) de Apple Salud a Trigli. Generá un código y pegalo en el Atajo.</p>
        @if (token(); as t) {
          <code class="token">{{ t }}</code>
          <p class="fine">Copialo ahora: no lo volvemos a mostrar. Si generás otro, el anterior deja de funcionar.</p>
          <ion-button size="small" fill="outline" (click)="copy(t)">{{ copied() ? '✓ Copiado' : 'Copiar código' }}</ion-button>
        } @else {
          <ion-button expand="block" fill="outline" (click)="generate()" [disabled]="busy()">
            {{ busy() ? 'Generando…' : 'Generar código' }}
          </ion-button>
        }
        @if (error()) { <ion-text color="danger"><p>{{ error() }}</p></ion-text> }
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    .fine { margin: 6px 0; font-size: 12px; line-height: 1.4; color: var(--ion-color-medium); }
    @media (min-width: 1024px) { ion-card { max-width: 640px; } }
    .token { display: block; word-break: break-all; padding: 10px; border-radius: 8px; background: var(--ion-color-light); margin-bottom: 8px; user-select: all; }
  `,
})
export class HealthLinkComponent {
  private readonly db = inject(Supabase).client;
  readonly token = signal('');
  readonly busy = signal(false);
  readonly copied = signal(false);
  readonly error = signal('');

  async generate(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const token = hex(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
      const { error } = await this.db.from('health_token').upsert({ token_hash: await sha256Hex(token) }, { onConflict: 'user_id' });
      if (error) throw error;
      this.token.set(token);
    } catch {
      this.error.set('No pudimos generar el código. Probá de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  async copy(t: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(t);
      this.copied.set(true);
    } catch { /* el usuario puede seleccionarlo a mano */ }
  }
}
