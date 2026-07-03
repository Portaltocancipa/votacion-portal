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

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    // Columnas: ID, Unidad, Nombre, Correo, Cantidad, Habilitado
    const [, unidad, nombre, correoSheet, cantidadStr] = cols;
    if (correoSheet?.toLowerCase() === correo.toLowerCase()) {
      detalles.push({ unidad, nombre, cantidad: parseInt(cantidadStr) || 1 });
    }
  }

  if (detalles.length === 0) return null;

  return {
    nombre: detalles[0].nombre,
    correo,
    cantidad: detalles.reduce((s, d) => s + d.cantidad, 0),
    unidades: detalles.map(d => d.unidad).filter(Boolean),
    detalles,
  };
}
