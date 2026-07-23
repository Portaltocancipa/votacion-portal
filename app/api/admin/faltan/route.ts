import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAllUnidades } from "@/lib/sheet";

const ADMIN_KEY = process.env.ADMIN_KEY || "portal2026";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
