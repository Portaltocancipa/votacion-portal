import { NextRequest, NextResponse } from "next/server";
import { listarTodasMascotas } from "@/lib/mascotas";

const ADMIN_KEY = process.env.ADMIN_KEY || "portal2026";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const eliminados = req.nextUrl.searchParams.get("eliminados") === "true";
  const data = await listarTodasMascotas(eliminados);
  return NextResponse.json(data);
}
