import { NextRequest, NextResponse } from "next/server";
import { listarTodosParqueaderos } from "@/lib/parqueaderos";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const eliminados = req.nextUrl.searchParams.get("eliminados") === "true";
  const data = await listarTodosParqueaderos(eliminados);
  return NextResponse.json(data);
}
