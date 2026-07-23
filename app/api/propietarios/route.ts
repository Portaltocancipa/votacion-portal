import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";
import { crearRegistro, listarPorCorreo, validarRegistro } from "@/lib/registros";

export async function GET(req: NextRequest) {
  const correo = req.nextUrl.searchParams.get("correo");
  if (!correo) return NextResponse.json({ error: "Falta el correo" }, { status: 400 });
  const data = await listarPorCorreo("propietarios", correo);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const errorValidacion = validarRegistro(body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  const votante = await buscarVotante(String(body.correo).toLowerCase());
  if (!votante) return NextResponse.json({ error: "Correo no registrado" }, { status: 403 });

  try {
    const data = await crearRegistro("propietarios", body);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al guardar" }, { status: 500 });
  }
}
