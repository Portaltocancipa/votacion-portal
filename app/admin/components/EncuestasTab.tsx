"use client";
import { useState, useEffect } from "react";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";

interface EncuestaAdmin {
  id: string;
  pregunta: string;
  opciones: string[];
  tipo: string;
  activa: boolean;
  created_at: string;
}

const FORM_INIT = { pregunta: "", numOpciones: 2, opciones: ["", ""], tipo: "unica", activa: true };

interface Props {
  adminHeaders: () => Record<string, string>;
  reloadKey: number;
  onCambio: () => void;
}

export default function EncuestasTab({ adminHeaders, reloadKey, onCambio }: Props) {
  const [encuestas, setEncuestas] = useState<EncuestaAdmin[]>([]);
  const [form, setForm] = useState(FORM_INIT);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [errForm, setErrForm] = useState("");

  const cargarEncuestas = async () => {
    const res = await fetch("/api/admin/encuestas", { headers: adminHeaders() });
    const data = await res.json();
    setEncuestas(Array.isArray(data) ? data : []);
  };

  useEffect(() => { cargarEncuestas(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reloadKey]);

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
      const res = await fetch(`/api/admin/encuestas/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
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
        onCambio();
      } else {
        setErrForm(data.error || "Error al guardar");
      }
    } else {
      const res = await fetch("/api/admin/encuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
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
        onCambio();
      } else {
        setErrForm(data.error || "Error al crear");
      }
    }
    setCreando(false);
  };

  const toggleActiva = async (id: string, activa: boolean) => {
    await fetch(`/api/admin/encuestas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ activa: !activa }),
    });
    cargarEncuestas();
    onCambio();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta encuesta y todas sus respuestas? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/admin/encuestas/${id}`, { method: "DELETE", headers: adminHeaders() });
    cargarEncuestas();
    onCambio();
  };

  return (
    <>
      <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", marginBottom: 20, border: "1px solid #e5e5e5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontWeight: 700, color: "#111", fontSize: 15, margin: 0 }}>
            {editandoId ? "Editar encuesta" : "Nueva encuesta"}
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
  );
}
