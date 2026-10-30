import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput, IonItem, IonList, IonText } from '@ionic/angular';
import { Supabase } from '../../core/supabase';

@Component({
  selector: 'app-login',
  imports: [FormsModule, IonContent, IonList, IonItem, IonInput, IonButton, IonText],
  template: `
    <ion-content class="ion-padding">
      <div class="wrap">
        <div class="logo" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#052e16" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>
        </div>
        <h1>Trigli</h1>
        <p class="sub">Comida, ejercicio y triglicéridos.</p>

        @if (sent()) {
          <h2>Revisá tu mail</h2>
          <p class="sub">Te mandamos un link a <strong>{{ email }}</strong>. Tocalo desde este dispositivo para entrar.</p>
          <ion-button expand="block" fill="outline" (click)="sent.set(false)">Usar otro email</ion-button>
        } @else {
          <ion-list lines="none">
            <ion-item>
              <ion-input type="email" label="Email" labelPlacement="stacked" [(ngModel)]="email"
                autocomplete="email" (keyup.enter)="send()" />
            </ion-item>
          </ion-list>
          <ion-button expand="block" (click)="send()" [disabled]="!email || loading()">Enviar link de acceso</ion-button>
          @if (error()) { <ion-text color="danger"><p>{{ error() }}</p></ion-text> }
        }
      </div>
    </ion-content>
  `,
  styles: `
    .wrap { max-width: 400px; margin: 12vh auto 0; text-align: center; }
    .logo { width: 72px; height: 72px; border-radius: 24px; background: #2dd36f; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    h2 { font-size: 1.75rem; font-weight: 700; margin: 24px 0 0; }
    .sub { color: var(--ion-color-medium); margin: 6px 0 20px; font-size: 1.05rem; }
    ion-list { text-align: left; margin-bottom: 16px; }
  `,
})
export class LoginPage {
  private readonly sb = inject(Supabase);
  email = '';
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    // Si ya hay sesión (p.ej. volviendo del magic link) ir directo a la app.
    const router = inject(Router);
    this.sb.ready.then(() => {
      if (this.sb.session()) router.navigateByUrl('/');
    });
  }

  async send() {
    this.loading.set(true);
    this.error.set(null);
    const { error } = await this.sb.signInWithOtp(this.email.trim());
    this.loading.set(false);
    if (error) this.error.set(error.message);
    else this.sent.set(true);
  }
}
