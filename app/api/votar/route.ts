import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { correo, opcion } = await req.json();
  if (!correo || !opcion) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const votante = await buscarVotante(correo.trim());
  if (!votante) return NextResponse.json({ error: "Correo no válido" }, { status: 403 });

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("votos").select("id").eq("correo", votante.correo.toLowerCase()).maybeSingle();
  if (existing) return NextResponse.json({ error: "Ya votaste" }, { status: 409 });

  const { error } = await supabase.from("votos").insert({
    correo: votante.correo.toLowerCase(),
    opcion,
    cantidad: votante.cantidad,
    nombre: votante.nombre,
    unidad: JSON.stringify(votante.unidades),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
