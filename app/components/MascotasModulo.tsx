"use client";
import { useState, useEffect, useCallback } from "react";
import { formatUnidad } from "@/lib/unidad";
import { ESPECIES_MASCOTA, TAMANOS_MASCOTA } from "@/lib/mascotas";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const VERDE_LIGHT = "#2E7D32";

interface Mascota {
  id: string;
  unidad: string;
  especie: string;
  nombre: string;
  raza: string;
  edad: string;
  tamano: string;
}

interface Props {
  correo: string;
  unidades: string[];
  token: string;
}

const FORM_INIT = { unidad: "", especie: "", nombre: "", raza: "", edad: "", tamano: "" };
const CAMPOS_REQUERIDOS: (keyof typeof FORM_INIT)[] = ["unidad", "especie", "nombre", "raza", "edad", "tamano"];

const inputStyle = { width: "100%", border: "2px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, color: "#111" };
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 };

export default function MascotasModulo({ correo, unidades, token }: Props) {
  const [registros, setRegistros] = useState<Mascota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verTodos, setVerTodos] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_INIT);
  const [guardando, setGuardando] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [confirmarBorrarId, setConfirmarBorrarId] = useState<string | null>(null);
  const [tokenBorrado, setTokenBorrado] = useState("");
  const [errorBorrado, setErrorBorrado] = useState("");
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setErrorCarga("");
    try {
      const res = await fetch(`/api/mascotas?correo=${encodeURIComponent(correo)}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error(data?.error || "No se pudo cargar la información");
      setRegistros(data);
    } catch (e) {
      setErrorCarga(e instanceof Error ? e.message : "No se pudo cargar la información");
    }
    setCargando(false);
  }, [correo]);

  useEffect(() => { cargar(); }, [cargar]);

  const cancelarForm = () => {
    setMostrarForm(false); setEditandoId(null); setForm(FORM_INIT); setError("");
  };

  const iniciarEdicion = (r: Mascota) => {
    setForm({
      unidad: r.unidad || "", especie: r.especie, nombre: r.nombre.toUpperCase(),
      raza: r.raza.toUpperCase(), edad: r.edad, tamano: r.tamano,
    });
    setEditandoId(r.id);
    setError("");
    setMostrarForm(true);
  };

  const pedirConfirmacionBorrar = (id: string) => {
    setConfirmarBorrarId(id); setTokenBorrado(""); setErrorBorrado("");
  };

  const cancelarBorrado = () => {
    setConfirmarBorrarId(null); setTokenBorrado(""); setErrorBorrado("");
  };

  const confirmarBorrado = async () => {
    if (!confirmarBorrarId) return;
    if (tokenBorrado.trim().toLowerCase() !== token.trim().toLowerCase()) {
      setErrorBorrado("Token incorrecto");
      return;
    }
    setBorrandoId(confirmarBorrarId);
    await fetch(`/api/mascotas/${confirmarBorrarId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo }),
    });
    setBorrandoId(null);
    cancelarBorrado();
    cargar();
  };

  const guardar = async () => {
    const faltante = CAMPOS_REQUERIDOS.find(k => !form[k]);
    if (faltante) { setError("Completa todos los campos obligatorios"); return; }

    setGuardando(true); setError("");
    const url = editandoId ? `/api/mascotas/${editandoId}` : "/api/mascotas";
    const res = await fetch(url, {
      method: editandoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, correo }),
    });
    const data = await res.json();
    if (data.id) {
      cancelarForm();
      cargar();
    } else {
      setError(data.error || "Error al guardar");
    }
    setGuardando(false);
  };

  const visibles = verTodos ? registros : registros.slice(0, 3);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, marginTop: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: VERDE, margin: "0 0 4px" }}>Mascotas</h3>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>Registra las mascotas que viven en tu unidad.</p>

      {cargando ? (
        <p style={{ fontSize: 13, color: "#111" }}>Cargando...</p>
      ) : errorCarga ? (
        <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 8px" }}>{errorCarga}</p>
          <button onClick={cargar} style={{ background: "none", border: "none", color: NARANJA, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}>
            Reintentar
          </button>
        </div>
      ) : registros.length === 0 ? (
        <p style={{ fontSize: 13, color: "#111", marginBottom: 16 }}>Aún no has registrado ninguna mascota.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {visibles.map(r => (
            <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>{r.nombre} — {r.especie}</p>
                <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>
                  {r.raza} · {r.edad} · Tamaño {r.tamano}
                </p>
                {r.unidad && <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>{formatUnidad(r.unidad)}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                <button onClick={() => iniciarEdicion(r)}
                  style={{ background: "#f0f4ff", color: "#3b5bdb", border: "1px solid #748ffc", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Editar
                </button>
                <button onClick={() => pedirConfirmacionBorrar(r.id)} disabled={borrandoId === r.id}
                  style={{ background: "#fff5f5", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: borrandoId === r.id ? "not-allowed" : "pointer" }}>
                  {borrandoId === r.id ? "..." : "Borrar"}
                </button>
              </div>
            </div>
          ))}
          {registros.length > 3 && (
            <button onClick={() => setVerTodos(v => !v)} style={{ background: "none", border: "none", color: NARANJA, fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0 }}>
              {verTodos ? "Ver menos" : `+ Ver ${registros.length - 3} más`}
            </button>
          )}
        </div>
      )}

      {!mostrarForm ? (
        <button onClick={() => setMostrarForm(true)}
          style={{ width: "100%", background: VERDE, color: "#fff", border: "none", borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          + Añadir mascota
        </button>
      ) : (
        <div style={{ border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Unidad</label>
              <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} style={inputStyle}>
                <option value="">Selecciona...</option>
                {unidades.map(u => <option key={u} value={u}>{formatUnidad(u)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Especie</label>
              <select value={form.especie} onChange={e => setForm(f => ({ ...f, especie: e.target.value }))} style={inputStyle}>
                <option value="">Selecciona...</option>
                {ESPECIES_MASCOTA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nombre</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Raza</label>
              <input value={form.raza} onChange={e => setForm(f => ({ ...f, raza: e.target.value.toUpperCase() }))} style={inputStyle}/>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Edad</label>
              <input value={form.edad} onChange={e => setForm(f => ({ ...f, edad: e.target.value }))} style={inputStyle} placeholder="Ej: 2 años"/>
            </div>
            <div>
              <label style={labelStyle}>Tamaño</label>
              <select value={form.tamano} onChange={e => setForm(f => ({ ...f, tamano: e.target.value }))} style={inputStyle}>
                <option value="">Selecciona...</option>
                {TAMANOS_MASCOTA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={cancelarForm}
              style={{ flex: 1, background: "#fff", color: "#555", border: "2px solid #ddd", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ flex: 1, background: guardando ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 800, cursor: guardando ? "not-allowed" : "pointer" }}>
              {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {confirmarBorrarId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 26px", maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>Confirmar borrado</h3>
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5, margin: "0 0 16px" }}>
              Para ejecutar esta acción ingrese el token de acceso.
            </p>
            <input
              type="text"
              value={tokenBorrado}
              onChange={e => { setTokenBorrado(e.target.value); setErrorBorrado(""); }}
              onKeyDown={e => e.key === "Enter" && confirmarBorrado()}
              placeholder="Token de acceso"
              autoFocus
              style={{ width: "100%", border: `2px solid ${errorBorrado ? "#ef4444" : "#ddd"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#111", marginBottom: 8 }}
            />
            {errorBorrado && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 8px" }}>{errorBorrado}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={cancelarBorrado}
                style={{ flex: 1, background: "#fff", color: "#555", border: "2px solid #ddd", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmarBorrado} disabled={borrandoId === confirmarBorrarId}
                style={{ flex: 1, background: borrandoId === confirmarBorrarId ? "#9e9e9e" : "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 800, cursor: borrandoId === confirmarBorrarId ? "not-allowed" : "pointer" }}>
                {borrandoId === confirmarBorrarId ? "Borrando..." : "Borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
