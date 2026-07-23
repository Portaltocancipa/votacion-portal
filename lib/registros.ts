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
  numero_matricula?: string;
  direccion?: string;
  ciudad?: string;
  correo_contacto?: string;
  es_contacto_principal?: boolean;
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

async function desmarcarOtrosContactos(tabla: TablaRegistro, correo: string, excluirId?: string) {
  const supabase = getSupabase();
  let query = supabase.from(tabla).update({ es_contacto_principal: false }).eq("correo", correo.toLowerCase());
  if (excluirId) query = query.neq("id", excluirId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function crearRegistro(tabla: TablaRegistro, input: RegistroInput) {
  const supabase = getSupabase();
  if (input.es_contacto_principal) await desmarcarOtrosContactos(tabla, input.correo);

  const { data, error } = await supabase
    .from(tabla)
    .insert({ ...input, correo: input.correo.toLowerCase() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarRegistro(tabla: TablaRegistro, id: string, correo: string, input: Partial<RegistroInput>) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from(tabla).select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para editar este registro");

  if (input.es_contacto_principal) await desmarcarOtrosContactos(tabla, correo, id);

  const { correo: correoInput, ...campos } = input;
  void correoInput;
  const { data, error } = await supabase.from(tabla).update(campos).eq("id", id).select().single();
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
