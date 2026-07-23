import { getSupabase } from "@/lib/supabase";

export interface ParqueaderoInput {
  correo: string;
  unidad: string;
  numero_parqueadero: string;
  nombres: string;
  apellidos: string;
  placa: string;
  marca: string;
  modelo: string;
  tipo_vehiculo: string;
}

export function validarParqueadero(body: Partial<ParqueaderoInput>): string | null {
  if (!body.correo) return "Falta el correo";
  if (!body.unidad) return "Selecciona la unidad";
  if (!body.numero_parqueadero) return "Falta el número de parqueadero";
  if (!body.nombres) return "Faltan los nombres";
  if (!body.apellidos) return "Faltan los apellidos";
  if (!body.placa) return "Falta la placa";
  if (!body.marca) return "Falta la marca";
  if (!body.modelo) return "Falta el modelo";
  if (!body.tipo_vehiculo) return "Selecciona si es carro o moto";
  return null;
}

export async function listarParqueaderosPorCorreo(correo: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("parqueaderos")
    .select("*")
    .eq("correo", correo.toLowerCase())
    .eq("eliminado", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearParqueadero(input: ParqueaderoInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("parqueaderos")
    .insert({ ...input, correo: input.correo.toLowerCase() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarParqueadero(id: string, correo: string, input: Partial<ParqueaderoInput>) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from("parqueaderos").select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para editar este registro");

  const { correo: correoInput, ...campos } = input;
  void correoInput;
  const { data, error } = await supabase.from("parqueaderos").update(campos).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function borrarParqueadero(id: string, correo: string) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from("parqueaderos").select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para borrar este registro");

  // Borrado suave: nunca se elimina de la base, el admin conserva el histórico.
  const { error } = await supabase.from("parqueaderos").update({ eliminado: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restaurarParqueadero(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("parqueaderos").update({ eliminado: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarTodosParqueaderos(eliminados = false) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("parqueaderos")
    .select("*")
    .eq("eliminado", eliminados)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
