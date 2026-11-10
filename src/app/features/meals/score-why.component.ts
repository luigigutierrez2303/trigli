import { Component, input } from '@angular/core';
import { ScoreBreakdown } from './meal-scoring';

/** "¿Por qué?" del score de una comida: base, lo que suma (verde), lo que resta (rojo) y la meta. */
@Component({
  selector: 'app-score-why',
  template: `
    <div class="chips">
      <span class="chip base">Base {{ why().base }}</span>
      @for (r of why().plus; track r.key) { <span class="chip plus">+{{ r.weight }} {{ r.label }}</span> }
      @for (r of why().minus; track r.key) { <span class="chip minus">−{{ -r.weight }} {{ r.label }}</span> }
    </div>
    <p class="note">
      @if (!why().plus.length && !why().minus.length) {
        Sumá alimentos para ver qué suma y qué resta.
      } @else if (why().clamped === 'max') {
        La suma pasa de 10 y queda en el tope.
      } @else if (why().clamped === 'min') {
        La suma baja de 0 y queda en el mínimo.
      }
      Meta: {{ goal() }} o más.
      @if (why().score < goal() && why().minus.length) { Lo que más resta: {{ why().minus[0].label.toLowerCase() }}. }
    </p>
  `,
  styles: `
    :host { display: block; padding: 4px 16px 10px; text-align: left; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { padding: 4px 10px; border-radius: 999px; font-size: 0.8125rem; font-weight: 600; font-variant-numeric: tabular-nums; }
    .base { background: var(--trigli-surface-2); color: var(--ion-color-medium); }
    .plus { background: var(--trigli-ok-soft); color: var(--trigli-ok-text); }
    .minus { background: var(--trigli-bad-soft); color: var(--trigli-bad-text); }
    .note { margin: 8px 0 0; font-size: 0.8125rem; line-height: 1.4; color: var(--ion-color-medium); }
  `,
})
export class ScoreWhyComponent {
  readonly why = input.required<ScoreBreakdown>();
  readonly goal = input.required<number>();
}
