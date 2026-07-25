import { NextRequest, NextResponse } from "next/server";
import { listarTodos, TablaRegistro } from "@/lib/registros";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const tabla = req.nextUrl.searchParams.get("tabla") as TablaRegistro | null;
  if (tabla !== "residentes" && tabla !== "propietarios") {
    return NextResponse.json({ error: "Parámetro 'tabla' inválido" }, { status: 400 });
  }

  const eliminados = req.nextUrl.searchParams.get("eliminados") === "true";
  const data = await listarTodos(tabla, eliminados);
  return NextResponse.json(data);
}
