import { estimate1RM, isValidLoad, isValidReps, sessionVolume, suggestNext } from './strength';

describe('strength progression', () => {
  it('first time starts at the bottom of the range', () => {
    expect(suggestNext([])).toEqual({ weight_kg: null, reps: 8, reason: 'first' });
  });

  it('adds a rep while below the top of the range', () => {
    const last = [{ reps: 10, weight_kg: 14 }, { reps: 9, weight_kg: 14 }];
    expect(suggestNext(last)).toEqual({ weight_kg: 14, reps: 10, reason: 'add-rep' });
  });

  it('adds weight when every set hits the top', () => {
    const last = [{ reps: 12, weight_kg: 14 }, { reps: 12, weight_kg: 14 }];
    expect(suggestNext(last)).toEqual({ weight_kg: 16, reps: 8, reason: 'add-weight' });
  });

  it('only judges the heaviest sets', () => {
    const last = [{ reps: 12, weight_kg: 10 }, { reps: 8, weight_kg: 14 }];
    expect(suggestNext(last)).toEqual({ weight_kg: 14, reps: 9, reason: 'add-rep' });
  });

  it('bodyweight keeps adding reps', () => {
    expect(suggestNext([{ reps: 12, weight_kg: null }])).toEqual({ weight_kg: null, reps: 12, reason: 'add-rep' });
  });

  it('volume and 1RM', () => {
    expect(sessionVolume([{ reps: 10, weight_kg: 10 }, { reps: 8, weight_kg: 12 }])).toBe(196);
    expect(estimate1RM(30, 10)).toBe(40);
  });

  it('validates inputs', () => {
    expect(isValidReps(10)).toBe(true);
    expect(isValidReps(0)).toBe(false);
    expect(isValidReps(2.5)).toBe(false);
    expect(isValidLoad(0)).toBe(true);
    expect(isValidLoad(-1)).toBe(false);
  });
});
