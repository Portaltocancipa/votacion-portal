import { NextRequest, NextResponse } from "next/server";
import { buscarVotante } from "@/lib/sheet";
import { getSupabase } from "@/lib/supabase";

// Un PIN de 4 dígitos es adivinable por fuerza bruta sin límite de intentos.
// Bloquea el correo 15 minutos después de 5 tokens incorrectos seguidos.
const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export async function POST(req: NextRequest) {
  const { correo, token } = await req.json();
  if (!correo) return NextResponse.json({ error: "Correo requerido" }, { status: 400 });

  const correoNorm = correo.trim().toLowerCase();
  const supabase = getSupabase();

  try {
    const { data: intento } = await supabase
      .from("intentos_login")
      .select("*")
      .eq("correo", correoNorm)
      .maybeSingle();

    if (intento?.bloqueado_hasta && new Date(intento.bloqueado_hasta) > new Date()) {
      return NextResponse.json(
        { error: "Demasiados intentos fallidos. Intenta de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const votante = await buscarVotante(correoNorm);
    if (!votante) return NextResponse.json({ encontrado: false });

    // Sin token configurado en el Sheet para esta persona = acceso denegado
    // (antes se dejaba pasar sin más, dejando la cuenta abierta a cualquiera
    // que supiera el correo).
    if (!votante.token || token?.trim().toLowerCase() !== votante.token.toLowerCase()) {
      const intentos = (intento?.intentos || 0) + 1;
      const bloqueado_hasta = intentos >= MAX_INTENTOS
        ? new Date(Date.now() + BLOQUEO_MINUTOS * 60000).toISOString()
        : null;
      await supabase.from("intentos_login").upsert({ correo: correoNorm, intentos, bloqueado_hasta });
      return NextResponse.json({ encontrado: true, tokenValido: false });
    }

    if (intento) await supabase.from("intentos_login").delete().eq("correo", correoNorm);

    // habilitado=false solo restringe el módulo de Votaciones, no el acceso
    // al sistema ni a los demás módulos (residentes, propietarios, parqueadero).
    return NextResponse.json({ encontrado: true, tokenValido: true, votante, puedeVotar: votante.habilitado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
