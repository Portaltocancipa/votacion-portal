export interface VotanteDetalle {
  unidad: string;
  nombre: string;
  cantidad: number;
}

export interface Votante {
  nombre: string;
  cantidad: number;
  correo: string;
  unidades: string[];
  detalles: VotanteDetalle[];
  habilitado: boolean;
  token: string;
}

export async function getAllUnidades(): Promise<string[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEET_ID");

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo leer el Sheet");

  const text = await res.text();
  const lines = text.trim().split("\n");

  const unidades = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const [, unidad] = cols;
    if (unidad) unidades.add(unidad);
  }

  return Array.from(unidades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export async function buscarVotante(correo: string): Promise<Votante | null> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEET_ID");

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo leer el Sheet");

  const text = await res.text();
  const lines = text.trim().split("\n");

  const detalles: VotanteDetalle[] = [];

  let habilitado = true;
  let token = "";

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    // Columnas: ID, Unidad, Nombre, Correo, Cantidad, Habilitado, Token
    // La columna "Cantidad" en el Sheet se llena con el total de unidades que
    // representa ese correo, repetido en cada una de sus filas (no "1 por
    // fila"). Sumarla tal cual eleva el peso al cuadrado cuando un correo
    // tiene varias filas (ej. 3 filas con "3" cada una -> 9 en vez de 3).
    // Cada fila = una unidad = 1 voto; el total es la cantidad de filas.
    const [, unidad, nombre, correoSheet, , habilitadoStr, tokenStr] = cols;
    if (correoSheet?.toLowerCase() === correo.toLowerCase()) {
      detalles.push({ unidad, nombre, cantidad: 1 });
      if (habilitadoStr?.toLowerCase() === "no") habilitado = false;
      if (!token && tokenStr) token = tokenStr.trim();
    }
  }

  if (detalles.length === 0) return null;

  return {
    nombre: detalles[0].nombre,
    correo,
    cantidad: detalles.length,
    unidades: detalles.map(d => d.unidad).filter(Boolean),
    detalles,
    habilitado,
    token,
  };
}

// Antes solo /api/validar (el login) revisaba el token; votar y crear/editar/
// borrar residentes, propietarios, parqueadero, mascotas y bicicletas solo
// pedían el correo, que es público/adivinable. Esta función centraliza la
// verificación para que esas acciones también exijan el token correcto.
//
// Importante: si la fila de esa persona en el Sheet no tiene token asignado,
// se niega el acceso (antes se permitía sin más, lo que dejaba esa cuenta
// completamente abierta a cualquiera que supiera el correo). Si hay cuentas
// legítimas sin token, hay que asignarles uno en el Sheet.
export async function verificarToken(correo: string, token: string | undefined): Promise<boolean> {
  const votante = await buscarVotante(correo);
  if (!votante) return false;
  if (!votante.token) return false; // sin token configurado = acceso denegado, no abierto
  return !!token && token.trim().toLowerCase() === votante.token.toLowerCase();
}
