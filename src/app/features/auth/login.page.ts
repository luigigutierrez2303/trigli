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

        @if (sb.recovery()) {
          <h2>Nueva contraseña</h2>
          <ion-list lines="none">
            <ion-item>
              <ion-input type="password" label="Contraseña nueva" labelPlacement="stacked" [(ngModel)]="password"
                autocomplete="new-password" (keyup.enter)="saveNew()" />
            </ion-item>
          </ion-list>
          <ion-button expand="block" (click)="saveNew()" [disabled]="password.length < 6 || loading()">Guardar contraseña</ion-button>
          @if (error()) { <ion-text color="danger"><p>{{ error() }}</p></ion-text> }
        } @else if (notice()) {
          <h2>Revisá tu mail</h2>
          <p class="sub">{{ notice() }}</p>
          <ion-button expand="block" fill="outline" (click)="notice.set(null)">Volver</ion-button>
        } @else {
          <ion-button expand="block" fill="outline" (click)="google()" [disabled]="loading()">Continuar con Google</ion-button>
          <p class="or">o con tu email</p>

          <ion-list lines="none">
            <ion-item>
              <ion-input type="email" label="Email" labelPlacement="stacked" [(ngModel)]="email" autocomplete="email" />
            </ion-item>
            <ion-item>
              <ion-input type="password" label="Contraseña" labelPlacement="stacked" [(ngModel)]="password"
                [autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'" (keyup.enter)="submit()" />
            </ion-item>
          </ion-list>
          <ion-button expand="block" (click)="submit()" [disabled]="!canSubmit() || loading()">
            {{ mode() === 'signup' ? 'Crear cuenta' : 'Ingresar' }}
          </ion-button>
          @if (error()) { <ion-text color="danger"><p>{{ error() }}</p></ion-text> }

          <ion-button fill="clear" size="small" (click)="toggleMode()">
            {{ mode() === 'signup' ? 'Ya tengo cuenta' : 'Crear una cuenta' }}
          </ion-button>
          @if (mode() === 'signin') {
            <ion-button fill="clear" size="small" (click)="forgot()" [disabled]="!email || loading()">Olvidé mi contraseña</ion-button>
          }
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
    .or { color: var(--ion-color-medium); margin: 16px 0; font-size: 0.9rem; }
  `,
})
export class LoginPage {
  protected readonly sb = inject(Supabase);
  email = '';
  password = '';
  readonly mode = signal<'signin' | 'signup'>('signin');
  readonly loading = signal(false);
  readonly notice = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    // Si ya hay sesión (p.ej. volviendo de Google o del mail de confirmación) ir directo a la app.
    const router = inject(Router);
    this.sb.ready.then(() => {
      if (this.sb.session() && !this.sb.recovery()) router.navigateByUrl('/');
    });
  }

  canSubmit() {
    return !!this.email.trim() && this.password.length >= 6;
  }

  toggleMode() {
    this.mode.update((m) => (m === 'signin' ? 'signup' : 'signin'));
    this.error.set(null);
  }

  async submit() {
    if (!this.canSubmit()) return;
    const email = this.email.trim();
    const signup = this.mode() === 'signup';
    await this.run(async () => {
      const { data, error } = signup ? await this.sb.signUp(email, this.password) : await this.sb.signInWithPassword(email, this.password);
      if (error) return this.error.set(this.message(error.message));
      if (signup && !data.session) this.notice.set(`Te mandamos un mail a ${email} para confirmar la cuenta. Después ingresá con tu contraseña.`);
      else this.router.navigateByUrl('/');
    });
  }

  async saveNew() {
    if (this.password.length < 6) return;
    await this.run(async () => {
      const { error } = await this.sb.updatePassword(this.password);
      if (error) return this.error.set(this.message(error.message));
      this.sb.recovery.set(false);
      this.router.navigateByUrl('/');
    });
  }

  async google() {
    await this.run(async () => {
      const { error } = await this.sb.signInWithGoogle();
      if (error) this.error.set(this.message(error.message));
    });
  }

  async forgot() {
    const email = this.email.trim();
    await this.run(async () => {
      const { error } = await this.sb.resetPassword(email);
      if (error) this.error.set(this.message(error.message));
      else this.notice.set(`Te mandamos un mail a ${email} para cambiar la contraseña.`);
    });
  }

  private readonly router = inject(Router);

  private async run(fn: () => Promise<unknown>) {
    this.loading.set(true);
    this.error.set(null);
    try {
      await fn();
    } finally {
      this.loading.set(false);
    }
  }

  private message(m: string): string {
    if (/invalid login credentials/i.test(m)) return 'Email o contraseña incorrectos.';
    if (/already registered/i.test(m)) return 'Ya hay una cuenta con ese email.';
    if (/email not confirmed/i.test(m)) return 'Confirmá tu email desde el mail que te mandamos.';
    return m;
  }
}
