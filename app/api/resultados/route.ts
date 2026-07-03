import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ADMIN_KEY = process.env.ADMIN_KEY || "portal2026";
const BASE_TOTAL = 80;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = getSupabase();
  const { data: encuestas } = await supabase
    .from("encuestas")
    .select("*")
    .order("created_at", { ascending: true });

  const result = [];
  for (const enc of encuestas ?? []) {
    const { data: respuestas } = await supabase
      .from("respuestas_encuesta")
      .select("*")
      .eq("encuesta_id", enc.id)
      .order("created_at", { ascending: false });

    const conteo: Record<string, { votos: number }> = {};
    for (const op of enc.opciones) conteo[op] = { votos: 0 };

    let totalCuotasVotadas = 0;
    for (const r of respuestas ?? []) {
      const peso = r.cantidad || 1;
      totalCuotasVotadas += peso;
      for (const op of r.opciones_elegidas ?? []) {
        if (!conteo[op]) conteo[op] = { votos: 0 };
        conteo[op].votos += peso;
      }
    }

    result.push({
      id: enc.id,
      pregunta: enc.pregunta,
      tipo: enc.tipo,
      activa: enc.activa,
      personasHanVotado: (respuestas ?? []).length,
      hanRespondido: totalCuotasVotadas,
      faltan: BASE_TOTAL - (respuestas ?? []).length,
      totalVotantes: BASE_TOTAL,
      conteo,
      detalle: respuestas ?? [],
    });
  }

  return NextResponse.json(result);
}
