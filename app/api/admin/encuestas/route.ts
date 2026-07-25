import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";
import { validarEncuestaNueva } from "@/lib/encuestas";

export async function GET(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const supabase = getSupabase();
  const { data } = await supabase.from("encuestas").select("*").order("created_at", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const body = await req.json();
  const { pregunta, opciones, tipo, activa } = body;
  const errorValidacion = validarEncuestaNueva(body);
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("encuestas")
    .insert({ pregunta, opciones, tipo: tipo || "unica", activa: activa ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
