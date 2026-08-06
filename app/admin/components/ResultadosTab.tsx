"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { expandirDetalleVotos, construirYDescargarPDF, EncuestaResult, SeccionesReporte } from "../pdfReporte";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";

interface Props {
  adminHeaders: () => Record<string, string>;
  reloadKey: number;
}

export default function ResultadosTab({ adminHeaders, reloadKey }: Props) {
  const [datos, setDatos] = useState<EncuestaResult[]>([]);
  const [encSeleccionada, setEncSeleccionada] = useState("");
  const [cargando, setCargando] = useState(false);

  const [mostrarConfigReporte, setMostrarConfigReporte] = useState(false);
  const [seleccionReporte, setSeleccionReporte] = useState<Record<string, boolean>>({});
  const [seccionesReporte, setSeccionesReporte] = useState<SeccionesReporte>({ resumen: true, detalle: true, faltantes: true });
  const [generandoReporte, setGenerandoReporte] = useState(false);

  const [faltanUnidades, setFaltanUnidades] = useState<string[]>([]);
  const [cargandoFaltan, setCargandoFaltan] = useState(false);

  const cargarResultados = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/resultados", { headers: adminHeaders() });
    const data = await res.json();
    const arr: EncuestaResult[] = Array.isArray(data) ? data : [];
    setDatos(arr);
    setCargando(false);
    return arr;
  }, [adminHeaders]);

  useEffect(() => {
    cargarResultados().then(arr => {
      if (arr.length > 0) setEncSeleccionada(prev => prev || arr[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const cargarFaltan = useCallback(async (encuesta_id: string) => {
    setCargandoFaltan(true);
    const res = await fetch(`/api/admin/faltan?encuesta_id=${encuesta_id}`, { headers: adminHeaders() });
    const data = await res.json();
    setFaltanUnidades(Array.isArray(data.faltan) ? data.faltan : []);
    setCargandoFaltan(false);
  }, [adminHeaders]);

  useEffect(() => {
    if (encSeleccionada) cargarFaltan(encSeleccionada);
  }, [encSeleccionada, cargarFaltan]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/resultados", { headers: adminHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDatos(data);
        if (encSeleccionada) cargarFaltan(encSeleccionada);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [encSeleccionada, adminHeaders, cargarFaltan]);

  const pct = (v: number, total: number) => total > 0 ? Math.round((v / total) * 100) : 0;
  const encActual = datos.find(e => e.id === encSeleccionada);

  const exportarPDF = () => {
    if (!encActual) return;
    construirYDescargarPDF(
      [encActual],
      { resumen: true, detalle: true, faltantes: true },
      { [encActual.id]: faltanUnidades },
      `resultados_${encActual.pregunta.substring(0, 30).replace(/\s+/g, "_")}.pdf`
    );
  };

  const generarReporte = async () => {
    const seleccionadas = datos.filter(e => seleccionReporte[e.id]);
    if (seleccionadas.length === 0) return;
    setGenerandoReporte(true);
    const faltantesPorEncuesta: Record<string, string[]> = {};
    if (seccionesReporte.faltantes) {
      await Promise.all(seleccionadas.map(async e => {
        const res = await fetch(`/api/admin/faltan?encuesta_id=${e.id}`, { headers: adminHeaders() });
        const data = await res.json();
        faltantesPorEncuesta[e.id] = Array.isArray(data.faltan) ? data.faltan : [];
      }));
    }
    construirYDescargarPDF(seleccionadas, seccionesReporte, faltantesPorEncuesta, `reporte_encuestas_${new Date().toISOString().slice(0, 10)}.pdf`);
    setGenerandoReporte(false);
    setMostrarConfigReporte(false);
  };

  const exportarXLSX = () => {
    if (!encActual) return;
    const filas = expandirDetalleVotos(encActual.detalle).map((f, i) => ({
      "#": i + 1, Nombre: f.nombre, Unidad: f.unidad, "Opción": f.opciones.join(", "), Fecha: f.fecha,
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle");
    XLSX.writeFile(wb, `resultados_${encActual.pregunta.substring(0, 30).replace(/\s+/g, "_")}.xlsx`);
  };

  if (cargando && datos.length === 0) {
    return <div style={{ textAlign: "center", padding: 60, color: "#111" }}>Cargando...</div>;
  }
  if (datos.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", color: "#111" }}>
        <p>No hay encuestas creadas aún.</p>
        <p style={{ fontSize: 13 }}>Ve a la pestaña Encuestas para crear la primera.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#111", marginRight: 10 }}>Encuesta:</label>
          <select value={encSeleccionada} onChange={e => setEncSeleccionada(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "2px solid #ddd", fontSize: 13, color: "#111" }}>
            {datos.map(e => (
              <option key={e.id} value={e.id}>
                {e.activa ? "● " : "○ "}{e.pregunta.length > 55 ? e.pregunta.substring(0, 55) + "..." : e.pregunta}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              if (!mostrarConfigReporte && Object.keys(seleccionReporte).length === 0) {
                setSeleccionReporte(Object.fromEntries(datos.map(e => [e.id, true])));
              }
              setMostrarConfigReporte(v => !v);
            }}
            style={{ background: mostrarConfigReporte ? NARANJA : "#fff", color: mostrarConfigReporte ? "#fff" : NARANJA, border: `2px solid ${NARANJA}`, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Reporte personalizado
          </button>
          <button onClick={exportarPDF}
            style={{ background: VERDE, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Exportar PDF
          </button>
        </div>
      </div>

      {mostrarConfigReporte && (
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 16, border: `2px solid ${NARANJA}30` }}>
          <h3 style={{ fontWeight: 700, color: "#111", fontSize: 15, margin: "0 0 14px" }}>Reporte personalizado en PDF</h3>

          <p style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 8 }}>Encuestas a incluir</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {datos.map(e => (
              <label key={e.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13, color: "#111" }}>
                <input type="checkbox" checked={!!seleccionReporte[e.id]}
                  onChange={ev => setSeleccionReporte(prev => ({ ...prev, [e.id]: ev.target.checked }))}
                  style={{ marginTop: 2 }}/>
                <span>{e.activa ? "● " : "○ "}{e.pregunta}</span>
              </label>
            ))}
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 8 }}>Secciones a incluir</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 18 }}>
            {([["resumen", "Resumen (votos y participación)"], ["detalle", "Detalle de votos"], ["faltantes", "Quiénes no han votado"]] as const).map(([k, label]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#111" }}>
                <input type="checkbox" checked={seccionesReporte[k]}
                  onChange={ev => setSeccionesReporte(prev => ({ ...prev, [k]: ev.target.checked }))}/>
                {label}
              </label>
            ))}
          </div>

          <button onClick={generarReporte} disabled={generandoReporte || Object.values(seleccionReporte).every(v => !v)}
            style={{
              background: generandoReporte ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 20px", fontSize: 13, fontWeight: 800,
              cursor: generandoReporte ? "not-allowed" : "pointer",
            }}>
            {generandoReporte ? "Generando..." : "Generar PDF"}
          </button>
        </div>
      )}

      {encActual && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[
              { label: "Votos recibidos", value: encActual.hanRespondido, color: VERDE, bg: "#f1f8e9" },
              { label: "Faltan", value: encActual.faltan, color: NARANJA, bg: "#fff8f0" },
              { label: "Total unidades", value: encActual.totalVotantes, color: "#111", bg: "#f9f9f9" },
            ].map(t => (
              <div key={t.label} style={{ background: t.bg, border: `2px solid ${t.color}30`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: t.color }}>{t.value}</div>
                <div style={{ fontSize: 12, color: "#111", marginTop: 4, fontWeight: 600 }}>{t.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 16, border: "1px solid #e5e5e5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Participación · {encActual.personasHanVotado} personas</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: VERDE }}>{pct(encActual.hanRespondido, encActual.totalVotantes)}%</span>
            </div>
            <div style={{ background: "#e5e7eb", borderRadius: 8, height: 14, overflow: "hidden" }}>
              <div style={{ background: VERDE, width: `${pct(encActual.hanRespondido, encActual.totalVotantes)}%`, height: "100%", borderRadius: 8, transition: "width 0.6s ease" }} />
            </div>
            <p style={{ fontSize: 12, color: "#111", margin: "6px 0 0" }}>Se han recibido <strong>{encActual.hanRespondido}</strong> votos de <strong>{encActual.totalVotantes}</strong> unidades</p>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 16, border: "1px solid #e5e5e5" }}>
            <h3 style={{ fontWeight: 700, color: "#111", marginBottom: 16, fontSize: 15 }}>Resultados</h3>
            {Object.entries(encActual.conteo).map(([op, c]) => {
              const p = encActual.hanRespondido > 0 ? Math.round((c.votos / encActual.hanRespondido) * 100) : 0;
              return (
                <div key={op} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{op}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: NARANJA }}>{c.votos} votos ({p}%)</span>
                  </div>
                  <div style={{ background: "#f0f0f0", borderRadius: 6, height: 10, overflow: "hidden" }}>
                    <div style={{ background: NARANJA, width: `${p}%`, height: "100%", borderRadius: 6, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {encActual.detalle.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", border: "1px solid #e5e5e5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontWeight: 700, color: "#111", fontSize: 15, margin: 0 }}>
                  Detalle · {encActual.personasHanVotado} personas · {encActual.hanRespondido} cuotas
                </h3>
                <button onClick={exportarXLSX}
                  style={{ background: "#217346", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Exportar Excel
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      {["#", "Nombre", "Unidad", "Opción(es)", "Fecha"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#111", fontWeight: 700, borderBottom: "2px solid #e5e5e5" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {encActual.detalle.flatMap((v) => {
                      let detalles: { unidad: string; nombre: string; cantidad: number }[];
                      try {
                        const p = JSON.parse(v.unidad);
                        if (Array.isArray(p) && p[0]?.unidad !== undefined) {
                          detalles = p;
                        } else if (Array.isArray(p)) {
                          detalles = p.map((u: string) => ({ unidad: u, nombre: v.nombre, cantidad: 1 }));
                        } else {
                          detalles = [{ unidad: v.unidad || "—", nombre: v.nombre, cantidad: v.cantidad || 1 }];
                        }
                      } catch {
                        detalles = [{ unidad: v.unidad || "—", nombre: v.nombre, cantidad: v.cantidad || 1 }];
                      }
                      const filas = detalles.flatMap(d =>
                        Array.from({ length: d.cantidad || 1 }, () => ({ unidad: d.unidad, nombre: d.nombre }))
                      );
                      return filas.map((f, idx) => ({
                        ...v, _unidad: f.unidad, _nombre: f.nombre,
                        _idx: idx, _total: filas.length, _key: `${v.correo}-${idx}`,
                      }));
                    }).map((row, i) => (
                      <tr key={row._key} style={{ borderBottom: "1px solid #f0f0f0", background: row._idx > 0 ? "#f9fffc" : "#fff" }}>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{i + 1}</td>
                        <td style={{ padding: "8px 10px", fontWeight: row._idx === 0 ? 700 : 400, color: "#111" }}>{row._nombre}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#111" }}>{row._unidad}</td>
                        <td style={{ padding: "8px 10px", color: VERDE, fontWeight: 600 }}>{(row.opciones_elegidas ?? []).join(", ")}</td>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{new Date(row.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", marginTop: 16, border: `2px solid ${NARANJA}30` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontWeight: 700, color: NARANJA, fontSize: 15, margin: 0 }}>
                Faltan por votar ({faltanUnidades.length} unidades)
              </h3>
              {cargandoFaltan && <span style={{ fontSize: 12, color: "#111" }}>Cargando...</span>}
            </div>
            {faltanUnidades.length === 0 && !cargandoFaltan ? (
              <p style={{ color: "#111", fontSize: 13, margin: 0 }}>Todas las unidades han votado.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {faltanUnidades.map(u => (
                  <span key={u} style={{ background: "#fff8f0", border: `1px solid ${NARANJA}50`, borderRadius: 6, padding: "4px 12px", fontSize: 13, fontWeight: 700, color: NARANJA }}>
                    {u}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
