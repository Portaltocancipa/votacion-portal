import { getSupabase } from "@/lib/supabase";
import { TIPOS_DOCUMENTO_SIN_CORREO } from "@/lib/edad";

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
  inmueble_arrendado?: string;
  es_titular_arriendo?: boolean;
  unidad?: string;
}

// Columnas reales de cada tabla en Supabase (ver supabase_registros.sql).
// direccion es exclusiva de propietarios; inmueble_arrendado/es_titular_arriendo
// son exclusivas de residentes. El formulario compartido (RegistroModulo.tsx)
// puede enviar ambos conjuntos de campos sin importar el tipo, así que hay que
// filtrar aquí antes de tocar la base o Postgres rechaza el insert/update con
// "could not find the column ... in the schema cache".
const CAMPOS_COMUNES = [
  "correo", "tipo_documento", "numero_documento", "nombres", "apellidos",
  "telefono", "fecha_nacimiento", "numero_matricula", "ciudad",
  "correo_contacto", "es_contacto_principal", "unidad",
] as const;
const CAMPOS_POR_TABLA: Record<TablaRegistro, readonly string[]> = {
  residentes: [...CAMPOS_COMUNES, "inmueble_arrendado", "es_titular_arriendo"],
  propietarios: [...CAMPOS_COMUNES, "direccion"],
};

function filtrarCampos<T extends Partial<RegistroInput>>(tabla: TablaRegistro, input: T): T {
  const permitidos = CAMPOS_POR_TABLA[tabla];
  const resultado = {} as T;
  for (const campo of permitidos) {
    if (campo in input) (resultado as Record<string, unknown>)[campo] = (input as Record<string, unknown>)[campo];
  }
  return resultado;
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
  if (!TIPOS_DOCUMENTO_SIN_CORREO.includes(body.tipo_documento) && !body.correo_contacto) {
    return "Falta el correo electrónico";
  }
  if (!body.numero_matricula) return "Falta el número de matrícula inmobiliaria";
  if (tabla === "propietarios") {
    if (!body.direccion) return "Falta la dirección";
    if (!body.ciudad) return "Falta la ciudad";
  }
  if (tabla === "residentes") {
    if (!body.inmueble_arrendado) return "Indica si el inmueble está arrendado";
    if (body.es_titular_arriendo && body.inmueble_arrendado !== "Sí") {
      return "El titular del arriendo solo aplica si el inmueble está arrendado";
    }
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

async function verificarFlagUnico(tabla: TablaRegistro, campo: "es_contacto_principal" | "es_titular_arriendo", correo: string, mensajeError: string, excluirId?: string) {
  const supabase = getSupabase();
  let query = supabase.from(tabla).select("id").eq("correo", correo.toLowerCase()).eq(campo, true);
  if (excluirId) query = query.neq("id", excluirId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data && data.length > 0) throw new Error(mensajeError);
}

export async function crearRegistro(tabla: TablaRegistro, input: RegistroInput) {
  const supabase = getSupabase();
  if (input.es_contacto_principal) {
    await verificarFlagUnico(tabla, "es_contacto_principal", input.correo, "Ya hay un titular de comunicaciones seleccionado. Desmárcalo antes de elegir otro.");
  }
  if (tabla === "residentes" && input.es_titular_arriendo) {
    await verificarFlagUnico(tabla, "es_titular_arriendo", input.correo, "Ya hay un titular del arriendo seleccionado. Desmárcalo antes de elegir otro.");
  }

  const { data, error } = await supabase
    .from(tabla)
    .insert(filtrarCampos(tabla, { ...input, correo: input.correo.toLowerCase() }))
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

  if (input.es_contacto_principal) {
    await verificarFlagUnico(tabla, "es_contacto_principal", correo, "Ya hay un titular de comunicaciones seleccionado. Desmárcalo antes de elegir otro.", id);
  }
  if (tabla === "residentes" && input.es_titular_arriendo) {
    await verificarFlagUnico(tabla, "es_titular_arriendo", correo, "Ya hay un titular del arriendo seleccionado. Desmárcalo antes de elegir otro.", id);
  }

  const { correo: correoInput, ...resto } = input;
  void correoInput;
  const campos = filtrarCampos(tabla, resto);
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

export async function restaurarRegistro(tabla: TablaRegistro, id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from(tabla).update({ eliminado: false }).eq("id", id);
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
