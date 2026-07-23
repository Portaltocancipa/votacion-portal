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
  unidad?: string;
}

export function validarRegistro(tabla: TablaRegistro, body: Partial<RegistroInput>): string | null {
  if (!body.correo) return "Falta el correo";
  if (!body.unidad) return "Selecciona la unidad";
  if (!body.tipo_documento) return "Selecciona el tipo de documento";
  if (!body.numero_documento) return "Falta el número de documento";
  if (!body.nombres) return "Faltan los nombres";
  if (!body.apellidos) return "Faltan los apellidos";
  if (!body.telefono) return "Falta el teléfono";
  if (!body.fecha_nacimiento) return "Falta la fecha de nacimiento";
  if (!body.correo_contacto) return "Falta el correo electrónico";
  if (tabla === "propietarios") {
    if (!body.numero_matricula) return "Falta el número de matrícula inmobiliaria";
    if (!body.direccion) return "Falta la dirección";
    if (!body.ciudad) return "Falta la ciudad";
  }
  return null;
}

export async function listarPorCorreo(tabla: TablaRegistro, correo: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(tabla)
    .select("*")
    .eq("correo", correo.toLowerCase())
    .eq("eliminado", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function verificarContactoUnico(tabla: TablaRegistro, correo: string, excluirId?: string) {
  const supabase = getSupabase();
  let query = supabase.from(tabla).select("id").eq("correo", correo.toLowerCase()).eq("es_contacto_principal", true);
  if (excluirId) query = query.neq("id", excluirId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data && data.length > 0) throw new Error("Ya hay un titular de comunicaciones seleccionado. Desmárcalo antes de elegir otro.");
}

export async function crearRegistro(tabla: TablaRegistro, input: RegistroInput) {
  const supabase = getSupabase();
  if (input.es_contacto_principal) await verificarContactoUnico(tabla, input.correo);

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

  if (input.es_contacto_principal) await verificarContactoUnico(tabla, correo, id);

  const { correo: correoInput, ...campos } = input;
  void correoInput;
  const { data, error } = await supabase.from(tabla).update(campos).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function borrarRegistro(tabla: TablaRegistro, id: string, correo: string) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from(tabla).select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para borrar este registro");

  // Borrado suave: nunca se elimina de la base, solo se oculta. El admin
  // conserva el histórico completo en el reporte de "Eliminados".
  const { error } = await supabase.from(tabla).update({ eliminado: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarTodos(tabla: TablaRegistro, eliminados = false) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(tabla)
    .select("*")
    .eq("eliminado", eliminados)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
