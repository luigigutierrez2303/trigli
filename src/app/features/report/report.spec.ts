import { reportCsv, reportHtml, reportRows } from './report';

const lab = (date: string, tg: number | null) => ({ date, tg, hdl: null, ldl: null, total_chol: null, glucose: null });

describe('report', () => {
  it('une análisis y medidas por fecha, ordenado', () => {
    const rows = reportRows(
      [lab('2026-10-10', 180), lab('2026-09-01', 220)],
      [{ date: '2026-10-10', weight_kg: 84.5, waist_cm: 95 }, { date: '2026-09-15', weight_kg: 86, waist_cm: null }, { date: '2026-09-20', weight_kg: null, waist_cm: null }],
    );
    expect(rows.map((r) => r.date)).toEqual(['2026-09-01', '2026-09-15', '2026-10-10']);
    expect(rows[2]).toMatchObject({ tg: 180, weight_kg: 84.5, waist_cm: 95 });
  });

  it('CSV con punto y coma, coma decimal y fecha dd/mm/aaaa', () => {
    const csv = reportCsv(reportRows([lab('2026-10-10', 180)], [{ date: '2026-10-10', weight_kg: 84.5, waist_cm: null }]));
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe('Fecha;TG (mg/dL);HDL;LDL;Colesterol total;Glucosa;Peso (kg);Cintura (cm)');
    expect(lines[1]).toBe('10/10/2026;180;;;;;84,5;');
  });

  it('el HTML escapa el texto y lista lo más reciente primero', () => {
    const html = reportHtml(reportRows([lab('2026-09-01', 220), lab('2026-10-10', 180)], []), '3/11/2026 <x>');
    expect(html).toContain('&lt;x&gt;');
    expect(html.indexOf('10/10/2026')).toBeLessThan(html.indexOf('01/09/2026'));
  });
});
