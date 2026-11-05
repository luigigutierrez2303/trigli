import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonInput, IonLabel, IonProgressBar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonText,
} from '@ionic/angular';
import { toIsoDate } from '../../core/date';
import { ActivityService } from '../activity/activity.service';
import { ACTIVITY_LEVELS, ActivityLevel, dailyPlan, LOSS_PACES, Sex, weeksToGoal } from '../energy/energy';
import { ProfileService } from '../energy/profile.service';
import { LabService } from '../labs/labs.service';
import { HOW_IT_WORKS, isMinor, parseOnboarding, parseTg } from './onboarding';
import { OnboardingService } from './onboarding.service';

const LAST_STEP = 4;

@Component({
  selector: 'app-onboarding',
  imports: [IonContent, IonButton, IonInput, IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonText, IonProgressBar],
  template: `
    <ion-content class="ion-padding">
      <main class="wrap">
        <ion-progress-bar [value]="(step() + 1) / total" aria-label="Progreso" />
        <p class="count">Paso {{ step() + 1 }} de {{ total }}</p>

        @switch (step()) {
          @case (0) {
            <h1>Bienvenida a Trigli</h1>
            <p class="lead">Te ayudamos a bajar tus triglicéridos registrando lo que comés y cómo te movés. En 2 minutos dejamos todo listo.</p>
            <ul class="bullets">
              <li>Tus datos para calcular tu meta de calorías.</li>
              <li>Tu objetivo de peso y a qué ritmo llegar.</li>
              <li>Un repaso de cómo se usa la app.</li>
            </ul>
          }
          @case (1) {
            <h1>Tus datos</h1>
            <p class="lead">Los usamos para calcular cuánta energía gastás por día.</p>
            <div class="field-label">Sexo</div>
            <ion-segment [value]="sex()" (ionChange)="sex.set($any($event).detail.value)">
              <ion-segment-button value="female"><ion-label>Mujer</ion-label></ion-segment-button>
              <ion-segment-button value="male"><ion-label>Hombre</ion-label></ion-segment-button>
            </ion-segment>
            <div class="grid">
              <ion-input fill="outline" type="date" label="Fecha de nacimiento" labelPlacement="stacked" [value]="birth()"
                (ionInput)="birth.set($any($event.target).value ?? '')" />
              <ion-input fill="outline" inputmode="decimal" label="Altura (cm)" labelPlacement="stacked" placeholder="175"
                [value]="heightRaw()" (ionInput)="heightRaw.set($any($event.target).value ?? '')" />
              <ion-input fill="outline" inputmode="decimal" label="Peso actual (kg)" labelPlacement="stacked" placeholder="90"
                [value]="weightRaw()" (ionInput)="weightRaw.set($any($event.target).value ?? '')" />
              <ion-input fill="outline" inputmode="decimal" label="Cintura (cm, opcional)" labelPlacement="stacked" placeholder="100"
                [value]="waistRaw()" (ionInput)="waistRaw.set($any($event.target).value ?? '')" />
            </div>
            <p class="fine">La cintura te sirve para ver tu progreso más allá de la balanza.</p>
          }
          @case (2) {
            <h1>Tu meta</h1>
            <div class="grid one">
              <ion-input fill="outline" inputmode="decimal" label="Peso objetivo (kg)" labelPlacement="stacked" placeholder="80"
                [value]="goalRaw()" (ionInput)="goalRaw.set($any($event.target).value ?? '')" />
            </div>
            <ion-select fill="outline" label="Actividad diaria" labelPlacement="stacked" cancelText="Cancelar" okText="Aceptar"
              [value]="level()" (ionChange)="level.set($any($event).detail.value)">
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
                <span class="plan-num">{{ p.target }}</span>
                <span>kcal por día<br /><small>tu meta para bajar@if (weeks(); as w) { · ~{{ w }} semanas al objetivo }</small></span>
              </div>
              @if (p.floored) { <p class="fine">Bajamos el déficit para no pasar el mínimo recomendado.</p> }
            }
            @if (minor()) {
              <p class="warn">Sos menor de 18: no es recomendable hacer déficit calórico sin control médico. Hablalo con tu pediatra o nutricionista.</p>
            }
            <p class="fine">Es una estimación. Si estás embarazada, tomás medicación o tenés una condición de salud, consultalo con tu médico o nutricionista.</p>
          }
          @case (3) {
            <h1>Tu último análisis</h1>
            <p class="lead">Si tenés un análisis de sangre reciente, cargá tus triglicéridos para que el gráfico de Lab arranque con un punto. Es opcional.</p>
            <div class="grid one">
              <ion-input fill="outline" inputmode="numeric" label="Triglicéridos (mg/dL)" labelPlacement="stacked" placeholder="220"
                [value]="tgRaw()" (ionInput)="tgRaw.set($any($event.target).value ?? '')" />
            </div>
            <p class="fine">Se guarda con la fecha de hoy. Después podés cargar otros análisis desde Lab.</p>
          }
          @default {
            <h1>Cómo se usa</h1>
            @for (c of how; track c.title) {
              <section class="tip"><h2>{{ c.title }}</h2><p>{{ c.text }}</p></section>
            }
          }
        }

        @if (error()) { <ion-text color="danger"><p role="alert">{{ error() }}</p></ion-text> }

        <div class="actions">
          <ion-button expand="block" (click)="next()" [disabled]="!canNext() || busy()">{{ nextLabel() }}</ion-button>
          @if (step() > 0 && step() < total - 1) { <ion-button expand="block" fill="clear" color="medium" (click)="back()">Volver</ion-button> }
          @if (step() === 3) { <ion-button expand="block" fill="clear" color="medium" (click)="step.set(4)">Saltear este paso</ion-button> }
          @if (step() === 0) { <ion-button expand="block" fill="clear" color="medium" (click)="skip()">Ahora no, lo completo después</ion-button> }
        </div>
      </main>
    </ion-content>
  `,
  styles: `
    .wrap { max-width: 520px; margin: 0 auto; padding-top: max(8px, env(safe-area-inset-top)); }
    .count { margin: 8px 0 24px; font-size: 13px; color: var(--ion-color-medium); }
    h1 { margin: 0 0 8px; font-family: 'Bricolage Grotesque', var(--ion-font-family); font-weight: 800; letter-spacing: -0.03em; }
    h2 { margin: 0 0 4px; font-size: 16px; }
    .lead { margin: 0 0 20px; line-height: 1.5; color: var(--ion-color-medium); }
    .bullets { margin: 0 0 20px; padding-left: 20px; line-height: 1.7; }
    .field-label { margin: 16px 0 8px; font-size: 13px; font-weight: 600; color: var(--ion-color-medium); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
    .grid.one { grid-template-columns: 1fr; }
    ion-select { margin-top: 4px; }
    ion-segment-button small { opacity: 0.75; font-size: 11px; }
    .fine { margin: 6px 0; font-size: 12px; line-height: 1.4; color: var(--ion-color-medium); }
    .warn { margin: 12px 0; padding: 12px; border-radius: var(--trigli-radius-lg); background: var(--trigli-bad-soft); color: var(--trigli-bad-text); font-size: 14px; line-height: 1.4; }
    .plan { display: flex; align-items: center; gap: 14px; margin: 20px 0 4px; padding: 16px; border-radius: var(--trigli-radius-lg); background: var(--trigli-primary-soft); line-height: 1.25; }
    .plan-num { font: 800 44px/1 'Bricolage Grotesque', var(--ion-font-family); color: var(--trigli-primary-text); }
    .plan small { color: var(--ion-color-medium); }
    .tip { margin: 0 0 12px; padding: 14px 16px; border-radius: var(--trigli-radius-lg); background: var(--trigli-primary-soft); }
    .tip p { margin: 0; font-size: 14px; line-height: 1.5; }
    .actions { margin-top: 28px; }
  `,
})
export class OnboardingPage {
  private readonly router = inject(Router);
  private readonly profiles = inject(ProfileService);
  private readonly activity = inject(ActivityService);
  private readonly labs = inject(LabService);
  private readonly onboarding = inject(OnboardingService);

