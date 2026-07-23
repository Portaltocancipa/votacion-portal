import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";
import { crearParqueadero, listarParqueaderosPorCorreo, validarParqueadero } from "@/lib/parqueaderos";

export async function GET(req: NextRequest) {
  const correo = req.nextUrl.searchParams.get("correo");
  if (!correo) return NextResponse.json({ error: "Falta el correo" }, { status: 400 });
  try {
    const data = await listarParqueaderosPorCorreo(correo);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al cargar" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const errorValidacion = validarParqueadero(body);
  if (errorValidacion) return NextResponse.json({ error: errorValidacion }, { status: 400 });

  const votante = await buscarVotante(String(body.correo).toLowerCase());
  if (!votante) return NextResponse.json({ error: "Correo no registrado" }, { status: 403 });

  try {
    const data = await crearParqueadero(body);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al guardar" }, { status: 500 });
  }
}
