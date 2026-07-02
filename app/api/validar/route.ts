import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";

export async function POST(req: NextRequest) {
  const { correo } = await req.json();
  if (!correo) return NextResponse.json({ error: "Correo requerido" }, { status: 400 });

  try {
    const votante = await buscarVotante(correo.trim().toLowerCase());
    if (!votante) return NextResponse.json({ encontrado: false });
    return NextResponse.json({ encontrado: true, votante });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
