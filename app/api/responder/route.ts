import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { buscarVotante } from "@/lib/sheet";

export async function POST(req: NextRequest) {
  const { correo, encuesta_id, opciones_elegidas } = await req.json();

  if (!correo || !encuesta_id || !opciones_elegidas?.length) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const votante = await buscarVotante(correo.toLowerCase());
  if (!votante) return NextResponse.json({ error: "Correo no registrado" }, { status: 403 });

  const supabase = getSupabase();

  const { data: enc } = await supabase
    .from("encuestas")
    .select("id")
    .eq("id", encuesta_id)
    .eq("activa", true)
    .maybeSingle();

  if (!enc) return NextResponse.json({ error: "Encuesta no disponible" }, { status: 404 });

  const { error } = await supabase.from("respuestas_encuesta").insert({
    encuesta_id,
    correo: correo.toLowerCase(),
    opciones_elegidas,
    cantidad: votante.cantidad,
    nombre: votante.nombre,
    unidad: JSON.stringify(votante.detalles),
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Ya respondiste esta encuesta" }, { status: 409 });
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
