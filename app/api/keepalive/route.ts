import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Supabase pausa los proyectos del plan gratuito tras ~7 dias sin actividad
// en la API. Este endpoint no hace nada util por si mismo: existe solo para
// que el cron de Vercel (ver vercel.json) le pegue una vez al dia y la base
// de datos nunca llegue a esos 7 dias sin uso, aunque el portal este quieto
// semanas seguidas (ej. entre asambleas).
export async function GET() {
  const supabase = getSupabase();
  const { error } = await supabase.from("residentes").select("id").limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checked_at: new Date().toISOString() });
}
