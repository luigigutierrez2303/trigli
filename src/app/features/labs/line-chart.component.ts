import { Component, computed, input } from '@angular/core';
import { ChartPoint, chartGeometry } from './labs';

const WIDTH = 320;
const HEIGHT = 180;

/** Gráfico de línea en SVG, sin dependencias. `refs` dibuja líneas de referencia (ej. TG = 150). */
@Component({
  selector: 'app-line-chart',
  template: `
    @if (points().length) {
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="ariaLabel()">
        @for (r of refLines(); track r.value) {
          <line [attr.x1]="0" [attr.x2]="width" [attr.y1]="r.y" [attr.y2]="r.y" class="ref" />
          <text [attr.x]="width - 4" [attr.y]="r.y - 3" class="ref-label">{{ r.label }}</text>
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
    .line { fill: none; stroke: var(--ion-color-primary); stroke-width: 2.5; stroke-linejoin: round; }
    .dot { fill: var(--ion-color-primary); }
    .ref { stroke: var(--ion-color-medium); stroke-dasharray: 4 4; stroke-width: 1; opacity: 0.6; }
    .ref-label { fill: var(--ion-color-medium); font-size: 10px; text-anchor: end; }
    .axis { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--ion-color-medium); }
    .empty { color: var(--ion-color-medium); text-align: center; }
  `,
})
export class LineChartComponent {
  readonly points = input.required<ChartPoint[]>();
  readonly refs = input<{ value: number; label: string }[]>([]);
  readonly ariaLabel = input('Gráfico de tendencia');

  readonly width = WIDTH;
  readonly height = HEIGHT;

  readonly geo = computed(() =>
    chartGeometry(this.points(), WIDTH, HEIGHT, 16, this.refs().map((r) => r.value)),
  );
  readonly refLines = computed(() => this.refs().map((r) => ({ ...r, y: this.geo().yOf(r.value) })));
}
