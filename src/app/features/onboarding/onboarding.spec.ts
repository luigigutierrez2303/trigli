import { describe, expect, it } from 'vitest';
import { allStepsDone, firstSteps, isMinor, needsOnboarding, OnboardingForm, parseOnboarding, parseTg } from './onboarding';

const TODAY = '2026-11-04';
const form: OnboardingForm = {
  sex: 'male', birth: '1990-05-10', heightRaw: '175', weightRaw: '90,5', waistRaw: '', goalRaw: '80', level: 'sedentary', lossPerWeek: 0.5,
};

describe('onboarding', () => {
  it('parses a valid form, accepting comma decimals and an empty waist', () => {
    const r = parseOnboarding(form, TODAY)!;
    expect(r.weightKg).toBe(90.5);
    expect(r.waistCm).toBeNull();
    expect(r.profile.height_cm).toBe(175);
  });

  it('keeps a valid waist and rejects an invalid one', () => {
    expect(parseOnboarding({ ...form, waistRaw: '98' }, TODAY)!.waistCm).toBe(98);
    expect(parseOnboarding({ ...form, waistRaw: '5' }, TODAY)).toBeNull();
  });

  it('rejects missing or out-of-range values', () => {
    expect(parseOnboarding({ ...form, birth: '' }, TODAY)).toBeNull();
    expect(parseOnboarding({ ...form, birth: '2030-01-01' }, TODAY)).toBeNull();
    expect(parseOnboarding({ ...form, heightRaw: '50' }, TODAY)).toBeNull();
    expect(parseOnboarding({ ...form, weightRaw: '' }, TODAY)).toBeNull();
    expect(parseOnboarding({ ...form, goalRaw: '10' }, TODAY)).toBeNull();
  });

  it('flags minors', () => {
    expect(isMinor('2012-01-01', TODAY)).toBe(true);
    expect(isMinor('1990-01-01', TODAY)).toBe(false);
    expect(isMinor('', TODAY)).toBe(false);
  });

  it('triglycerides are optional but validated', () => {
    expect(parseTg('')).toBe('none');
    expect(parseTg('230')).toBe(230);
    expect(parseTg('abc')).toBeNull();
    expect(parseTg('5')).toBeNull();
  });

  it('shows the wizard only without profile and not skipped', () => {
    expect(needsOnboarding(false, false)).toBe(true);
    expect(needsOnboarding(true, false)).toBe(false);
    expect(needsOnboarding(false, true)).toBe(false);
  });

  it('first steps tick off and finish', () => {
    const s = firstSteps({ hasMeal: true, hasWorkout: false, hasWeight: true, hasProfile: true });
    expect(s.filter((x) => x.done).length).toBe(3);
    expect(allStepsDone(s)).toBe(false);
    expect(allStepsDone(firstSteps({ hasMeal: true, hasWorkout: true, hasWeight: true, hasProfile: true }))).toBe(true);
  });
});
