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

  const encuesta_id = req.nextUrl.searchParams.get("encuesta_id");
  if (!encuesta_id) return NextResponse.json({ error: "Falta encuesta_id" }, { status: 400 });

  const [todasUnidades, supabase] = [await getAllUnidades(), getSupabase()];

  const { data: respuestas } = await supabase
    .from("respuestas_encuesta")
    .select("unidad")
    .eq("encuesta_id", encuesta_id);

  const votadas = new Set<string>();
  for (const r of respuestas ?? []) {
    try {
      const parsed = JSON.parse(r.unidad);
      if (Array.isArray(parsed)) {
        parsed.forEach((d: any) => { if (d.unidad) votadas.add(String(d.unidad)); });
      } else {
        if (r.unidad) votadas.add(String(r.unidad));
      }
    } catch {
      if (r.unidad) votadas.add(String(r.unidad));
    }
  }

  const faltan = todasUnidades.filter(u => !votadas.has(u));
  return NextResponse.json({ faltan, total: faltan.length });
}
