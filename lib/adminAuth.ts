import { NextRequest } from "next/server";

// La clave viaja en el header x-admin-key (nunca en la URL, para no quedar
// en logs de acceso ni en el historial del navegador). No hay fallback a un
// valor por defecto: si ADMIN_KEY no está configurada, el panel debe fallar
// en vez de aceptar una clave adivinable.
export function verificarAdmin(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) throw new Error("ADMIN_KEY no está configurada");
  const key = req.headers.get("x-admin-key");
  return key === adminKey;
}

export function respuestaNoAutorizado() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

export function respuestaMalConfigurado() {
  return Response.json({ error: "Servidor mal configurado: falta ADMIN_KEY" }, { status: 500 });
}