  readonly total = LAST_STEP + 1;
  readonly how = HOW_IT_WORKS;
  readonly levels = ACTIVITY_LEVELS;
  readonly lossOptions = LOSS_PACES;
  readonly step = signal(0);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly sex = signal<Sex>('female');
  readonly birth = signal('');
  readonly heightRaw = signal('');
  readonly weightRaw = signal('');
  readonly waistRaw = signal('');
  readonly goalRaw = signal('');
  readonly level = signal<ActivityLevel>('sedentary');
  readonly lossPerWeek = signal<number>(0.5);
  readonly tgRaw = signal('');

  private readonly today = toIsoDate(new Date());
  readonly data = computed(() =>
    parseOnboarding({
      sex: this.sex(), birth: this.birth(), heightRaw: this.heightRaw(), weightRaw: this.weightRaw(), waistRaw: this.waistRaw(),
      goalRaw: this.goalRaw(), level: this.level(), lossPerWeek: this.lossPerWeek(),
    }, this.today),
  );
  readonly plan = computed(() => {
    const d = this.data();
    return d ? dailyPlan(d.profile, d.weightKg, this.today) : null;
  });
  readonly weeks = computed(() => {
    const d = this.data();
    return d ? weeksToGoal(d.weightKg, d.profile.goal_weight_kg, d.profile.weekly_loss_kg) : null;
  });
  readonly minor = computed(() => isMinor(this.birth(), this.today));

