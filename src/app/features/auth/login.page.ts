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
        <h1>Trigli</h1>
        <p class="sub">Comida, ejercicio y triglicéridos.</p>

        @if (sent()) {
          <ion-text color="success"><p>Te mandamos un link a {{ email }}. Abrilo desde este dispositivo.</p></ion-text>
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
    .wrap { max-width: 400px; margin: 15vh auto 0; }
    h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0; }
    .sub { color: var(--ion-color-medium); margin-top: 4px; }
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
