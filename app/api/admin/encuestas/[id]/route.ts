import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";
import { validarEncuestaParcial } from "@/lib/encuestas";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const { id } = await props.params;
  const body = await req.json();
  const errorValidacion = validarEncuestaParcial(body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase.from("encuestas").update(body).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const { id } = await props.params;
  const supabase = getSupabase();
  const { error } = await supabase.from("encuestas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
