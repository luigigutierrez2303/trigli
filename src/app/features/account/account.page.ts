import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonInput, IonItem, IonList,
  IonSelect, IonSelectOption, IonText,
} from '@ionic/angular';
import { Supabase } from '../../core/supabase';
import { toIsoDate } from '../../core/date';
import { parseDecimal } from '../activity/activity';
import { ACTIVITY_LEVELS, ActivityLevel, dailyPlan, EnergyProfile, Sex, weeksToGoal, WEEKLY_LOSS_OPTIONS } from '../energy/energy';
import { ProfileService } from '../energy/profile.service';

const MIN_PASSWORD = 6;
const AVATAR_SIZE = 256;

/** Recorta al centro y achica a un cuadrado JPEG de 256 px. */
async function toAvatarJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = AVATAR_SIZE;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', 0.85));
}

@Component({
  selector: 'app-account',
  imports: [
    FormsModule, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonInput,
    IonButton, IonText, IonSelect, IonSelectOption,
  ],
  template: `
    <ion-content class="ion-padding">
      <div class="page-head"><h1>Mi cuenta</h1></div>

      <ion-card>
        <ion-card-header><ion-card-title>Perfil</ion-card-title></ion-card-header>
        <ion-card-content class="profile">
          <div class="avatar">
            @if (avatar()) { <img [src]="avatar()" alt="Tu foto de perfil" referrerpolicy="no-referrer" /> } @else { <span aria-hidden="true">{{ initial() }}</span> }
          </div>
          <div class="who">
            <p class="email">{{ email() }}</p>
            <input #file type="file" accept="image/*" hidden (change)="pick(file)" />
            <ion-button size="small" fill="outline" (click)="file.click()" [disabled]="photoBusy()">{{ avatar() ? 'Cambiar foto' : 'Subir foto' }}</ion-button>
            @if (uploaded()) { <ion-button size="small" fill="clear" color="medium" (click)="removePhoto()" [disabled]="photoBusy()">Quitar</ion-button> }
            @if (photoError()) { <ion-text color="danger"><p>{{ photoError() }}</p></ion-text> }
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header><ion-card-title>Mi meta</ion-card-title></ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-select label="Sexo" labelPlacement="stacked" [value]="sex()" (ionChange)="sex.set($any($event).detail.value)">
                <ion-select-option value="female">Mujer</ion-select-option>
                <ion-select-option value="male">Hombre</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input type="date" label="Fecha de nacimiento" labelPlacement="stacked" [value]="birth()"
                (ionInput)="birth.set($any($event.target).value ?? '')" />
            </ion-item>
            <ion-item>
              <ion-input inputmode="decimal" label="Altura (cm)" labelPlacement="stacked" [value]="heightRaw()"
                (ionInput)="heightRaw.set($any($event.target).value ?? '')" />
            </ion-item>
            <ion-item>
              <ion-input inputmode="decimal" label="Peso objetivo (kg)" labelPlacement="stacked" [value]="goalRaw()"
                (ionInput)="goalRaw.set($any($event.target).value ?? '')" />
            </ion-item>
            <ion-item>
              <ion-select label="Actividad diaria (sin contar entrenamientos)" labelPlacement="stacked" [value]="level()"
                (ionChange)="level.set($any($event).detail.value)">
                @for (l of levels; track l.key) { <ion-select-option [value]="l.key">{{ l.label }}</ion-select-option> }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select label="Ritmo de pérdida" labelPlacement="stacked" [value]="lossPerWeek()"
                (ionChange)="lossPerWeek.set($any($event).detail.value)">
                @for (r of lossOptions; track r) { <ion-select-option [value]="r">{{ r }} kg por semana</ion-select-option> }
              </ion-select>
            </ion-item>
          </ion-list>
          <ion-button expand="block" (click)="saveGoal()" [disabled]="!profile() || goalSaving()">Guardar meta</ion-button>
          @if (goalError()) { <ion-text color="danger"><p>{{ goalError() }}</p></ion-text> }
          @if (plan(); as p) {
            <div class="plan">
              <p><b>Tu meta: {{ p.target }} kcal por día</b></p>
              <p>Metabolismo basal {{ p.bmr }} kcal · gasto diario {{ p.tdee }} kcal (con peso {{ weight() }} kg).</p>
              @if (p.floored) { <p>Bajamos el déficit para no pasar el mínimo recomendado.</p> }
              @if (weeks(); as w) { <p>Al ritmo elegido llegás a tu peso objetivo en unas {{ w }} semanas.</p> }
              <p class="fine">Es una estimación. Si tomás medicación o tenés una condición de salud, consultalo con tu médico o nutricionista.</p>
            </div>
          } @else if (profile() && !weight()) {
            <p class="fine">Cargá tu peso en Actividad para calcular tu meta.</p>
          }
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header><ion-card-title>Cambiar contraseña</ion-card-title></ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-input type="password" label="Contraseña nueva" labelPlacement="stacked" [(ngModel)]="password"
                autocomplete="new-password" (keyup.enter)="save()" />
            </ion-item>
          </ion-list>
          <ion-button expand="block" (click)="save()" [disabled]="!canSave()">Guardar contraseña</ion-button>
          @if (error()) { <ion-text color="danger"><p>{{ error() }}</p></ion-text> }
          @if (done()) { <ion-text color="success"><p>Listo, cambiamos tu contraseña.</p></ion-text> }
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" fill="outline" color="danger" class="logout" (click)="logout()">Cerrar sesión</ion-button>
    </ion-content>
  `,
  styles: `
    .page-head h1 { margin: 0 0 8px; font-family: 'Bricolage Grotesque', var(--ion-font-family); font-weight: 800; letter-spacing: -0.03em; }
    .profile { display: flex; align-items: center; gap: 16px; }
    .avatar { flex: none; width: 88px; height: 88px; border-radius: 50%; overflow: hidden; background: #0f3d3e; color: #c8f169; display: flex; align-items: center; justify-content: center; font: 800 36px 'Bricolage Grotesque', var(--ion-font-family); text-transform: uppercase; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .plan { margin-top: 12px; font-size: 14px; line-height: 1.4; }
    .plan p, .fine { margin: 6px 0; }
    .fine { font-size: 12px; color: var(--ion-color-medium); }
    .who { min-width: 0; }
    .email { margin: 0 0 4px; font-weight: 600; word-break: break-all; }
    .logout { margin: 16px; }
    @media (min-width: 1024px) { ion-card, .logout { max-width: 520px; } }
  `,
})
export class AccountPage implements OnInit {
  private readonly sb = inject(Supabase);
  private readonly profiles = inject(ProfileService);

