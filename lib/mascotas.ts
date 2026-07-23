import { getSupabase } from "@/lib/supabase";

export const ESPECIES_MASCOTA = ["Perro", "Gato", "Conejo", "Hámster"];
export const TAMANOS_MASCOTA = ["Pequeño", "Mediano", "Grande"];

export interface MascotaInput {
  correo: string;
  unidad: string;
  especie: string;
  nombre: string;
  raza: string;
  edad: string;
  tamano: string;
}

export function validarMascota(body: Partial<MascotaInput>): string | null {
  if (!body.correo) return "Falta el correo";
  if (!body.unidad) return "Selecciona la unidad";
  if (!body.especie) return "Selecciona la especie";
  if (!body.nombre) return "Falta el nombre";
  if (!body.raza) return "Falta la raza";
  if (!body.edad) return "Falta la edad";
  if (!body.tamano) return "Selecciona el tamaño";
  return null;
}

export async function listarMascotasPorCorreo(correo: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mascotas")
    .select("*")
    .eq("correo", correo.toLowerCase())
    .eq("eliminado", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearMascota(input: MascotaInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mascotas")
    .insert({ ...input, correo: input.correo.toLowerCase() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function actualizarMascota(id: string, correo: string, input: Partial<MascotaInput>) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from("mascotas").select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para editar este registro");

  const { correo: correoInput, ...campos } = input;
  void correoInput;
  const { data, error } = await supabase.from("mascotas").update(campos).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function borrarMascota(id: string, correo: string) {
  const supabase = getSupabase();
  const { data: existente, error: errBusqueda } = await supabase.from("mascotas").select("correo").eq("id", id).maybeSingle();
  if (errBusqueda) throw new Error(errBusqueda.message);
  if (!existente) throw new Error("Registro no encontrado");
  if (existente.correo.toLowerCase() !== correo.toLowerCase()) throw new Error("No autorizado para borrar este registro");

  const { error } = await supabase.from("mascotas").update({ eliminado: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restaurarMascota(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("mascotas").update({ eliminado: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarTodasMascotas(eliminados = false) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mascotas")
    .select("*")
    .eq("eliminado", eliminados)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
