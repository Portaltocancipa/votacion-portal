import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";

export async function POST(req: NextRequest) {
  const { correo, token } = await req.json();
  if (!correo) return NextResponse.json({ error: "Correo requerido" }, { status: 400 });

  try {
    const votante = await buscarVotante(correo.trim().toLowerCase());
    if (!votante) return NextResponse.json({ encontrado: false });

    if (!votante.habilitado) {
      return NextResponse.json({ encontrado: true, habilitado: false });
    }

    if (votante.token && token?.trim().toLowerCase() !== votante.token.toLowerCase()) {
      return NextResponse.json({ encontrado: true, habilitado: true, tokenValido: false });
    }

    return NextResponse.json({ encontrado: true, habilitado: true, tokenValido: true, votante });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
