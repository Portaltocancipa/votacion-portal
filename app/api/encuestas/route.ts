import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const correo = req.nextUrl.searchParams.get("correo");
  const supabase = getSupabase();

  const { data: encuestas } = await supabase
    .from("encuestas")
    .select("*")
    .eq("activa", true)
    .order("created_at", { ascending: true });

  if (!encuestas) return NextResponse.json([]);

  let respondidas: string[] = [];
  if (correo) {
    const { data: resp } = await supabase
      .from("respuestas_encuesta")
      .select("encuesta_id")
      .eq("correo", correo.toLowerCase());
    respondidas = (resp ?? []).map((r: any) => r.encuesta_id);
  }

  const result = encuestas.map((e: any) => ({
    ...e,
    yaRespondio: respondidas.includes(e.id),
  }));

  return NextResponse.json(result);
}
