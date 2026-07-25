import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAllUnidades } from "@/lib/sheet";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const supabase = getSupabase();
  const [unidades, { data: encuestas }] = await Promise.all([
    getAllUnidades(),
    supabase.from("encuestas").select("*").order("created_at", { ascending: true }),
  ]);
  const totalUnidades = unidades.length;

  const result = [];
  for (const enc of encuestas ?? []) {
    const { data: respuestas } = await supabase
      .from("respuestas_encuesta")
      .select("*")
      .eq("encuesta_id", enc.id)
      .order("created_at", { ascending: false });

    // Una encuesta con `opciones` mal formada no debe tumbar el cálculo de
    // las demás: se trata como sin opciones en vez de lanzar.
    const opcionesValidas = Array.isArray(enc.opciones) ? enc.opciones : [];

    const conteo: Record<string, { votos: number }> = {};
    for (const op of opcionesValidas) conteo[op] = { votos: 0 };

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
      faltan: totalUnidades - totalCuotasVotadas,
      totalVotantes: totalUnidades,
      conteo,
      detalle: respuestas ?? [],
    });
  }

  return NextResponse.json(result);
}