  readonly email = computed(() => this.sb.session()?.user.email ?? '');
  readonly error = signal<string | null>(null);
  readonly done = signal(false);
  readonly saving = signal(false);
  readonly uploaded = signal<string | null>(null);
  /** Foto subida a mano; si no hay, la de la cuenta de Google. */
  readonly avatar = computed(() => this.uploaded() ?? this.googlePhoto());
  private readonly googlePhoto = computed(() => {
    const meta = this.sb.session()?.user.user_metadata;
    return (meta?.['avatar_url'] ?? meta?.['picture'] ?? null) as string | null;
  });
  readonly photoBusy = signal(false);
  readonly photoError = signal<string | null>(null);
  readonly initial = computed(() => this.email().charAt(0));
  password = '';

  // Meta de calorías
  readonly levels = ACTIVITY_LEVELS;
  readonly lossOptions = WEEKLY_LOSS_OPTIONS;
  readonly sex = signal<Sex>('female');
  readonly birth = signal('');
  readonly heightRaw = signal('');
  readonly goalRaw = signal('');
  readonly level = signal<ActivityLevel>('sedentary');
  readonly lossPerWeek = signal<number>(0.5);
  readonly weight = signal<number | null>(null);
  readonly goalSaving = signal(false);
  readonly goalError = signal<string | null>(null);

  /** Perfil armado con lo que hay en el formulario, o null si falta algo o es inválido. */
  readonly profile = computed<EnergyProfile | null>(() => {
    const height = parseDecimal(this.heightRaw());
    const goal = parseDecimal(this.goalRaw());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.birth()) || !height || !goal) return null;
    if (height < 100 || height > 250 || goal < 30 || goal > 250) return null;
    return {
      sex: this.sex(), birth_date: this.birth(), height_cm: height, goal_weight_kg: goal,
      activity_level: this.level(), weekly_loss_kg: this.lossPerWeek(),
    };
  });
  readonly plan = computed(() => {
    const p = this.profile();
    const w = this.weight();
    return p && w ? dailyPlan(p, w, toIsoDate(new Date())) : null;
  });
  readonly weeks = computed(() => {
    const p = this.profile();
    const w = this.weight();
    return p && w ? weeksToGoal(w, p.goal_weight_kg, p.weekly_loss_kg) : null;
  });

  async saveGoal() {
    const p = this.profile();
    if (!p) return;
    this.goalSaving.set(true);
    this.goalError.set(null);
    try {
      await this.profiles.save(p);
    } catch {
      this.goalError.set('No pudimos guardar tu meta. Probá de nuevo.');
    }
    this.goalSaving.set(false);
  }

  async ngOnInit() {
    await this.sb.ready;
    this.uploaded.set(await this.sb.avatarUrl());
    try {
      const [saved, weight] = await Promise.all([this.profiles.get(), this.profiles.latestWeight()]);
      this.weight.set(weight);
      if (saved) {
        this.sex.set(saved.sex);
        this.birth.set(saved.birth_date);
        this.heightRaw.set(String(saved.height_cm));
        this.goalRaw.set(String(saved.goal_weight_kg));
        this.level.set(saved.activity_level);
        this.lossPerWeek.set(saved.weekly_loss_kg);
      }
    } catch {
      this.goalError.set('No pudimos cargar tu meta.');
    }
  }

  async pick(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await this.runPhoto(async () => {
      const { error } = await this.sb.uploadAvatar(await toAvatarJpeg(file));
      if (error) throw error;
      this.uploaded.set(await this.sb.avatarUrl());
    }, 'No pudimos subir la foto. Probá con otra.');
  }

  async removePhoto() {
    await this.runPhoto(async () => {
      const { error } = await this.sb.removeAvatar();
      if (error) throw error;
      this.uploaded.set(null);
    }, 'No pudimos quitar la foto.');
  }

  private async runPhoto(fn: () => Promise<void>, message: string) {
    this.photoBusy.set(true);
    this.photoError.set(null);
    try { await fn(); } catch { this.photoError.set(message); }
    this.photoBusy.set(false);
  }

  canSave() {
    return this.password.length >= MIN_PASSWORD && !this.saving();
  }

  async save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set(null);
    this.done.set(false);
    const { error } = await this.sb.updatePassword(this.password);
    this.saving.set(false);
    if (error) return this.error.set('No pudimos cambiar la contraseña. Probá de nuevo.');
    this.password = '';
    this.done.set(true);
  }

  logout() {
    this.sb.signOut().then(() => location.assign('/login'));
  }
}
