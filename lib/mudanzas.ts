import { getSupabase } from "@/lib/supabase";
import { verificarToken } from "@/lib/sheet";

export interface MudanzaInput {
  correo: string;
  unidad: string;
  tipo_formato: "A" | "B";
  tipo_movimiento: "ingreso" | "salida";
  es_propietario: boolean;
  fecha_mudanza: string;
}

export function validarMudanza(body: Partial<MudanzaInput>): string | null {
  if (!body.correo) return "Falta el correo";
  if (!body.unidad) return "Selecciona la unidad";
  if (!body.tipo_formato || !["A", "B"].includes(body.tipo_formato)) return "Selecciona el tipo de formato";
  if (!body.tipo_movimiento || !["ingreso", "salida"].includes(body.tipo_movimiento)) return "Selecciona el tipo de movimiento";
  if (body.es_propietario === undefined || body.es_propietario === null) return "Indica si eres el propietario";
  if (!body.fecha_mudanza) return "Falta la fecha de la mudanza";
  return null;
}

export async function listarMudanzasPorCorreo(correo: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mudanzas")
    .select("*")
    .eq("correo", correo.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearMudanza(input: MudanzaInput, token: string | undefined) {
  if (!(await verificarToken(input.correo, token))) throw new Error("Token incorrecto");

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mudanzas")
    .insert({
      correo: input.correo.toLowerCase(),
      unidad: input.unidad,
      tipo_formato: input.tipo_formato,
      tipo_movimiento: input.tipo_movimiento,
      es_propietario: input.es_propietario,
      fecha_mudanza: input.fecha_mudanza,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
