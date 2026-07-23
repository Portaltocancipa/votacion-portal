"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { calcularEdad } from "@/lib/edad";
import { formatUnidad } from "@/lib/unidad";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const ADMIN_KEY = "portal2026";
const BASE_TOTAL = 80;

interface RegistroAdmin {
  id: string;
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  fecha_nacimiento: string;
  correo_contacto: string;
  es_contacto_principal: boolean;
  unidad?: string;
  eliminado?: boolean;
  numero_matricula?: string;
  direccion?: string;
  ciudad?: string;
  created_at: string;
}

interface EncuestaResult {
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

interface EncuestaAdmin {
  id: string;
  pregunta: string;
  opciones: string[];
  tipo: string;
  activa: boolean;
  created_at: string;
}

const FORM_INIT = { pregunta: "", numOpciones: 2, opciones: ["", ""], tipo: "unica", activa: true };

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [errorAuth, setErrorAuth] = useState("");
  const [tab, setTab] = useState<"resultados" | "encuestas" | "registros" | "contactos">("resultados");

  const [registrosTipo, setRegistrosTipo] = useState<"residentes" | "propietarios">("residentes");
  const [registros, setRegistros] = useState<RegistroAdmin[]>([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(false);
  const [verEliminados, setVerEliminados] = useState(false);
  const [filtroUnidad, setFiltroUnidad] = useState("");

  const [datos, setDatos] = useState<EncuestaResult[]>([]);
  const [encSeleccionada, setEncSeleccionada] = useState("");
  const [cargando, setCargando] = useState(false);

  const [encuestas, setEncuestas] = useState<EncuestaAdmin[]>([]);
  const [faltanUnidades, setFaltanUnidades] = useState<string[]>([]);
  const [cargandoFaltan, setCargandoFaltan] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [errForm, setErrForm] = useState("");

  const login = () => {
    if (key === ADMIN_KEY) { setAutenticado(true); setErrorAuth(""); }
    else setErrorAuth("Clave incorrecta");
  };

  const cargarResultados = async () => {
    setCargando(true);
    const res = await fetch(`/api/resultados?key=${ADMIN_KEY}`);
    const data = await res.json();
    const arr: EncuestaResult[] = Array.isArray(data) ? data : [];
    setDatos(arr);
    if (arr.length > 0 && !encSeleccionada) setEncSeleccionada(arr[0].id);
    setCargando(false);
  };

  const cargarFaltan = async (encuesta_id: string) => {
    setCargandoFaltan(true);
    const res = await fetch(`/api/admin/faltan?key=${ADMIN_KEY}&encuesta_id=${encuesta_id}`);
    const data = await res.json();
    setFaltanUnidades(Array.isArray(data.faltan) ? data.faltan : []);
    setCargandoFaltan(false);
  };

  const cargarEncuestas = async () => {
    const res = await fetch(`/api/admin/encuestas?key=${ADMIN_KEY}`);
    const data = await res.json();
    setEncuestas(Array.isArray(data) ? data : []);
  };

  const cargarRegistros = useCallback(async (tipo: "residentes" | "propietarios", eliminados: boolean) => {
    setCargandoRegistros(true);
    const res = await fetch(`/api/admin/registros?key=${ADMIN_KEY}&tabla=${tipo}&eliminados=${eliminados}`);
    const data = await res.json();
    setRegistros(Array.isArray(data) ? data : []);
    setCargandoRegistros(false);
  }, []);

  const restaurarRegistro = async (id: string) => {
    await fetch(`/api/admin/registros/${id}?key=${ADMIN_KEY}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabla: registrosTipo }),
    });
    cargarRegistros(registrosTipo, verEliminados);
  };

  useEffect(() => {
    if (autenticado) { cargarResultados(); cargarEncuestas(); }
  }, [autenticado]);

  useEffect(() => {
    setFiltroUnidad("");
    if (autenticado && tab === "registros") cargarRegistros(registrosTipo, verEliminados);
    else if (autenticado && tab === "contactos") cargarRegistros(registrosTipo, false);
  }, [autenticado, tab, registrosTipo, verEliminados, cargarRegistros]);

  useEffect(() => {
    if (encSeleccionada) cargarFaltan(encSeleccionada);
  }, [encSeleccionada]);

  useEffect(() => {
    if (!autenticado || tab !== "resultados") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/resultados?key=${ADMIN_KEY}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDatos(data);
        if (encSeleccionada) cargarFaltan(encSeleccionada);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [autenticado, tab, encSeleccionada]);

  const pct = (v: number) => BASE_TOTAL > 0 ? Math.round((v / BASE_TOTAL) * 100) : 0;

  const updateNumOpciones = (n: number) => {
    const curr = form.opciones;
    const ops = Array.from({ length: n }, (_, i) => curr[i] || "");
    setForm(f => ({ ...f, numOpciones: n, opciones: ops }));
  };

  const editarEncuesta = (enc: EncuestaAdmin) => {
    setEditandoId(enc.id);
    setForm({ pregunta: enc.pregunta, numOpciones: enc.opciones.length, opciones: enc.opciones, tipo: enc.tipo, activa: enc.activa });
    setErrForm("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_INIT);
    setErrForm("");
  };

  const crearEncuesta = async () => {
    if (!form.pregunta.trim()) { setErrForm("Escribe la pregunta"); return; }
    if (form.opciones.some(o => !o.trim())) { setErrForm("Completa todas las opciones"); return; }
    setCreando(true); setErrForm("");

    if (editandoId) {
      const res = await fetch(`/api/admin/encuestas/${editandoId}?key=${ADMIN_KEY}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: form.pregunta.trim(),
          opciones: form.opciones.map(o => o.trim()),
          tipo: form.tipo,
          activa: form.activa,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setEditandoId(null);
        setForm(FORM_INIT);
        cargarEncuestas();
        cargarResultados();
      } else {
        setErrForm(data.error || "Error al guardar");
      }
    } else {
      const res = await fetch(`/api/admin/encuestas?key=${ADMIN_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: form.pregunta.trim(),
          opciones: form.opciones.map(o => o.trim()),
          tipo: form.tipo,
          activa: form.activa,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setForm(FORM_INIT);
        cargarEncuestas();
        cargarResultados();
      } else {
        setErrForm(data.error || "Error al crear");
      }
    }
    setCreando(false);
  };

  const toggleActiva = async (id: string, activa: boolean) => {
    await fetch(`/api/admin/encuestas/${id}?key=${ADMIN_KEY}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !activa }),
    });
    cargarEncuestas();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta encuesta y todas sus respuestas? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/admin/encuestas/${id}?key=${ADMIN_KEY}`, { method: "DELETE" });
    cargarEncuestas();
    cargarResultados();
  };

  const encActual = datos.find(e => e.id === encSeleccionada);

  const exportarPDF = () => {
    const style = document.createElement("style");
    style.id = "__print_style__";
    style.innerHTML = `@media print { body > * { display: none !important; } #resultados-pdf { display: block !important; } @page { margin: 18mm; } }`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById("__print_style__")?.remove(), 1000);
  };

