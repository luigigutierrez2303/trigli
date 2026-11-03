import { reminders } from './reminders';

const base = { today: '2026-11-03', hour: 18, lastWeightDate: '2026-11-02', lastWaistDate: '2026-10-30', mealsToday: 2 };

describe('reminders', () => {
  it('no avisa nada si está todo al día', () => {
    expect(reminders(base)).toEqual([]);
  });

  it('avisa de comidas solo después de las 14', () => {
    expect(reminders({ ...base, mealsToday: 0, hour: 10 })).toEqual([]);
    expect(reminders({ ...base, mealsToday: 0 }).map((r) => r.key)).toEqual(['meals']);
  });

  it('avisa del peso a los 3 días', () => {
    expect(reminders({ ...base, lastWeightDate: '2026-10-31' })[0].text).toBe('Hace 3 días que no cargás tu peso.');
    expect(reminders({ ...base, lastWeightDate: '2026-11-01' })).toEqual([]);
  });

  it('avisa de la cintura a la semana o si nunca la cargó', () => {
    expect(reminders({ ...base, lastWaistDate: '2026-10-27' })[0].text).toBe('Hace 7 días que no medís la cintura.');
    expect(reminders({ ...base, lastWaistDate: null }).map((r) => r.key)).toEqual(['waist']);
  });

  it('pide el primer peso si nunca cargó uno', () => {
    expect(reminders({ ...base, lastWeightDate: null })[0].key).toBe('weight');
  });
});
