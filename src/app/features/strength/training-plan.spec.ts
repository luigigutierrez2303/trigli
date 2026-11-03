import { dayOfSession, nextDay, PLAN } from './training-plan';

describe('training plan', () => {
  it('sin historial arranca por empuje', () => {
    expect(nextDay(null).key).toBe('push');
    expect(nextDay([]).key).toBe('push');
  });

  it('rota empuje, tracción y piernas', () => {
    expect(nextDay(['Press banca con mancuernas', 'Elevaciones laterales']).key).toBe('pull');
    expect(nextDay(['Remo a una mano', 'Curl de bíceps']).key).toBe('legs');
    expect(nextDay(['Estocadas', 'Hip thrust']).key).toBe('push');
  });

  it('reconoce la sesión por mayoría de ejercicios', () => {
    expect(dayOfSession(['Peso muerto rumano', 'Remo a una mano', 'Pullover'])?.key).toBe('pull');
    expect(dayOfSession(['Ejercicio inventado'])).toBeNull();
  });

  it('todos los ejercicios del plan existen en el catálogo inicial', () => {
    const seed = ['Press banca con mancuernas', 'Press inclinado con mancuernas', 'Remo a una mano', 'Pullover', 'Press militar sentado',
      'Elevaciones laterales', 'Curl de bíceps', 'Extensión de tríceps acostado', 'Sentadilla goblet', 'Peso muerto rumano', 'Estocadas',
      'Sentadilla búlgara', 'Hip thrust'];
    for (const d of PLAN) for (const e of d.exercises) expect(seed).toContain(e);
  });
});
