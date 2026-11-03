import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonRefresher, IonRefresherContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barbellOutline, trashOutline } from 'ionicons/icons';
import { finishRefresh } from '../../core/refresh';
import { nextDay } from './training-plan';
import { NotifyService } from '../../core/notify';
import { toIsoDate } from '../../core/date';
import { isValidMinutes, parseDecimal } from '../activity/activity';
import { kcalBurned, STRENGTH_MET } from '../energy/energy';
import { ProfileService } from '../energy/profile.service';
import { isValidLoad, isValidReps, SetEntry, sessionVolume, suggestNext } from './strength';
import { Exercise, NewSet, StrengthService, StrengthSession } from './strength.service';

@Component({
  selector: 'app-strength',
  imports: [
    IonButton, IonIcon, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonBadge, IonInput, IonSelect,
    IonSelectOption, IonRefresher, IonRefresherContent,
  ],
  templateUrl: './strength.page.html',
  styleUrl: './strength.page.scss',
})
export class StrengthPage implements OnInit {
  private readonly strength = inject(StrengthService);
  private readonly notify = inject(NotifyService);

  readonly exercises = signal<Exercise[]>([]);
  readonly sessions = signal<StrengthSession[]>([]);
  readonly saving = signal(false);

  // Serie en edición
  readonly exerciseId = signal<string | null>(null);
  readonly lastSets = signal<SetEntry[]>([]);
  readonly repsRaw = signal('');
  readonly weightRaw = signal('');

  // Sesión en curso
  readonly draft = signal<NewSet[]>([]);
  readonly durationRaw = signal('');
  private readonly profiles = inject(ProfileService);
  private readonly lastWeight = signal<number | null>(null);
  readonly fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  readonly sessionKcal = computed(() => {
    const w = this.lastWeight();
    const min = parseDecimal(this.durationRaw());
    return w && isValidMinutes(min) ? kcalBurned(STRENGTH_MET, w, min) : null;
  });

  /** El día del plan que toca, según la última sesión cargada. */
  readonly todayPlan = computed(() => nextDay(this.sessions()[0]?.workout_set.map((w) => w.exercise?.name ?? '') ?? null));
  readonly idByName = computed(() => new Map(this.exercises().map((e) => [e.name, e.id])));

  pickPlanned(name: string) {
    const id = this.idByName().get(name);
    if (id) this.selectExercise(id);
  }

  readonly nameById = computed(() => new Map(this.exercises().map((e) => [e.id, e.name])));
  readonly suggestion = computed(() => (this.exerciseId() ? suggestNext(this.lastSets()) : null));
  readonly suggestionText = computed(() => {
    const s = this.suggestion();
    if (!s) return '';
    if (s.reason === 'first') return 'Primera vez: arrancá liviano y anotá la carga.';
    const load = s.weight_kg === null ? 'peso corporal' : `${s.weight_kg} kg`;
    return `${s.reason === 'add-weight' ? 'Subí la carga' : 'Mismo peso, una rep más'}: ${load} × ${s.reps}`;
  });

  readonly canAddSet = computed(
    () => !!this.exerciseId() && isValidReps(parseDecimal(this.repsRaw())) &&
      (this.weightRaw().trim() === '' || isValidLoad(parseDecimal(this.weightRaw()))),
  );
  readonly canSave = computed(() => this.draft().length > 0 && isValidMinutes(parseDecimal(this.durationRaw())));
  readonly draftVolume = computed(() => sessionVolume(this.draft()));
  readonly draftGroups = computed(() => {
    const groups = new Map<string, NewSet[]>();
    for (const s of this.draft()) groups.set(s.exercise_id, [...(groups.get(s.exercise_id) ?? []), s]);
    return [...groups].map(([id, sets]) => ({ name: this.nameById().get(id) ?? '', sets }));
  });

  constructor() {
    addIcons({ barbellOutline, trashOutline });
  }

  ngOnInit() {
    return this.load();
  }

  refresh(ev: Event) {
    return finishRefresh(ev, () => this.load());
  }

  private async load() {
    try {
      const [exercises, sessions, weight] = await Promise.all([
        this.strength.exercises(), this.strength.recentSessions(), this.profiles.latestWeight(),
      ]);
      this.lastWeight.set(weight);
      this.exercises.set(exercises);
      this.sessions.set(sessions);
    } catch (e) {
      this.notify.error(e);
    }
  }

  async selectExercise(id: string) {
    this.exerciseId.set(id);
    this.lastSets.set([]);
    try {
      this.lastSets.set(await this.strength.lastSets(id));
    } catch (e) {
      this.notify.error(e);
    }
    const s = this.suggestion();
    if (s) {
      this.repsRaw.set(String(s.reps));
      this.weightRaw.set(s.weight_kg === null ? '' : String(s.weight_kg));
    }
  }

  addSet() {
    const exercise_id = this.exerciseId();
    if (!exercise_id || !this.canAddSet()) return;
    const set_number = this.draft().filter((s) => s.exercise_id === exercise_id).length + 1;
    const weight = this.weightRaw().trim() === '' ? null : parseDecimal(this.weightRaw());
    this.draft.update((list) => [...list, { exercise_id, set_number, reps: parseDecimal(this.repsRaw())!, weight_kg: weight }]);
  }

  removeLastSet() {
    this.draft.update((list) => list.slice(0, -1));
  }

  async saveSession() {
    if (!this.canSave()) return;
    this.saving.set(true);
    try {
      await this.strength.saveSession(toIsoDate(new Date()), parseDecimal(this.durationRaw())!, null, this.draft(), this.sessionKcal());
      this.draft.set([]);
      this.durationRaw.set('');
      this.exerciseId.set(null);
      this.sessions.set(await this.strength.recentSessions());
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  async removeSession(id: string) {
    try {
      await this.strength.removeSession(id);
      this.sessions.update((list) => list.filter((s) => s.id !== id));
    } catch (e) {
      this.notify.error(e);
    }
  }

  summarize(s: StrengthSession): string {
    const names = [...new Set(s.workout_set.map((w) => w.exercise?.name).filter(Boolean))];
    return `${names.join(' · ')} — ${s.workout_set.length} series`;
  }


}
