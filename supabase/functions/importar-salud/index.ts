// Edge Function: recibe entrenos y peso desde un Atajo de iOS (Apple Salud) y los guarda para el dueño del token.
// Se despliega con --no-verify-jwt: la autenticación es el token personal (header x-trigli-token), que se compara por hash.
// Body: { workouts?: [{ id, date, minutes, kcal?, activity? }], weight?: { date, kg } }
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_WORKOUTS = 50;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN);

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
    const minutes = Math.round(num(w?.minutes));
    const kcal = Math.round(num(w?.kcal));
    if (!isDate(w?.date) || !(minutes > 0 && minutes < 1000) || typeof w?.id !== 'string' || !w.id) return [];
    return [{
      user_id: userId, date: w.date, type: 'cardio', duration_min: minutes,
      kcal: kcal >= 0 && kcal <= 5000 ? kcal : null,
      activity: typeof w.activity === 'string' ? w.activity.slice(0, 60) : null,
      source: 'health', external_id: w.id.slice(0, 100),
    }];
  });

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

  return json({ imported, weight });
});