  /** El paso 2 pide los datos básicos; el 3, que todo el formulario sea válido. */
  private readonly basicsOk = computed(() => {
    const b = parseOnboarding({
      sex: this.sex(), birth: this.birth(), heightRaw: this.heightRaw(), weightRaw: this.weightRaw(), waistRaw: this.waistRaw(),
      goalRaw: '80', level: this.level(), lossPerWeek: this.lossPerWeek(),
    }, this.today);
    return b !== null;
  });

  readonly canNext = computed(() => {
    switch (this.step()) {
      case 1: return this.basicsOk();
      case 2: return this.data() !== null;
      case 3: return parseTg(this.tgRaw()) !== null;
      default: return true;
    }
  });
  readonly nextLabel = computed(() => {
    switch (this.step()) {
      case 0: return 'Empezar';
      case 2: return this.busy() ? 'Guardando…' : 'Guardar y seguir';
      case 4: return 'Cargar mi primera comida';
      default: return 'Siguiente';
    }
  });

  constructor() {
    // Quien repite el tutorial desde Mi cuenta ve sus datos ya cargados.
    void (async () => {
      try {
        const [p, w] = await Promise.all([this.profiles.get(), this.profiles.latestWeight()]);
        if (w) this.weightRaw.set(String(w));
        if (!p) return;
        this.sex.set(p.sex);
        this.birth.set(p.birth_date);
        this.heightRaw.set(String(p.height_cm));
        this.goalRaw.set(String(p.goal_weight_kg));
        this.level.set(p.activity_level);
        this.lossPerWeek.set(p.weekly_loss_kg);
      } catch { /* formulario vacío */ }
    })();
  }

  back() {
    this.error.set(null);
    this.step.update((s) => Math.max(0, s - 1));
  }

  skip() {
    this.onboarding.setSkipped(true);
    this.router.navigateByUrl('/resumen');
  }

  async next() {
    this.error.set(null);
    const s = this.step();
    if (s === 2) return this.saveProfile();
    if (s === 3) return this.saveTg();
    if (s === LAST_STEP) {
      this.onboarding.setSkipped(true);
      return void this.router.navigateByUrl('/comidas');
    }
    this.step.set(s + 1);
  }

  private async saveProfile() {
    const d = this.data();
    if (!d) return;
    this.busy.set(true);
    try {
      await this.profiles.save(d.profile);
      await this.activity.saveMetric(this.today, { weight_kg: d.weightKg, ...(d.waistCm !== null ? { waist_cm: d.waistCm } : {}) });
      this.step.set(3);
    } catch {
      this.error.set('No pudimos guardar tus datos. Revisá tu conexión y probá de nuevo.');
    }
    this.busy.set(false);
  }

  private async saveTg() {
    const tg = parseTg(this.tgRaw());
    if (tg === null) return;
    if (tg === 'none') return void this.step.set(4);
    this.busy.set(true);
    try {
      await this.labs.add({ date: this.today, tg });
      this.step.set(4);
    } catch {
      this.error.set('No pudimos guardar el análisis. Probá de nuevo o salteá este paso.');
    }
    this.busy.set(false);
  }
}
