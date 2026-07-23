import { NextRequest, NextResponse } from "next/server";
import { restaurarParqueadero } from "@/lib/parqueaderos";

const ADMIN_KEY = process.env.ADMIN_KEY || "portal2026";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await props.params;
  try {
    await restaurarParqueadero(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al restaurar" }, { status: 500 });
  }
}
