import { getSupabase } from "@/lib/supabase";

export interface BicicletaInput {
  correo: string;
  unidad: string;
  color: string;
  marca: string;
  en_bicicletero: string;
  numero_asignado?: string;
}

export function validarBicicleta(body: Partial<BicicletaInput>): string | null {
  if (!body.correo) return "Falta el correo";
  if (!body.unidad) return "Selecciona la unidad";
  if (!body.color) return "Falta el color";
  if (!body.marca) return "Falta la marca";
  if (!body.en_bicicletero) return "Indica si está en el bicicletero";
  if (body.en_bicicletero === "Sí") {
    if (!body.numero_asignado) return "Falta el número asignado por el administrador";
    if (!/^\d+$/.test(body.numero_asignado)) return "El número asignado solo puede tener dígitos";
  }
  return null;
}

export async function listarBicicletasPorCorreo(correo: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bicicletas")
    .select("*")
    .eq("correo", correo.toLowerCase())
    .eq("eliminado", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearBicicleta(input: BicicletaInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bicicletas")
    .insert({ ...input, correo: input.correo.toLowerCase() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarBicicleta(id: string, correo: string, input: Partial<BicicletaInput>) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from("bicicletas").select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para editar este registro");

  const { correo: correoInput, ...campos } = input;
  void correoInput;
  const { data, error } = await supabase.from("bicicletas").update(campos).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function borrarBicicleta(id: string, correo: string) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from("bicicletas").select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para borrar este registro");

  const { error } = await supabase.from("bicicletas").update({ eliminado: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restaurarBicicleta(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("bicicletas").update({ eliminado: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarTodasBicicletas(eliminados = false) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bicicletas")
    .select("*")
    .eq("eliminado", eliminados)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
