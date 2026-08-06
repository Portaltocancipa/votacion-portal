import jsPDF from "jspdf";
import { __createTable as crearTablaPDF, __drawTable as dibujarTablaPDF } from "jspdf-autotable";
import { formatUnidad } from "@/lib/unidad";

export interface EncuestaResult {
  id: string;
  pregunta: string;
  tipo: string;
  activa: boolean;
  personasHanVotado: number;
  hanRespondido: number;
  faltan: number;
  totalVotantes: number;
  conteo: Record<string, { votos: number }>;
  detalle: any[];
}

export type SeccionesReporte = { resumen: boolean; detalle: boolean; faltantes: boolean };

// Convierte cada respuesta (que puede representar varias unidades/cuotas
// en un solo registro) en una fila por cuota. Se usa en la tabla de detalle
// en pantalla, en el export a Excel y en el reporte en PDF, para no repetir
// la misma lógica de parseo tres veces.
export function expandirDetalleVotos(detalle: any[]): { nombre: string; unidad: string; opciones: string[]; fecha: string }[] {
  const filas: { nombre: string; unidad: string; opciones: string[]; fecha: string }[] = [];
  detalle.forEach(v => {
    let detalles: { unidad: string; nombre: string; cantidad: number }[];
    try {
      const p = JSON.parse(v.unidad);
      if (Array.isArray(p) && p[0]?.unidad !== undefined) detalles = p;
      else if (Array.isArray(p)) detalles = p.map((u: string) => ({ unidad: u, nombre: v.nombre, cantidad: 1 }));
      else detalles = [{ unidad: v.unidad || "—", nombre: v.nombre, cantidad: v.cantidad || 1 }];
    } catch {
      detalles = [{ unidad: v.unidad || "—", nombre: v.nombre, cantidad: v.cantidad || 1 }];
    }
    const fecha = new Date(v.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" });
    detalles.forEach(d => {
      Array.from({ length: d.cantidad || 1 }).forEach(() => {
        filas.push({ nombre: d.nombre, unidad: d.unidad, opciones: v.opciones_elegidas ?? [], fecha });
      });
    });
  });
  return filas;
}

// Escribe el resultado de una encuesta en el documento jsPDF (mutando `doc`),
// respetando qué secciones pidió el admin. Se usa tanto para "Exportar PDF"
// (una encuesta, las 3 secciones) como para el reporte con varias encuestas.
function agregarEncuestaAlPDF(doc: jsPDF, enc: EncuestaResult, secciones: SeccionesReporte, faltantes: string[], primera: boolean) {
  if (!primera) doc.addPage();
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const tituloLineas = doc.splitTextToSize(enc.pregunta, maxWidth);
  doc.text(tituloLineas, marginX, y);
  y += tituloLineas.length * 6 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(enc.activa ? "Encuesta activa" : "Encuesta cerrada", marginX, y);
  doc.setTextColor(20);
  y += 9;

  if (secciones.resumen) {
    doc.setFontSize(11);
    doc.text(`Votos recibidos: ${enc.hanRespondido}    Faltan: ${enc.faltan}    Total unidades: ${enc.totalVotantes}`, marginX, y);
    y += 7;
    const pct = enc.totalVotantes > 0 ? Math.round((enc.hanRespondido / enc.totalVotantes) * 100) : 0;
    doc.text(`Participación: ${enc.personasHanVotado} personas · ${pct}% de las unidades`, marginX, y);
    y += 9;
    Object.entries(enc.conteo).forEach(([op, c]) => {
      const p = enc.hanRespondido > 0 ? Math.round((c.votos / enc.hanRespondido) * 100) : 0;
      const lineas = doc.splitTextToSize(`${op}: ${c.votos} votos (${p}%)`, maxWidth);
      doc.text(lineas, marginX, y);
      y += lineas.length * 6;
    });
    y += 6;
  }

  if (secciones.detalle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalle de votos", marginX, y);
    y += 5;
    const filas = expandirDetalleVotos(enc.detalle);
    const tabla = crearTablaPDF(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["#", "Nombre", "Unidad", "Opción(es)", "Fecha"]],
      body: filas.map((f, i) => [String(i + 1), f.nombre, f.unidad, f.opciones.join(", "), f.fecha]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [27, 94, 32] },
    });
    dibujarTablaPDF(doc, tabla);
    y = (tabla.finalY ?? y) + 10;
  }

  if (secciones.faltantes) {
    if (y > pageHeight - 30) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Quiénes no han votado (${faltantes.length} unidades)`, marginX, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const texto = faltantes.length === 0 ? "Todas las unidades han votado." : faltantes.map(u => formatUnidad(u)).join(" · ");
    doc.text(doc.splitTextToSize(texto, maxWidth), marginX, y);
  }
}

export function construirYDescargarPDF(encuestas: EncuestaResult[], secciones: SeccionesReporte, faltantesPorEncuesta: Record<string, string[]>, nombreArchivo: string) {
  const doc = new jsPDF();
  encuestas.forEach((enc, i) => {
    agregarEncuestaAlPDF(doc, enc, secciones, faltantesPorEncuesta[enc.id] || [], i === 0);
  });
  doc.save(nombreArchivo);
}
