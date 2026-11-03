import { litres, stepGlasses } from './water';

describe('water', () => {
  it('no baja de 0 ni pasa de 30', () => {
    expect(stepGlasses(0, -1)).toBe(0);
    expect(stepGlasses(30, 1)).toBe(30);
    expect(stepGlasses(3, 1)).toBe(4);
  });

  it('convierte vasos a litros con coma', () => {
    expect(litres(8)).toBe('2,0');
    expect(litres(3)).toBe('0,75');
  });
});
