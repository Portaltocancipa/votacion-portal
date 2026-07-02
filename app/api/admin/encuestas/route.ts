import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const ADMIN_KEY = process.env.ADMIN_KEY || "portal2026";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = getSupabase();
  const { data } = await supabase.from("encuestas").select("*").order("created_at", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { pregunta, opciones, tipo, activa } = await req.json();
  if (!pregunta || !opciones?.length) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("encuestas")
    .insert({ pregunta, opciones, tipo: tipo || "unica", activa: activa ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
