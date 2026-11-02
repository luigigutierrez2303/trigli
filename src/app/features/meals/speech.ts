import { Injectable, signal } from '@angular/core';

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

const Ctor = (): (new () => Recognition) | undefined => {
  const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/** Dictado por voz con el reconocimiento del navegador (gratis, sin servidor). */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  readonly supported = !!Ctor();
  readonly listening = signal(false);
  private current: Recognition | null = null;

  /** Empieza a escuchar; `onDone` recibe lo dicho cuando termina (vacío si no se entendió nada). */
  start(onDone: (text: string, error?: string) => void): void {
    const R = Ctor();
    if (!R || this.listening()) return;
    const rec = new R();
    rec.lang = 'es-AR';
    rec.interimResults = false;
    rec.continuous = false;
    let text = '';
    let error: string | undefined;
    rec.onresult = (e) => {
      text = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
    };
    rec.onerror = (e) => { error = e.error; };
    rec.onend = () => {
      this.listening.set(false);
      this.current = null;
      onDone(text, error);
    };
    this.current = rec;
    this.listening.set(true);
    try {
      rec.start();
    } catch {
      this.listening.set(false);
      this.current = null;
    }
  }

  stop(): void {
    this.current?.stop();
  }
}