  const exportarXLSX = () => {
    if (!encActual) return;
    const filas: any[] = [];
    encActual.detalle.forEach(v => {
      let detalles: { unidad: string; nombre: string; cantidad: number }[];
      try {
        const p = JSON.parse(v.unidad);
        if (Array.isArray(p) && p[0]?.unidad !== undefined) detalles = p;
        else detalles = [{ unidad: v.unidad || "—", nombre: v.nombre, cantidad: v.cantidad || 1 }];
      } catch { detalles = [{ unidad: v.unidad || "—", nombre: v.nombre, cantidad: v.cantidad || 1 }]; }
      const expandidas = detalles.flatMap(d => Array.from({ length: d.cantidad || 1 }, () => ({ unidad: d.unidad, nombre: d.nombre })));
      const fecha = new Date(v.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" });
      expandidas.forEach(f => {
        filas.push({ Nombre: f.nombre, Unidad: f.unidad, "Opción": (v.opciones_elegidas ?? []).join(", "), Fecha: fecha });
      });
    });
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle");
    XLSX.writeFile(wb, `resultados_${encActual.pregunta.substring(0, 30).replace(/\s+/g, "_")}.xlsx`);
  };

  const unidadesDisponibles = Array.from(new Set(registros.map(r => r.unidad).filter((u): u is string => !!u)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const registrosFiltrados = filtroUnidad ? registros.filter(r => r.unidad === filtroUnidad) : registros;

  const exportarRegistrosXLSX = () => {
    const filas = registrosFiltrados.map(r => ({
      Unidad: r.unidad ? formatUnidad(r.unidad) : "",
      Nombres: r.nombres,
      Apellidos: r.apellidos,
      "Tipo Documento": r.tipo_documento,
      "N° Documento": r.numero_documento,
      Teléfono: r.telefono || "",
      Edad: calcularEdad(r.fecha_nacimiento),
      "Correo contacto": r.correo_contacto || "",
      "Contacto principal": r.es_contacto_principal ? "Sí" : "No",
      ...(registrosTipo === "propietarios" ? {
        "N° Matrícula": r.numero_matricula || "",
        Dirección: r.direccion || "",
        Ciudad: r.ciudad || "",
      } : {}),
      "Correo cuenta": r.correo,
      "Fecha registro": new Date(r.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, registrosTipo);
    XLSX.writeFile(wb, `${registrosTipo}_${verEliminados ? "eliminados_" : ""}${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!autenticado) return (
    <div style={{ minHeight: "100vh", background: VERDE, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "36px 32px", maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontWeight: 800, color: VERDE, marginBottom: 4, fontSize: 20 }}>Panel Administrador</h2>
        <p style={{ color: "#111", fontSize: 13, marginBottom: 24 }}>Agrupación El Portal · Tocancipá</p>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#111", display: "block", marginBottom: 8 }}>Clave de acceso</label>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          placeholder="••••••••"
          style={{ width: "100%", border: "2px solid #ddd", borderRadius: 8, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8, color: "#111" }}
        />
        {errorAuth && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{errorAuth}</p>}
        <button onClick={login} style={{ width: "100%", background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>Ingresar</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui", padding: "24px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ background: VERDE, borderRadius: 14, padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `4px solid ${NARANJA}` }}>
          <div>
            <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>Panel Administrador</h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "4px 0 0" }}>Sistema de votación · Portal de Tocancipá</p>
          </div>
          <button onClick={() => { cargarResultados(); cargarEncuestas(); }} disabled={cargando}
            style={{ background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {cargando ? "..." : "↻ Actualizar"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {([["resultados", "📊 Resultados"], ["encuestas", "📋 Encuestas"], ["registros", "🏠 Registros"], ["contactos", "📞 Contactos"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
                background: tab === t ? VERDE : "#fff", color: tab === t ? "#fff" : "#555", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "resultados" && (
          <>
            {cargando ? (
              <div style={{ textAlign: "center", padding: 60, color: "#111" }}>Cargando...</div>
            ) : datos.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", color: "#111" }}>
                <p>No hay encuestas creadas aún.</p>
                <p style={{ fontSize: 13 }}>Ve a la pestaña Encuestas para crear la primera.</p>
              </div>
            ) : (
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
                  <button onClick={exportarPDF}
                    style={{ background: VERDE, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ⬇ Exportar PDF
                  </button>
                </div>

                {encActual && (
                  <div id="resultados-pdf">
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
                        <span style={{ fontSize: 14, fontWeight: 800, color: VERDE }}>{pct(encActual.hanRespondido)}%</span>
                      </div>
                      <div style={{ background: "#e5e7eb", borderRadius: 8, height: 14, overflow: "hidden" }}>
                        <div style={{ background: VERDE, width: `${pct(encActual.hanRespondido)}%`, height: "100%", borderRadius: 8, transition: "width 0.6s ease" }} />
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
                            ⬇ Exportar Excel
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
                                // Parse stored detalles: [{unidad, nombre, cantidad}] or fallback
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
                                // Expand: one row per cuota (respecting cantidad per detalle)
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
                        <p style={{ color: "#111", fontSize: 13, margin: 0 }}>✅ Todas las unidades han votado.</p>
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
            )}
          </>
        )}

        {tab === "encuestas" && (
          <>
            <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", marginBottom: 20, border: "1px solid #e5e5e5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontWeight: 700, color: "#111", fontSize: 15, margin: 0 }}>
                  {editandoId ? "✏️ Editar encuesta" : "Nueva encuesta"}
                </h3>
                {editandoId && (
                  <button onClick={cancelarEdicion}
                    style={{ background: "#f5f5f5", color: "#111", border: "1px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Cancelar
                  </button>
                )}
              </div>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 }}>Pregunta</label>
              <input
                value={form.pregunta}
                onChange={e => setForm(f => ({ ...f, pregunta: e.target.value }))}
                placeholder="Escribe la pregunta de la encuesta..."
                style={{ width: "100%", border: "2px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16, color: "#111" }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 }}>Tipo de respuesta</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "2px solid #ddd", fontSize: 13, color: "#111" }}>
                    <option value="unica">Respuesta única</option>
                    <option value="multiple">Varias respuestas</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 }}>Cantidad de opciones</label>
                  <select value={form.numOpciones} onChange={e => updateNumOpciones(parseInt(e.target.value))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "2px solid #ddd", fontSize: 13, color: "#111" }}>
                    {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} opciones</option>)}
                  </select>
                </div>
              </div>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 8 }}>Opciones</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {form.opciones.map((op, i) => (
                  <input key={i} value={op}
                    onChange={e => {
                      const ops = [...form.opciones]; ops[i] = e.target.value;
                      setForm(f => ({ ...f, opciones: ops }));
                    }}
                    placeholder={`Opción ${i + 1}`}
                    style={{ border: "2px solid #ddd", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", color: "#111" }}
                  />
                ))}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 18 }}>
                <input type="checkbox" checked={form.activa} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Activar inmediatamente (visible para los copropietarios)</span>
              </label>

              {errForm && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{errForm}</p>}
              <button onClick={crearEncuesta} disabled={creando}
                style={{ background: creando ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: creando ? "not-allowed" : "pointer" }}>
                {creando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear encuesta"}
              </button>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
              <h3 style={{ fontWeight: 700, color: "#111", marginBottom: 16, fontSize: 15 }}>Encuestas creadas ({encuestas.length})</h3>
              {encuestas.length === 0 ? (
                <p style={{ color: "#111", fontSize: 13 }}>No hay encuestas aún. Crea la primera arriba.</p>
              ) : (
                encuestas.map(enc => (
                  <div key={enc.id} style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 6px" }}>{enc.pregunta}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, background: enc.activa ? "#f1f8e9" : "#f5f5f5", color: enc.activa ? VERDE : "#888", padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>
                          {enc.activa ? "● Activa" : "○ Inactiva"}
                        </span>
                        <span style={{ fontSize: 11, background: "#f0f0f0", color: "#111", padding: "3px 8px", borderRadius: 20 }}>
                          {enc.tipo === "multiple" ? "Varias respuestas" : "Respuesta única"}
                        </span>
                        <span style={{ fontSize: 11, background: "#f0f0f0", color: "#111", padding: "3px 8px", borderRadius: 20 }}>
                          {enc.opciones?.length} opciones
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => editarEncuesta(enc)}
                        style={{ background: "#f0f4ff", color: "#3b5bdb", border: "1px solid #748ffc", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Editar
                      </button>
                      <button onClick={() => toggleActiva(enc.id, enc.activa)}
                        style={{ background: enc.activa ? "#fff3e0" : "#f1f8e9", color: enc.activa ? NARANJA : VERDE, border: `1px solid ${enc.activa ? NARANJA : VERDE}40`, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {enc.activa ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => eliminar(enc.id)}
                        style={{ background: "#fff5f5", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === "registros" && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {([["residentes", "Residentes"], ["propietarios", "Propietarios"]] as const).map(([t, label]) => (
                  <button key={t} onClick={() => setRegistrosTipo(t)}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: registrosTipo === t ? VERDE : "#f0f0f0", color: registrosTipo === t ? "#fff" : "#555" }}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={exportarRegistrosXLSX} disabled={registrosFiltrados.length === 0}
                style={{ background: registrosFiltrados.length === 0 ? "#9e9e9e" : "#217346", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: registrosFiltrados.length === 0 ? "not-allowed" : "pointer" }}>
                ⬇ Exportar Excel
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {([[false, "Activos"], [true, "Histórico (eliminados)"]] as const).map(([v, label]) => (
                  <button key={String(v)} onClick={() => setVerEliminados(v)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer",
                      background: verEliminados === v ? NARANJA : "#f0f0f0", color: verEliminados === v ? "#fff" : "#555" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>Unidad:</label>
                <select value={filtroUnidad} onChange={e => setFiltroUnidad(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #ddd", fontSize: 12, color: "#111" }}>
                  <option value="">Todas</option>
                  {unidadesDisponibles.map(u => <option key={u} value={u}>{formatUnidad(u)}</option>)}
                </select>
              </div>
            </div>

            <h3 style={{ fontWeight: 700, color: "#111", marginBottom: 16, fontSize: 15 }}>
              {registrosTipo === "residentes" ? "Residentes" : "Propietarios"} {verEliminados ? "eliminados" : "registrados"} ({registrosFiltrados.length})
            </h3>

            {cargandoRegistros ? (
              <p style={{ color: "#111", fontSize: 13 }}>Cargando...</p>
            ) : registrosFiltrados.length === 0 ? (
              <p style={{ color: "#111", fontSize: 13 }}>
                {verEliminados ? "No hay registros eliminados." : "Aún no hay registros en este módulo."}
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      {[
                        "Unidad", "Nombres", "Apellidos", "Documento", "Teléfono", "Edad", "Correo contacto", "Contacto",
                        ...(registrosTipo === "propietarios" ? ["Matrícula", "Dirección", "Ciudad"] : []),
                        "Fecha registro",
                        ...(verEliminados ? [""] : []),
                      ].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#111", fontWeight: 700, borderBottom: "2px solid #e5e5e5" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map(r => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{r.unidad ? formatUnidad(r.unidad) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{r.nombres}</td>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{r.apellidos}</td>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{r.tipo_documento} {r.numero_documento}</td>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{r.telefono || "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{calcularEdad(r.fecha_nacimiento)}</td>
                        <td style={{ padding: "8px 10px", color: "#111" }}>{r.correo_contacto || "—"}</td>
                        <td style={{ padding: "8px 10px", color: r.es_contacto_principal ? NARANJA : "#111", fontWeight: r.es_contacto_principal ? 700 : 400 }}>{r.es_contacto_principal ? "★ Principal" : "—"}</td>
                        {registrosTipo === "propietarios" && (
                          <>
                            <td style={{ padding: "8px 10px", color: "#111" }}>{r.numero_matricula || "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#111" }}>{r.direccion || "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#111" }}>{r.ciudad || "—"}</td>
                          </>
                        )}
                        <td style={{ padding: "8px 10px", color: "#111" }}>{new Date(r.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
                        {verEliminados && (
                          <td style={{ padding: "8px 10px" }}>
                            <button onClick={() => restaurarRegistro(r.id)}
                              style={{ background: "#f1f8e9", color: VERDE, border: `1px solid ${VERDE}40`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              ↺ Restaurar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "contactos" && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {([["residentes", "Residentes"], ["propietarios", "Propietarios"]] as const).map(([t, label]) => (
                <button key={t} onClick={() => setRegistrosTipo(t)}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    background: registrosTipo === t ? VERDE : "#f0f0f0", color: registrosTipo === t ? "#fff" : "#555" }}>
                  {label}
                </button>
              ))}
            </div>

            <h3 style={{ fontWeight: 700, color: "#111", marginBottom: 16, fontSize: 15 }}>
              Titular de comunicaciones · {registrosTipo === "residentes" ? "Residentes" : "Propietarios"}
            </h3>

            {cargandoRegistros ? (
              <p style={{ color: "#111", fontSize: 13 }}>Cargando...</p>
            ) : (
              (() => {
                const titulares = registros.filter(r => r.es_contacto_principal);
                if (titulares.length === 0) {
                  return <p style={{ color: "#111", fontSize: 13 }}>Aún no hay titular de comunicaciones seleccionado para {registrosTipo}.</p>;
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {titulares.map(r => (
                      <div key={r.id} style={{ border: `2px solid ${NARANJA}40`, background: "#fff8f0", borderRadius: 10, padding: "14px 16px" }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: "#111", margin: 0 }}>★ {r.nombres} {r.apellidos}</p>
                        {r.unidad && <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>{formatUnidad(r.unidad)}</p>}
                        <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
                          {r.tipo_documento} {r.numero_documento} · {calcularEdad(r.fecha_nacimiento)} años
                        </p>
                        <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
                          📞 {r.telefono || "—"} · ✉️ {r.correo_contacto || "—"}
                        </p>
                        {registrosTipo === "propietarios" && (r.direccion || r.ciudad || r.numero_matricula) && (
                          <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
                            {[r.direccion, r.ciudad, r.numero_matricula && `Matrícula ${r.numero_matricula}`].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0" }}>Cuenta: {r.correo}</p>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
