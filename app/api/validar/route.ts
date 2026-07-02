import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { correo } = await req.json();
  if (!correo) return NextResponse.json({ error: "Correo requerido" }, { status: 400 });

  const votante = await buscarVotante(correo.trim());
  if (!votante) return NextResponse.json({ encontrado: false });

  const supabase = getSupabase();
  const { data } = await supabase.from("votos").select("id").eq("correo", votante.correo.toLowerCase()).maybeSingle();

  return NextResponse.json({ encontrado: true, votante, yaVoto: !!data });
}
