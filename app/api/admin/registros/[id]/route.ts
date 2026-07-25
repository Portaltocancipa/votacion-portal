import { NextRequest, NextResponse } from "next/server";
import { restaurarRegistro, TablaRegistro } from "@/lib/registros";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const { id } = await props.params;
  const body = await req.json();
  const tabla = body.tabla as TablaRegistro;
  if (tabla !== "residentes" && tabla !== "propietarios") {
    return NextResponse.json({ error: "Parámetro 'tabla' inválido" }, { status: 400 });
  }

  try {
    await restaurarRegistro(tabla, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al restaurar" }, { status: 500 });
  }
}
