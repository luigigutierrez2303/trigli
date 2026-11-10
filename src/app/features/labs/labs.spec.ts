import { chartDomain, chartGeometry, classifyTg, percentChange } from './labs';

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

  it('chart geometry puts zero at the bottom and leaves room above the max', () => {
    const g = chartGeometry([{ label: 'a', value: 0 }, { label: 'b', value: 100 }], 200, 100, 10);
    expect(g.min).toBe(0);
    expect(g.max).toBe(120);
    expect(g.dots[0]).toMatchObject({ x: 10, y: 90 });
    expect(g.dots[1].x).toBe(190);
    expect(g.dots[1].y).toBeCloseTo(23.3, 1);
  });

  it('chart domain hugs the data instead of starting at zero', () => {
    const d = chartDomain([411, 409, 150, 200]);
    expect(d.min).toBeGreaterThan(90);
    expect(d.max).toBeGreaterThan(411);
  });

  it('a flat series sits in the middle of the chart', () => {
    const g = chartGeometry([{ label: 'a', value: 95 }, { label: 'b', value: 95 }], 200, 100, 10);
    expect(g.dots[0].y).toBeCloseTo(50, 5);
  });

  it('single point is centered', () => {
    const g = chartGeometry([{ label: 'a', value: 50 }], 200, 100);
    expect(g.dots[0].x).toBe(100);
  });

  it('reference lines extend the scale', () => {
    const g = chartGeometry([{ label: 'a', value: 100 }], 200, 100, 10, [150]);
    expect(g.max).toBeGreaterThanOrEqual(150);
  });
});
