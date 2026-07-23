import { NextRequest, NextResponse } from "next/server";
import { actualizarRegistro, borrarRegistro, validarRegistro } from "@/lib/registros";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const body = await req.json();
  const errorValidacion = validarRegistro("residentes", body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  try {
    const data = await actualizarRegistro("residentes", id, body.correo, body);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al guardar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const body = await req.json();
  if (!body.correo) return NextResponse.json({ error: "Falta el correo" }, { status: 400 });

  try {
    await borrarRegistro("residentes", id, body.correo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al borrar" }, { status: 500 });
  }
}
