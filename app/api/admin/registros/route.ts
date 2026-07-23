import { NextRequest, NextResponse } from "next/server";
import { listarTodos, TablaRegistro } from "@/lib/registros";

const ADMIN_KEY = process.env.ADMIN_KEY || "portal2026";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tabla = req.nextUrl.searchParams.get("tabla") as TablaRegistro | null;
  if (tabla !== "residentes" && tabla !== "propietarios") {
    return NextResponse.json({ error: "Parámetro 'tabla' inválido" }, { status: 400 });
  }

  const eliminados = req.nextUrl.searchParams.get("eliminados") === "true";
  const data = await listarTodos(tabla, eliminados);
  return NextResponse.json(data);
}
