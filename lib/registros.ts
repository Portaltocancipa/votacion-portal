import { getSupabase } from "@/lib/supabase";

export type TablaRegistro = "residentes" | "propietarios";

export interface RegistroInput {
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  fecha_nacimiento: string;
}

export function validarRegistro(body: Partial<RegistroInput>): string | null {
  if (!body.correo) return "Falta el correo";
  if (!body.tipo_documento) return "Selecciona el tipo de documento";
  if (!body.numero_documento) return "Falta el número de documento";
  if (!body.nombres) return "Faltan los nombres";
  if (!body.apellidos) return "Faltan los apellidos";
  if (!body.fecha_nacimiento) return "Falta la fecha de nacimiento";
  return null;
}

export async function listarPorCorreo(tabla: TablaRegistro, correo: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(tabla)
    .select("*")
    .eq("correo", correo.toLowerCase())
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearRegistro(tabla: TablaRegistro, input: RegistroInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(tabla)
    .insert({ ...input, correo: input.correo.toLowerCase() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listarTodos(tabla: TablaRegistro) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(tabla)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
