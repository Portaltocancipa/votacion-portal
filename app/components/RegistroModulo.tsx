"use client";
import { useState, useEffect, useCallback } from "react";
import { calcularEdad, TIPOS_DOCUMENTO } from "@/lib/edad";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const VERDE_LIGHT = "#2E7D32";

interface Registro {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  fecha_nacimiento: string;
}

interface Props {
  tipo: "residentes" | "propietarios";
  titulo: string;
  correo: string;
  onVolver: () => void;
}

const FORM_INIT = { tipo_documento: "", numero_documento: "", nombres: "", apellidos: "", telefono: "", fecha_nacimiento: "" };

const inputStyle = { width: "100%", border: "2px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, color: "#111" };
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 };

export default function RegistroModulo({ tipo, titulo, correo, onVolver }: Props) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verTodos, setVerTodos] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setErrorCarga("");
    try {
      const res = await fetch(`/api/${tipo}?correo=${encodeURIComponent(correo)}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error(data?.error || "No se pudo cargar la información");
      setRegistros(data);
    } catch (e) {
      setErrorCarga(e instanceof Error ? e.message : "No se pudo cargar la información");
    }
    setCargando(false);
  }, [tipo, correo]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!aceptaTratamiento) { setError("Debes aceptar el tratamiento de datos personales para continuar"); return; }
    const faltante = Object.entries(form).find(([k, v]) => k !== "telefono" && !v);
    if (faltante) { setError("Completa todos los campos obligatorios"); return; }

    setGuardando(true); setError("");
    const res = await fetch(`/api/${tipo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, correo }),
    });
    const data = await res.json();
    if (data.id) {
      setForm(FORM_INIT);
      setAceptaTratamiento(false);
      setMostrarForm(false);
      cargar();
    } else {
      setError(data.error || "Error al guardar");
    }
    setGuardando(false);
  };

  const visibles = verTodos ? registros : registros.slice(0, 3);
  const sustantivo = tipo === "residentes" ? "residente" : "propietario";

  return (
    <>
      <button onClick={onVolver} style={{ background: "none", border: "none", color: VERDE, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
        ← Volver al menú
      </button>

      <h2 style={{ fontSize: 18, fontWeight: 800, color: VERDE, marginBottom: 4 }}>{titulo}</h2>
      <p style={{ fontSize: 13, color: "#111", marginBottom: 20 }}>
        Registra y mantén actualizada la información de {tipo === "residentes" ? "las personas que residen en tu unidad" : "los propietarios de tu unidad"}.
      </p>

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
        <p style={{ fontSize: 13, color: "#111", marginBottom: 16 }}>Aún no has registrado a ningún {sustantivo}.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {visibles.map(r => (
            <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>{r.nombres} {r.apellidos}</p>
              <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>
                {r.tipo_documento} {r.numero_documento} · {calcularEdad(r.fecha_nacimiento)} años{r.telefono ? ` · ${r.telefono}` : ""}
              </p>
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
          + Registrar un {sustantivo}
        </button>
      ) : (
        <div style={{ border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Tipo de documento</label>
              <select value={form.tipo_documento} onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value }))} style={inputStyle}>
                <option value="">Selecciona...</option>
                {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Número de documento</label>
              <input value={form.numero_documento} onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))} style={inputStyle}/>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nombres</label>
              <input value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Apellidos</label>
              <input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} style={inputStyle}/>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Fecha de nacimiento</label>
              <input type="date" value={form.fecha_nacimiento} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} style={inputStyle}/>
              {form.fecha_nacimiento && (
                <p style={{ fontSize: 11, color: VERDE, fontWeight: 700, margin: "4px 0 0" }}>{calcularEdad(form.fecha_nacimiento)} años</p>
              )}
            </div>
          </div>

          <div style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#555", lineHeight: 1.6, margin: "0 0 10px" }}>
              Al registrar esta información usted autoriza a la Agrupación El Portal de Tocancipá para el tratamiento
              de los datos personales aquí suministrados, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013,
              con la finalidad exclusiva de actualizar la base de datos de copropietarios y residentes de la
              copropiedad. Estos datos no serán compartidos con terceros distintos a la administración, salvo
              requerimiento de autoridad competente.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={aceptaTratamiento} onChange={e => setAceptaTratamiento(e.target.checked)}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>Acepto el tratamiento de mis datos personales</span>
            </label>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setMostrarForm(false); setForm(FORM_INIT); setAceptaTratamiento(false); setError(""); }}
              style={{ flex: 1, background: "#fff", color: "#555", border: "2px solid #ddd", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ flex: 1, background: guardando ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 800, cursor: guardando ? "not-allowed" : "pointer" }}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
