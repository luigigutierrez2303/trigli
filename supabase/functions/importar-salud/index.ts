// Edge Function: recibe entrenos y peso desde un Atajo de iOS (Apple Salud) y los guarda para el dueño del token.
// Se despliega con --no-verify-jwt: la autenticación es el token personal (header x-trigli-token), que se compara por hash.
// Body: { workouts?: [{ id, date, minutes, kcal?, activity? }], days?: [{ date, kcal }], weight?: { date, kg } }
// days: total diario de energía activa; una fila por día (se actualiza al reenviar) y sin duración.
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_WORKOUTS = 50;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
// Atajos manda las medidas como texto con unidad ("1 min", "3 kcal", "70,5 kg"): se toma el número.
const num = (v: unknown) => {
  if (typeof v === 'number') return v;
  const m = typeof v === 'string' ? v.match(/-?\d+(?:[.,]\d+)?/) : null;
  return m ? Number(m[0].replace(',', '.')) : NaN;
};

/** Duración en minutos: número a secas (minutos) o texto con unidad ("1 h 5 min", "90 seg"). */
const minutesOf = (v: unknown) => {
  if (typeof v !== 'string') return num(v);
  const parts = [...v.matchAll(/(\d+(?:[.,]\d+)?)\s*(h|hr|hora|min|m|seg|s)/gi)];
  if (!parts.length) return num(v);
  return parts.reduce((t, [, n, u]) => {
    const x = Number(n.replace(',', '.'));
    const unit = u.toLowerCase();
    return t + (unit.startsWith('h') ? x * 60 : unit === 'seg' || unit === 's' ? x / 60 : x);
  }, 0);
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const token = req.headers.get('x-trigli-token');
  if (!token || token.length < 32) return json({ error: 'unauthorized' }, 401);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: row, error: tokenError } = await db.from('health_token').select('user_id').eq('token_hash', await sha256(token)).maybeSingle();
  if (tokenError) {
    console.error('health_token', tokenError.message);
    return json({ error: 'db' }, 500);
  }
  if (!row) return json({ error: 'unauthorized' }, 401);
  const userId = row.user_id as string;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const workouts = (Array.isArray(body.workouts) ? body.workouts : []).slice(0, MAX_WORKOUTS).flatMap((w: any) => {
    const minutes = Math.max(1, Math.round(minutesOf(w?.minutes)));
    const kcal = Math.round(num(w?.kcal));
    if (!isDate(w?.date) || !(minutes > 0 && minutes < 1000) || typeof w?.id !== 'string' || !w.id) return [];
    return [{
      user_id: userId, date: w.date, type: 'cardio', duration_min: minutes,
      kcal: kcal >= 0 && kcal <= 5000 ? kcal : null,
      activity: typeof w.activity === 'string' ? w.activity.slice(0, 60) : null,
      source: 'health', external_id: w.id.slice(0, 100),
    }];
  });

  const days = (Array.isArray(body.days) ? body.days : []).slice(0, MAX_WORKOUTS).flatMap((d: any) => {
    const kcal = Math.round(num(d?.kcal));
    if (!isDate(d?.date) || !(kcal >= 0 && kcal <= 5000)) return [];
    return [{
      user_id: userId, date: d.date, type: 'cardio', duration_min: 0, kcal,
      activity: null, source: 'health', external_id: `day-${d.date}`,
    }];
  });
  if (days.length) {
    // Los minutos de un día los carga el usuario a mano: si la fila ya existe solo se actualizan las kcal.
    const byId = new Map(days.map((d) => [d.external_id, d]));
    const { data: existing, error: lookupError } = await db.from('workout').select('external_id')
      .eq('user_id', userId).in('external_id', [...byId.keys()]);
    if (lookupError) {
      console.error('days lookup', lookupError.message);
      return json({ error: 'db' }, 500);
    }
    const have = new Set((existing ?? []).map((r) => r.external_id as string));
    const fresh = [...byId.values()].filter((d) => !have.has(d.external_id));
    if (fresh.length) {
      const { error } = await db.from('workout').insert(fresh);
      if (error) {
        console.error('days insert', error.message);
        return json({ error: 'db' }, 500);
      }
    }
    for (const d of byId.values()) {
      if (!have.has(d.external_id)) continue;
      const { error } = await db.from('workout').update({ kcal: d.kcal }).eq('user_id', userId).eq('external_id', d.external_id);
      if (error) {
        console.error('days update', error.message);
        return json({ error: 'db' }, 500);
      }
    }
  }

  let imported = 0;
  if (workouts.length) {
    // ignoreDuplicates: lo ya importado (o editado a mano después) no se pisa.
    const { data, error } = await db.from('workout')
      .upsert(workouts, { onConflict: 'user_id,external_id', ignoreDuplicates: true }).select('id');
    if (error) {
      console.error('db', error.message);
      return json({ error: 'db' }, 500);
    }
    imported = data?.length ?? 0;
  }

  let weight = false;
  const kg = num(body.weight?.kg);
  if (isDate(body.weight?.date) && kg >= 30 && kg <= 250) {
    const { error } = await db.from('body_metric')
      .upsert({ user_id: userId, date: body.weight.date, weight_kg: kg }, { onConflict: 'user_id,date' });
    if (error) {
      console.error('db', error.message);
      return json({ error: 'db' }, 500);
    }
    weight = true;
  }

  return json({ imported, days: days.length, weight });
});
