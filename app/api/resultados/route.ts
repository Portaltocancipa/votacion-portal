import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ADMIN_KEY = process.env.ADMIN_KEY || "portal2026";
const BASE_TOTAL = 80;

const OPCIONES = [
  "Presencial 12 de Julio 8 am",
  "Presencial 19 de Julio 8 am",
  "Virtual 10 de Julio 7 pm",
  "Virtual 15 de Julio 7 pm",
];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = getSupabase();
  const { data: votos } = await supabase.from("votos").select("*").order("created_at", { ascending: false });

  const conteo: Record<string, { votos: number; cantidad: number }> = {};
  for (const op of OPCIONES) conteo[op] = { votos: 0, cantidad: 0 };

  for (const v of votos ?? []) {
    if (conteo[v.opcion]) {
      conteo[v.opcion].votos++;
      conteo[v.opcion].cantidad += v.cantidad || 1;
    }
  }

  return NextResponse.json({
    totalVotantes: BASE_TOTAL,
    hanVotado: (votos ?? []).length,
    faltan: BASE_TOTAL - (votos ?? []).length,
    conteo,
    detalle: votos,
  });
}
