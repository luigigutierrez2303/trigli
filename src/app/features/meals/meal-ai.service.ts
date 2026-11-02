import { inject, Injectable } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Supabase } from '../../core/supabase';
import { Food } from '../energy/foods';
import { ProposedItem, resolveAnalysis } from '../energy/meal-analysis';

const MAX_SIDE = 1024;

/** Achica la foto a JPEG de hasta 1024 px y la devuelve en base64 (sin el prefijo data:). */
async function toJpegBase64(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

const MESSAGES: Record<string, string> = {
  limit: 'Llegaste al límite de análisis de hoy. Mañana podés usarlo de nuevo.',
  not_configured: 'El análisis con IA todavía no está disponible.',
  image: 'No pudimos usar esa foto. Probá con otra.',
  upstream: 'El servicio de IA no respondió. Probá de nuevo en un rato.',
  upstream_busy: 'El servicio de IA está saturado. Probá de nuevo en un minuto.',
};

/** Error con un mensaje listo para mostrar. */
export class MealAiError extends Error {}

@Injectable({ providedIn: 'root' })
export class MealAiService {
  private readonly db = inject(Supabase).client;

  /** Interpreta texto y/o foto y devuelve ítems del catálogo (o estimados) para que el usuario confirme. */
  async analyze(input: { text: string; image: File | null }, catalog: Food[]): Promise<ProposedItem[]> {
    let image: string | undefined;
    if (input.image) {
      try {
        image = await toJpegBase64(input.image);
      } catch {
        throw new MealAiError(MESSAGES['image']);
      }
    }
    const body = { text: input.text.trim() || undefined, image, catalog: catalog.map((f) => f.name) };
    const { data, error } = await this.db.functions.invoke('analizar-comida', { body });
    if (error) {
      let code = '';
      if (error instanceof FunctionsHttpError) code = (await error.context.json().catch(() => null))?.error ?? '';
      throw new MealAiError(MESSAGES[code] ?? 'No pudimos analizar la comida. Probá de nuevo.');
    }
    return resolveAnalysis(data, catalog);
  }
}
