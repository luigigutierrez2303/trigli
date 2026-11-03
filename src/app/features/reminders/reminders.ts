export interface Reminder {
  key: 'meals' | 'weight' | 'waist';
  text: string;
  link: string;
  /** Texto del botón que lleva a cargarlo. */
  action: string;
}

export interface ReminderInput {
  /** Fecha de hoy, YYYY-MM-DD. */
  today: string;
  /** Hora local, 0-23. */
  hour: number;
  lastWeightDate: string | null;
  lastWaistDate: string | null;
  mealsToday: number;
}

export const WEIGHT_EVERY_DAYS = 3;
export const WAIST_EVERY_DAYS = 7;
/** Antes de esta hora no tiene sentido avisar que falta cargar comidas. */
export const MEALS_REMINDER_HOUR = 14;

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** Avisos al abrir la app: lo que falta cargar. Vacío si está todo al día. */
export function reminders(i: ReminderInput): Reminder[] {
  const out: Reminder[] = [];
  if (i.mealsToday === 0 && i.hour >= MEALS_REMINDER_HOUR) {
    out.push({ key: 'meals', text: 'Todavía no cargaste comidas hoy.', link: '/comidas', action: 'Cargar' });
  }
  if (i.lastWeightDate === null) {
    out.push({ key: 'weight', text: 'Cargá tu peso para estimar las calorías y ver la tendencia.', link: '/actividad', action: 'Cargar' });
  } else if (daysBetween(i.lastWeightDate, i.today) >= WEIGHT_EVERY_DAYS) {
    out.push({ key: 'weight', text: `Hace ${daysBetween(i.lastWeightDate, i.today)} días que no cargás tu peso.`, link: '/actividad', action: 'Cargar' });
  }
  if (i.lastWaistDate === null || daysBetween(i.lastWaistDate, i.today) >= WAIST_EVERY_DAYS) {
    out.push({
      key: 'waist',
      text: i.lastWaistDate === null ? 'Medite la cintura: es el mejor indicador junto con los TG.' : `Hace ${daysBetween(i.lastWaistDate, i.today)} días que no medís la cintura.`,
      link: '/actividad',
      action: 'Cargar',
    });
  }
  return out;
}
