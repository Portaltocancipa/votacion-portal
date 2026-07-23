import { NextRequest, NextResponse } from "next/server";
import { actualizarRegistro, validarRegistro } from "@/lib/registros";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const body = await req.json();
  const errorValidacion = validarRegistro(body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  try {
    const data = await actualizarRegistro("residentes", id, body.correo, body);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al guardar" }, { status: 500 });
  }
}
