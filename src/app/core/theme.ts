import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'auto' | 'light' | 'dark';

const KEY = 'trigli-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Claro, oscuro o el del sistema. Ionic oscurece la app con la clase `ion-palette-dark` en <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.stored());
  private readonly media = window.matchMedia(DARK_QUERY);

  constructor() {
    this.apply();
    this.media.addEventListener('change', () => this.apply());
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    try { localStorage.setItem(KEY, mode); } catch { /* modo privado: queda solo en memoria */ }
    this.apply();
  }

  /** Oscuro si se eligió oscuro, o si es automático y el sistema está en oscuro. */
  isDark() {
    return this.mode() === 'dark' || (this.mode() === 'auto' && this.media.matches);
  }

  private apply() {
    document.documentElement.classList.toggle('ion-palette-dark', this.isDark());
  }

  private stored(): ThemeMode {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'auto';
    } catch {
      return 'auto';
    }
  }
}
