import { NextRequest, NextResponse } from "next/server";
import { restaurarMascota } from "@/lib/mascotas";
import { verificarAdmin, respuestaNoAutorizado, respuestaMalConfigurado } from "@/lib/adminAuth";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    if (!verificarAdmin(req)) return respuestaNoAutorizado();
  } catch {
    return respuestaMalConfigurado();
  }

  const { id } = await props.params;
  try {
    await restaurarMascota(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al restaurar" }, { status: 500 });
  }
}
