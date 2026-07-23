import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";

export async function POST(req: NextRequest) {
  const { correo, token } = await req.json();
  if (!correo) return NextResponse.json({ error: "Correo requerido" }, { status: 400 });

  try {
    const votante = await buscarVotante(correo.trim().toLowerCase());
    if (!votante) return NextResponse.json({ encontrado: false });

    if (votante.token && token?.trim().toLowerCase() !== votante.token.toLowerCase()) {
      return NextResponse.json({ encontrado: true, tokenValido: false });
    }

    // habilitado=false solo restringe el módulo de Votaciones, no el acceso
    // al sistema ni a los demás módulos (residentes, propietarios, parqueadero).
    return NextResponse.json({ encontrado: true, tokenValido: true, votante, puedeVotar: votante.habilitado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
