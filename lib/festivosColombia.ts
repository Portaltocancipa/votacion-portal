// Cálculo de festivos colombianos (Ley Emiliani incluida) para cualquier año,
// sin depender de una tabla fija que haya que actualizar cada 12 meses.

function calcularPascua(anio: number): Date {
  // Algoritmo de Meeus/Jones/Butcher (calendario gregoriano).
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function sumarDias(fecha: Date, dias: number): Date {
  const r = new Date(fecha);
  r.setUTCDate(r.getUTCDate() + dias);
  return r;
}

// Ley Emiliani: el festivo se traslada al lunes siguiente (o se queda si ya cae en lunes).
function trasladarALunes(fecha: Date): Date {
  const dia = fecha.getUTCDay();
  return sumarDias(fecha, (8 - dia) % 7);
}

function formatoISO(fecha: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const d = String(fecha.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function festivosColombia(anio: number): Set<string> {
  const fijos = [
    new Date(Date.UTC(anio, 0, 1)),   // Año Nuevo
    new Date(Date.UTC(anio, 4, 1)),   // Día del Trabajo
    new Date(Date.UTC(anio, 6, 20)),  // Independencia
    new Date(Date.UTC(anio, 7, 7)),   // Batalla de Boyacá
    new Date(Date.UTC(anio, 11, 8)),  // Inmaculada Concepción
    new Date(Date.UTC(anio, 11, 25)), // Navidad
  ];

  const trasladables = [
    new Date(Date.UTC(anio, 0, 6)),   // Reyes Magos
    new Date(Date.UTC(anio, 2, 19)),  // San José
    new Date(Date.UTC(anio, 5, 29)),  // San Pedro y San Pablo
    new Date(Date.UTC(anio, 7, 15)),  // Asunción de la Virgen
    new Date(Date.UTC(anio, 9, 12)),  // Día de la Raza
    new Date(Date.UTC(anio, 10, 1)),  // Todos los Santos
    new Date(Date.UTC(anio, 10, 11)), // Independencia de Cartagena
  ].map(trasladarALunes);

  const pascua = calcularPascua(anio);
  const basadosEnPascua = [
    sumarDias(pascua, -3), // Jueves Santo
    sumarDias(pascua, -2), // Viernes Santo
    trasladarALunes(sumarDias(pascua, 39)), // Ascensión del Señor
    trasladarALunes(sumarDias(pascua, 60)), // Corpus Christi
    trasladarALunes(sumarDias(pascua, 68)), // Sagrado Corazón
  ];

  return new Set([...fijos, ...trasladables, ...basadosEnPascua].map(formatoISO));
}

const cachePorAnio = new Map<number, Set<string>>();
function festivosDelAnio(anio: number): Set<string> {
  let set = cachePorAnio.get(anio);
  if (!set) { set = festivosColombia(anio); cachePorAnio.set(anio, set); }
  return set;
}

export function esDomingoOFestivo(fechaISO: string): boolean {
  if (!fechaISO) return false;
  const [y, m, d] = fechaISO.split("-").map(Number);
  if (!y || !m || !d) return false;
  const fecha = new Date(Date.UTC(y, m - 1, d));
  if (fecha.getUTCDay() === 0) return true;
  return festivosDelAnio(y).has(fechaISO);
}

// Horario permitido para el inicio de una mudanza/trasteo, según el día de
// la semana. Domingo no aplica porque esDomingoOFestivo() ya lo bloquea antes.
export function rangoHorarioPermitido(fechaISO: string): { min: string; max: string } {
  if (!fechaISO) return { min: "08:00", max: "16:00" };
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (dia === 6) return { min: "08:00", max: "12:00" }; // sábado
  return { min: "08:00", max: "16:00" }; // lunes a viernes
}
