import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonInput, IonItem, IonList,
  IonIcon, IonLabel, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonText, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { Supabase } from '../../core/supabase';
import { ThemeMode, ThemeService } from '../../core/theme';
import { toIsoDate } from '../../core/date';
import { isValidWeight, parseDecimal } from '../activity/activity';
import { ActivityService } from '../activity/activity.service';
import { ACTIVITY_LEVELS, ActivityLevel, dailyPlan, EnergyProfile, LOSS_PACES, Sex, weeksToGoal } from '../energy/energy';
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
    FormsModule, RouterLink, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonInput,
    IonButton, IonText, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonLabel, IonIcon,
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
        <ion-card-header><ion-card-title>Apariencia</ion-card-title></ion-card-header>
        <ion-card-content>
          <ion-segment [value]="theme.mode()" (ionChange)="theme.set($any($event).detail.value)">
            @for (o of themeOptions; track o.value) {
              <ion-segment-button [value]="o.value"><ion-label>{{ o.label }}</ion-label></ion-segment-button>
            }
          </ion-segment>
          <p class="fine">Automático sigue el modo claro u oscuro de tu dispositivo.</p>
        </ion-card-content>
      </ion-card>

      <ion-card class="goal">
        <ion-card-header>
          <div>
            <ion-card-title>Mi meta</ion-card-title>
            <p class="lead">Con estos datos calculamos tus calorías diarias.</p>
          </div>
        </ion-card-header>
        <ion-card-content>
          <div class="field-label">Sexo</div>
          <ion-segment [value]="sex()" (ionChange)="sex.set($any($event).detail.value)">
            <ion-segment-button value="female"><ion-label>Mujer</ion-label></ion-segment-button>
            <ion-segment-button value="male"><ion-label>Hombre</ion-label></ion-segment-button>
          </ion-segment>

          <div class="grid">
            <ion-input fill="outline" type="date" label="Fecha de nacimiento" labelPlacement="stacked" [value]="birth()"
              (ionInput)="birth.set($any($event.target).value ?? '')" />
            <ion-input fill="outline" inputmode="decimal" label="Altura (cm)" labelPlacement="stacked" placeholder="175" [value]="heightRaw()"
              (ionInput)="heightRaw.set($any($event.target).value ?? '')" />
            <ion-input fill="outline" inputmode="decimal" label="Peso actual (kg)" labelPlacement="stacked" placeholder="90" [value]="weightRaw()"
              (ionInput)="weightRaw.set($any($event.target).value ?? '')" />
            <ion-input fill="outline" inputmode="decimal" label="Peso objetivo (kg)" labelPlacement="stacked" placeholder="80" [value]="goalRaw()"
              (ionInput)="goalRaw.set($any($event.target).value ?? '')" />
          </div>

          <ion-select fill="outline" label="Actividad diaria" labelPlacement="stacked" [value]="level()"
            (ionChange)="level.set($any($event).detail.value)">
            @for (l of levels; track l.key) { <ion-select-option [value]="l.key">{{ l.label }}</ion-select-option> }
          </ion-select>
          <p class="fine">Sin contar tus entrenamientos: esos se suman aparte cuando los registrás.</p>

          <div class="field-label">Ritmo de pérdida</div>
          <ion-segment [value]="lossPerWeek()" (ionChange)="lossPerWeek.set($any($event).detail.value)">
            @for (r of lossOptions; track r.value) {
              <ion-segment-button [value]="r.value"><ion-label>{{ r.name }}<br /><small>{{ r.value }} kg/sem</small></ion-label></ion-segment-button>
            }
          </ion-segment>

          @if (plan(); as p) {
            <div class="plan" aria-live="polite">
              <div class="plan-main">
                <span class="plan-num">{{ p.target }}</span>
                <span>kcal por día<br /><small>tu meta para bajar</small></span>
              </div>
              <div class="tiles">
                <div><b>{{ p.bmr }}</b><small>metabolismo basal</small></div>
                <div><b>{{ p.tdee }}</b><small>gasto diario</small></div>
                @if (weeks(); as w) { <div><b>~{{ w }}</b><small>semanas al objetivo</small></div> }
              </div>
              @if (p.floored) { <p class="fine">Bajamos el déficit para no pasar el mínimo recomendado.</p> }
            </div>
          } @else if (profile()) {
            <p class="fine">Cargá tu peso actual para ver tu meta de calorías.</p>
          }

          <ion-button expand="block" class="save" [class.saved]="isSaved()" (click)="saveGoal()" [disabled]="!canSaveGoal()">
            {{ goalSaving() ? 'Guardando…' : isSaved() ? '✓ Guardado' : 'Guardar meta' }}
          </ion-button>
          @if (goalError()) { <ion-text color="danger"><p>{{ goalError() }}</p></ion-text> }
          <p class="fine">Es una estimación. Si tomás medicación o tenés una condición de salud, consultalo con tu médico o nutricionista.</p>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header><ion-card-title>Mis alimentos</ion-card-title></ion-card-header>
        <ion-card-content>
          <p class="fine">Corregí calorías y porciones, sumá tus comidas u ocultá las que no usás.</p>
          <ion-button expand="block" fill="outline" routerLink="/alimentos">Editar mis alimentos</ion-button>
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

      <ion-card>
        <ion-card-content class="signout-card">
          <button type="button" class="signout" (click)="logout()">
            <ion-icon name="log-out-outline" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: `
    .page-head h1 { margin: 0 0 8px; font-family: 'Bricolage Grotesque', var(--ion-font-family); font-weight: 800; letter-spacing: -0.03em; }
    .profile { display: flex; align-items: center; gap: 16px; }
    .avatar { flex: none; width: 88px; height: 88px; border-radius: 50%; overflow: hidden; background: #0f3d3e; color: #c8f169; display: flex; align-items: center; justify-content: center; font: 800 36px 'Bricolage Grotesque', var(--ion-font-family); text-transform: uppercase; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .lead { margin: 4px 0 0; font-size: 14px; color: var(--ion-color-medium); }
    .field-label { margin: 16px 0 8px; font-size: 13px; font-weight: 600; color: var(--ion-color-medium); }
    .lead + .field-label, .field-label:first-child { margin-top: 0; }
    .goal ion-card-content { padding-top: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
    ion-select { margin-top: 4px; }
    ion-segment-button small { opacity: 0.75; font-size: 11px; }
    .fine { margin: 6px 0; font-size: 12px; line-height: 1.4; color: var(--ion-color-medium); }
    .plan { margin: 20px 0 4px; padding: 16px; border-radius: var(--trigli-radius-lg); background: var(--trigli-primary-soft); }
    .plan-main { display: flex; align-items: center; gap: 14px; line-height: 1.25; }
    .plan-num { font: 800 44px/1 'Bricolage Grotesque', var(--ion-font-family); color: var(--trigli-primary-text); }
    .plan small { color: var(--ion-color-medium); }
    .tiles { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 12px; }
    .tiles div { display: flex; flex-direction: column; }
    .tiles b { font-size: 16px; }
    .save { margin-top: 20px; }
    .save.saved { --background: var(--trigli-ok-soft); --color: var(--trigli-ok-text); --opacity: 1; }
    .who { min-width: 0; }
    .email { margin: 0 0 4px; font-weight: 600; word-break: break-all; }
    .signout-card { padding: 4px; }
    .signout { width: 100%; min-height: 52px; display: flex; align-items: center; gap: 12px; padding: 0 16px; border: 0; border-radius: 12px; background: transparent; color: var(--ion-color-danger); font: inherit; font-weight: 600; cursor: pointer; }
    .signout:hover { background: var(--trigli-bad-soft); }
    .signout ion-icon { font-size: 22px; }
    @media (min-width: 1024px) { ion-card { max-width: 640px; } }
  `,
})
export class AccountPage implements OnInit {
  private readonly sb = inject(Supabase);
  private readonly profiles = inject(ProfileService);
  private readonly activity = inject(ActivityService);
  private readonly toast = inject(ToastController);
  readonly theme = inject(ThemeService);
  readonly themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'auto', label: 'Automático' },
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
  ];

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
  readonly lossOptions = LOSS_PACES;
  readonly sex = signal<Sex>('female');
  readonly birth = signal('');
  readonly heightRaw = signal('');
  readonly goalRaw = signal('');
  readonly level = signal<ActivityLevel>('sedentary');
  readonly lossPerWeek = signal<number>(0.5);
  readonly weightRaw = signal('');
  readonly weight = computed(() => {
    const w = parseDecimal(this.weightRaw());
    return isValidWeight(w) ? w : null;
  });
  /** Foto del formulario tal como quedó guardado; sirve para saber si hay cambios sin guardar. */
  private readonly savedKey = signal<string | null>(null);
  private readonly formKey = computed(() =>
    JSON.stringify([this.profile(), this.weight()]),
  );
  readonly dirty = computed(() => this.formKey() !== this.savedKey());
  readonly justSaved = signal(false);
  readonly isSaved = computed(() => this.justSaved() && !this.dirty());
  readonly canSaveGoal = computed(() => !!this.profile() && this.weight() !== null && this.dirty() && !this.goalSaving());
  private lastSavedWeight: number | null = null;
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
    const w = this.weight();
    if (!p || w === null) return;
    this.goalSaving.set(true);
    this.goalError.set(null);
    try {
      await this.profiles.save(p);
      if (w !== this.lastSavedWeight) {
        await this.activity.saveMetric(toIsoDate(new Date()), { weight_kg: w });
        this.lastSavedWeight = w;
      }
      this.savedKey.set(this.formKey());
      this.justSaved.set(true);
      (await this.toast.create({ message: 'Meta guardada', duration: 2000, color: 'success' })).present();
    } catch {
      this.goalError.set('No pudimos guardar tu meta. Revisá tu conexión y probá de nuevo.');
    }
    this.goalSaving.set(false);
  }

  constructor() {
    addIcons({ logOutOutline });
  }

  async ngOnInit() {
    await this.sb.ready;
    this.uploaded.set(await this.sb.avatarUrl());
    try {
      const [saved, weight] = await Promise.all([this.profiles.get(), this.profiles.latestWeight()]);
      this.lastSavedWeight = weight;
      if (weight) this.weightRaw.set(String(weight));
      if (saved) {
        this.sex.set(saved.sex);
        this.birth.set(saved.birth_date);
        this.heightRaw.set(String(saved.height_cm));
        this.goalRaw.set(String(saved.goal_weight_kg));
        this.level.set(saved.activity_level);
        this.lossPerWeek.set(saved.weekly_loss_kg);
        this.savedKey.set(this.formKey());
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
