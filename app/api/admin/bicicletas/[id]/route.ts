import { NextRequest, NextResponse } from "next/server";
import { restaurarBicicleta } from "@/lib/bicicletas";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const { id } = await props.params;
  try {
    await restaurarBicicleta(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al restaurar" }, { status: 500 });
  }
}
