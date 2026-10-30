import { chartGeometry, classifyTg, percentChange } from './labs';

describe('labs', () => {
  it('classifies triglycerides', () => {
    expect(classifyTg(149)).toBe('normal');
    expect(classifyTg(150)).toBe('borderline');
    expect(classifyTg(200)).toBe('high');
    expect(classifyTg(500)).toBe('very-high');
  });

  it('percent change first to last', () => {
    expect(percentChange([300, 240])).toBe(-20);
    expect(percentChange([300])).toBeNull();
    expect(percentChange([0, 10])).toBeNull();
  });

  it('chart geometry maps the max to the top and zero to the bottom', () => {
    const g = chartGeometry([{ label: 'a', value: 0 }, { label: 'b', value: 100 }], 200, 100, 10);
    expect(g.dots[0]).toMatchObject({ x: 10, y: 90 });
    expect(g.dots[1]).toMatchObject({ x: 190, y: 10 });
    expect(g.path).toBe('M10.0,90.0 L190.0,10.0');
  });

  it('single point is centered', () => {
    const g = chartGeometry([{ label: 'a', value: 50 }], 200, 100);
    expect(g.dots[0].x).toBe(100);
  });

  it('reference lines extend the scale', () => {
    const g = chartGeometry([{ label: 'a', value: 100 }], 200, 100, 10, [150]);
    expect(g.max).toBe(150);
  });
});
