import { Component, computed, input } from '@angular/core';
import { ChartPoint, chartGeometry } from './labs';

/** Gráfico de línea en SVG, sin dependencias. `refs` dibuja líneas de referencia (ej. TG = 150). */
@Component({
  selector: 'app-line-chart',
  template: `
    @if (points().length) {
      <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" role="img" [attr.aria-label]="ariaLabel()">
        @for (r of refLines(); track r.value) {
          <line [attr.x1]="0" [attr.x2]="width()" [attr.y1]="r.y" [attr.y2]="r.y" class="ref" />
          <text [attr.x]="width() - 4" [attr.y]="r.y - 3" class="ref-label">{{ r.label }}</text>
        }
        <path [attr.d]="geo().path" class="line" />
        @for (d of geo().dots; track d.label) {
          <circle [attr.cx]="d.x" [attr.cy]="d.y" r="4" class="dot"><title>{{ d.label }}: {{ d.value }}</title></circle>
        }
      </svg>
      <div class="axis"><span>{{ points()[0].label }}</span><span>{{ points()[points().length - 1].label }}</span></div>
    } @else {
      <p class="empty">Sin datos todavía</p>
    }
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: auto; }
    .line { fill: none; stroke: var(--trigli-primary-text); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .dot { fill: var(--ion-color-primary); stroke: var(--ion-card-background); stroke-width: 2.5; }
    .ref { stroke: var(--ion-color-medium); stroke-dasharray: 4 4; stroke-width: 1.3; opacity: 0.8; }
    .ref:nth-of-type(n) { }
    .ref-label { fill: var(--ion-color-medium); font-size: 10px; text-anchor: end; }
    .axis { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--ion-color-medium); }
    .empty { color: var(--ion-color-medium); text-align: center; }
  `,
})
export class LineChartComponent {
  readonly points = input.required<ChartPoint[]>();
  readonly refs = input<{ value: number; label: string }[]>([]);
  readonly ariaLabel = input('Gráfico de tendencia');

  readonly width = input(320);
  readonly height = input(180);

  readonly geo = computed(() =>
    chartGeometry(this.points(), this.width(), this.height(), 16, this.refs().map((r) => r.value)),
  );
  readonly refLines = computed(() => this.refs().map((r) => ({ ...r, y: this.geo().yOf(r.value) })));
}
