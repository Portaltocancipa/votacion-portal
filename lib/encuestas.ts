export interface EncuestaInput {
  pregunta: string;
  opciones: string[];
  tipo?: "unica" | "multiple";
  activa?: boolean;
}

// Valida solo los campos presentes en el body (usado en PUT, que a veces
// solo manda { activa } para activar/desactivar sin tocar el resto).
export function validarEncuestaParcial(body: Record<string, unknown>): string | null {
  if (body.pregunta !== undefined && !String(body.pregunta).trim()) {
    return "La pregunta no puede quedar vacía";
  }
  if (body.opciones !== undefined) {
    if (!Array.isArray(body.opciones) || body.opciones.length < 2) {
      return "Se necesitan al menos 2 opciones";
    }
    if (body.opciones.some((o) => typeof o !== "string" || !o.trim())) {
      return "Todas las opciones deben tener texto";
    }
  }
  if (body.tipo !== undefined && body.tipo !== "unica" && body.tipo !== "multiple") {
    return "Tipo de encuesta inválido";
  }
  if (body.activa !== undefined && typeof body.activa !== "boolean") {
    return "activa debe ser true/false";
  }
  return null;
}

// Para crear (POST): pregunta y opciones son obligatorias.
export function validarEncuestaNueva(body: Record<string, unknown>): string | null {
  if (!body.pregunta || !String(body.pregunta).trim()) return "Falta la pregunta";
  if (!Array.isArray(body.opciones) || body.opciones.length < 2) return "Se necesitan al menos 2 opciones";
  return validarEncuestaParcial(body);
}
