export interface ReportLab {
  date: string;
  tg: number | null;
  hdl: number | null;
  ldl: number | null;
  total_chol: number | null;
  glucose: number | null;
}

export interface ReportMetric {
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
}

export interface ReportRow extends ReportLab {
  weight_kg: number | null;
  waist_cm: number | null;
}

export const REPORT_COLUMNS = [
  { key: 'tg', label: 'TG (mg/dL)' },
  { key: 'hdl', label: 'HDL' },
  { key: 'ldl', label: 'LDL' },
  { key: 'total_chol', label: 'Colesterol total' },
  { key: 'glucose', label: 'Glucosa' },
  { key: 'weight_kg', label: 'Peso (kg)' },
  { key: 'waist_cm', label: 'Cintura (cm)' },
] as const;

/** Un renglón por fecha con análisis o con peso/cintura, del más antiguo al más reciente. */
export function reportRows(labs: readonly ReportLab[], metrics: readonly ReportMetric[]): ReportRow[] {
  const rows = new Map<string, ReportRow>();
  const blank = (date: string): ReportRow => ({ date, tg: null, hdl: null, ldl: null, total_chol: null, glucose: null, weight_kg: null, waist_cm: null });
  for (const l of labs) rows.set(l.date, { ...blank(l.date), ...l });
  for (const m of metrics) {
    if (m.weight_kg === null && m.waist_cm === null) continue;
    rows.set(m.date, { ...(rows.get(m.date) ?? blank(m.date)), weight_kg: m.weight_kg, waist_cm: m.waist_cm });
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const cell = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
const fmtDate = (iso: string) => iso.split('-').reverse().join('/');

/** CSV con ";" y coma decimal, para que Excel en español lo abra en columnas. */
export function reportCsv(rows: readonly ReportRow[]): string {
  const head = ['Fecha', ...REPORT_COLUMNS.map((c) => c.label)].join(';');
  const body = rows.map((r) => [fmtDate(r.date), ...REPORT_COLUMNS.map((c) => cell(r[c.key]))].join(';'));
  return '﻿' + [head, ...body].join('\r\n') + '\r\n';
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Página lista para imprimir o guardar como PDF. */
export function reportHtml(rows: readonly ReportRow[], generated: string): string {
  const th = ['Fecha', ...REPORT_COLUMNS.map((c) => c.label)].map((h) => `<th>${esc(h)}</th>`).join('');
  const tr = [...rows].reverse().map(
    (r) => `<tr><td>${fmtDate(r.date)}</td>${REPORT_COLUMNS.map((c) => `<td>${cell(r[c.key])}</td>`).join('')}</tr>`,
  ).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Trigli</title>
<style>body{font:14px system-ui,sans-serif;color:#14231a;margin:24px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#55645b}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #c9d4cc;padding:6px 8px;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#eef3ee}</style></head>
<body><h1>Informe de triglicéridos, peso y cintura</h1><p>Generado el ${esc(generated)}. Más reciente primero.</p>
<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`;
}
