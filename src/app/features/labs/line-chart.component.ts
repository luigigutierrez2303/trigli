import { Component, computed, input } from '@angular/core';
import { ChartPoint, chartGeometry } from './labs';

const shortDate = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })
    : iso;

/**
 * Gráfico de línea en SVG, sin dependencias. `refs` dibuja líneas de referencia (ej. TG = 150);
 * con `zones` pinta franjas de color entre ellas (normal, límite, alto) y rotula el último punto.
 */
@Component({
  selector: 'app-line-chart',
  template: `
    @if (points().length) {
      <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" role="img" [attr.aria-label]="ariaLabel()">
        @if (zones()) {
          @for (z of zoneRects(); track z.kind) {
            <rect [attr.x]="0" [attr.y]="z.y" [attr.width]="width()" [attr.height]="z.h" [attr.data-zone]="z.kind" class="zone" />
          }
        }
        @for (r of refLines(); track r.value) {
          <line [attr.x1]="0" [attr.x2]="width()" [attr.y1]="r.y" [attr.y2]="r.y" class="ref" />
          @if (r.label) { <text [attr.x]="6" [attr.y]="r.y - 5" class="ref-label">{{ r.label }}</text> }
        }
        @if (points().length > 1) { <path [attr.d]="areaPath()" class="area" /> }
        <path [attr.d]="geo().path" class="line" />
        @for (d of geo().dots; track d.label; let last = $last) {
          <circle [attr.cx]="d.x" [attr.cy]="d.y" [attr.r]="last ? 6 : 4" class="dot"><title>{{ d.label }}: {{ d.value }}</title></circle>
          @if (zones() && last) {
            <text [attr.x]="d.x" [attr.y]="d.y - 14" class="last" [attr.text-anchor]="d.x > width() - 40 ? 'end' : 'middle'">{{ d.value }}</text>
          }
        }
      </svg>
      <div class="axis"><span>{{ fmt(points()[0].label) }}</span><span>{{ fmt(points()[points().length - 1].label) }}</span></div>
    } @else {
      <p class="empty">Sin datos todavía</p>
    }
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: auto; display: block; overflow: visible; }
    .zone { opacity: 0.55; }
    .zone[data-zone='ok'] { fill: var(--trigli-ok-soft); }
    .zone[data-zone='warn'] { fill: var(--trigli-warn-soft); }
    .zone[data-zone='bad'] { fill: var(--trigli-bad-soft); }
    .line { fill: none; stroke: var(--trigli-primary-text); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .area { fill: var(--trigli-primary-text); opacity: 0.1; stroke: none; }
    .dot { fill: var(--ion-card-background); stroke: var(--trigli-primary-text); stroke-width: 3; }
    .ref { stroke: var(--ion-color-medium); stroke-dasharray: 4 4; stroke-width: 1.2; opacity: 0.7; }
    .ref-label { fill: var(--ion-color-medium); font-size: 11px; font-weight: 600; }
    .last { fill: var(--ion-text-color); font-size: 14px; font-weight: 800; }
    .axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.75rem; color: var(--ion-color-medium); }
    .empty { color: var(--ion-color-medium); text-align: center; }
  `,
})
export class LineChartComponent {
  readonly points = input.required<ChartPoint[]>();
  readonly refs = input<{ value: number; label: string }[]>([]);
  readonly zones = input(false);
  readonly ariaLabel = input('Gráfico de tendencia');

  readonly width = input(320);
  readonly height = input(180);

  readonly geo = computed(() =>
    chartGeometry(this.points(), this.width(), this.height(), 16, this.refs().map((r) => r.value)),
  );
  readonly refLines = computed(() => this.refs().map((r) => ({ ...r, y: this.geo().yOf(r.value) })));
  readonly fmt = shortDate;

  /** Línea cerrada hasta el piso del gráfico, para rellenar debajo. */
  readonly areaPath = computed(() => {
    const dots = this.geo().dots;
    const floor = this.geo().yOf(this.geo().min);
    return `${this.geo().path} L${dots.at(-1)!.x.toFixed(1)},${floor.toFixed(1)} L${dots[0].x.toFixed(1)},${floor.toFixed(1)} Z`;
  });

  /** Franjas por tramo entre referencias: bajo la primera = ok, entre ellas = límite, sobre la última = alto. */
  readonly zoneRects = computed(() => {
    const ys = [...this.refLines()].sort((a, b) => b.y - a.y).map((r) => r.y); // de abajo hacia arriba
    if (!ys.length) return [];
    const floor = this.geo().yOf(this.geo().min);
    const edges = [floor, ...ys, 0];
    const kinds: ('ok' | 'warn' | 'bad')[] = ['ok', 'warn', 'bad'];
    return edges.slice(0, -1).map((bottom, i) => {
      const top = edges[i + 1];
      return { kind: kinds[Math.min(i, 2)], y: top, h: Math.max(bottom - top, 0) };
    });
  });
}
