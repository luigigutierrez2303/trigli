import { MealItem } from './energy';
import { Food } from './foods';

/** Un alimento propuesto por la IA, ya validado y listo para que el usuario lo confirme. */
export interface ProposedItem {
  item: MealItem;
  /** true cuando no está en el catálogo y las kcal son una estimación de la IA. */
  estimated: boolean;
  /** La IA no estaba segura de este alimento. */
  uncertain: boolean;
  /** Porción de referencia, útil para guardarlo después en "Mis alimentos". */
  portion?: string;
}

const MAX_ITEMS = 20;
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Cantidad de porciones: múltiplo de 0,25 entre 0,25 y 20. */
export const clampQty = (qty: number): number => Math.min(20, Math.max(0.25, Math.round(qty * 4) / 4));

/**
 * Convierte la respuesta de la IA en ítems confiables. Las kcal de lo que está en el catálogo salen del catálogo,
 * nunca de la IA; solo lo que no existe usa su estimación (acotada) y queda marcado como estimado.
 */
export function resolveAnalysis(raw: unknown, catalog: Food[]): ProposedItem[] {
  const list = isRecord(raw) && Array.isArray(raw['items']) ? raw['items'].slice(0, MAX_ITEMS) : [];
  const byName = new Map(catalog.map((f) => [f.name, f]));
  const byNormal = new Map(catalog.map((f) => [normalize(f.name), f]));
  const out: ProposedItem[] = [];

  for (const entry of list) {
    if (!isRecord(entry) || typeof entry['name'] !== 'string' || !finite(entry['qty'])) continue;
    const name = entry['name'].trim().slice(0, 80);
    if (!name) continue;
    const qty = clampQty(entry['qty']);
    const uncertain = entry['uncertain'] === true;

    const food = byName.get(name) ?? byNormal.get(normalize(name));
    if (food) {
      out.push({
        item: { name: food.name, kcal: food.kcal, protein: food.protein, ...(food.grams ? { refGrams: food.grams } : {}), qty },
        estimated: false, uncertain, portion: food.portion,
      });
      continue;
    }

    const kcal = entry['kcal'];
    if (!finite(kcal) || kcal < 0 || kcal > 3000) continue;
    const protein = entry['protein'];
    out.push({
      item: { name, kcal: Math.round(kcal), ...(finite(protein) && protein >= 0 && protein <= 300 ? { protein: Math.round(protein * 10) / 10 } : {}), qty },
      estimated: true, uncertain,
      ...(typeof entry['portion'] === 'string' ? { portion: entry['portion'].trim().slice(0, 60) } : {}),
    });
  }
  return out;
}
