export interface Votante {
  id: string;
  unidad: string;
  correo: string;
  cantidad: number;
  nombre: string;
}

export async function buscarVotante(correo: string): Promise<Votante | null> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEET_ID");

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo leer el Sheet");

  const text = await res.text();
  const lines = text.trim().split("\n");

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    // Columnas: ID, Unidad, Correo, Cantidad, Nombre Copropietario
    const [id, unidad, correoSheet, cantidadStr, nombre] = cols;
    if (correoSheet?.toLowerCase() === correo.toLowerCase()) {
      return { id, unidad, correo: correoSheet, cantidad: parseInt(cantidadStr) || 1, nombre };
    }
  }
  return null;
}
