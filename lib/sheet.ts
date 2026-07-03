export interface Votante {
  nombre: string;
  cantidad: number;
  correo: string;
  unidades: string[];
}

export async function buscarVotante(correo: string): Promise<Votante | null> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEET_ID");

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo leer el Sheet");

  const text = await res.text();
  const lines = text.trim().split("\n");

  const matches: { unidad: string; nombre: string; cantidad: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    // Columnas: ID, Unidad, Nombre, Correo, Cantidad, Habilitado
    const [, unidad, nombre, correoSheet, cantidadStr] = cols;
    if (correoSheet?.toLowerCase() === correo.toLowerCase()) {
      matches.push({ unidad, nombre, cantidad: parseInt(cantidadStr) || 1 });
    }
  }

  if (matches.length === 0) return null;

  return {
    nombre: matches[0].nombre,
    correo,
    cantidad: matches.reduce((s, m) => s + m.cantidad, 0),
    unidades: matches.map(m => m.unidad).filter(Boolean),
  };
}
