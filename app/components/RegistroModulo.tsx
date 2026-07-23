"use client";
import { useState, useEffect, useCallback } from "react";
import { calcularEdad, TIPOS_DOCUMENTO, TIPOS_DOCUMENTO_SIN_CORREO } from "@/lib/edad";
import { formatUnidad } from "@/lib/unidad";

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
  correo_contacto: string;
  es_contacto_principal: boolean;
  es_titular_arriendo?: boolean;
  unidad: string;
  numero_matricula?: string;
  direccion?: string;
  ciudad?: string;
}

interface Props {
  tipo: "residentes" | "propietarios";
  titulo: string;
  correo: string;
  unidades: string[];
  token: string;
  onVolver: () => void;
}

const FORM_INIT = {
  unidad: "", tipo_documento: "", numero_documento: "", nombres: "", apellidos: "",
  telefono: "", fecha_nacimiento: "", correo_contacto: "",
  numero_matricula: "", direccion: "", ciudad: "",
  es_contacto_principal: false,
  es_titular_arriendo: false,
};

const CAMPOS_REQUERIDOS_COMUNES: (keyof typeof FORM_INIT)[] = ["unidad", "tipo_documento", "numero_documento", "nombres", "apellidos", "telefono", "fecha_nacimiento", "numero_matricula", "ciudad"];
const CAMPOS_REQUERIDOS_PROPIETARIOS: (keyof typeof FORM_INIT)[] = ["direccion"];

const inputStyle = { width: "100%", border: "2px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, color: "#111" };
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 };

export default function RegistroModulo({ tipo, titulo, correo, unidades, token, onVolver }: Props) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verTodos, setVerTodos] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_INIT);
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [confirmarBorrarId, setConfirmarBorrarId] = useState<string | null>(null);
  const [tokenBorrado, setTokenBorrado] = useState("");
  const [errorBorrado, setErrorBorrado] = useState("");
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  const esPropietarios = tipo === "propietarios";
  const sustantivo = esPropietarios ? "propietario" : "residente";

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

  const cancelarForm = () => {
    setMostrarForm(false); setEditandoId(null); setForm(FORM_INIT); setAceptaTratamiento(false); setError("");
  };

  const iniciarEdicion = (r: Registro) => {
    setForm({
      unidad: r.unidad || "",
      tipo_documento: r.tipo_documento, numero_documento: r.numero_documento.toUpperCase(),
      nombres: r.nombres.toUpperCase(), apellidos: r.apellidos.toUpperCase(), telefono: r.telefono || "",
      fecha_nacimiento: r.fecha_nacimiento, correo_contacto: r.correo_contacto || "",
      numero_matricula: (r.numero_matricula || "").toUpperCase(), direccion: (r.direccion || "").toUpperCase(), ciudad: (r.ciudad || "").toUpperCase(),
      es_contacto_principal: !!r.es_contacto_principal,
      es_titular_arriendo: !!r.es_titular_arriendo,
    });
    setEditandoId(r.id);
    setAceptaTratamiento(true);
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
    await fetch(`/api/${tipo}/${confirmarBorrarId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo }),
    });
    setBorrandoId(null);
    cancelarBorrado();
    cargar();
  };

  const necesitaCorreo = !TIPOS_DOCUMENTO_SIN_CORREO.includes(form.tipo_documento);

  const guardar = async () => {
    if (!editandoId && !aceptaTratamiento) { setError("Debes aceptar el tratamiento de datos personales para continuar"); return; }
    const requeridos = [
      ...CAMPOS_REQUERIDOS_COMUNES,
      ...(necesitaCorreo ? (["correo_contacto"] as (keyof typeof FORM_INIT)[]) : []),
      ...(esPropietarios ? CAMPOS_REQUERIDOS_PROPIETARIOS : []),
    ];
    const faltante = requeridos.find(k => !form[k]);
    if (faltante) { setError("Completa todos los campos obligatorios"); return; }

    setGuardando(true); setError("");
    const url = editandoId ? `/api/${tipo}/${editandoId}` : `/api/${tipo}`;
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
    <>
      <button onClick={onVolver} style={{ background: "none", border: "none", color: VERDE, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
        Volver al menú
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
            <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>
                  {r.nombres} {r.apellidos}
                  {r.es_contacto_principal && <span style={{ color: NARANJA }}> · Contacto principal</span>}
                  {r.es_titular_arriendo && <span style={{ color: NARANJA }}> · Titular del Arriendo</span>}
                </p>
                <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>
                  {r.tipo_documento} {r.numero_documento} · {calcularEdad(r.fecha_nacimiento)} años{r.telefono ? ` · ${r.telefono}` : ""}
                </p>
                {r.unidad && <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>{formatUnidad(r.unidad)}</p>}
                {r.correo_contacto && <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>{r.correo_contacto}</p>}
                {(r.direccion || r.ciudad || r.numero_matricula) && (
                  <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
                    {[esPropietarios ? r.direccion : null, r.ciudad, r.numero_matricula && `Matrícula ${r.numero_matricula}`].filter(Boolean).join(" · ")}
                  </p>
                )}
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
          + Registrar un {sustantivo}
        </button>
      ) : (
        <div style={{ border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: VERDE, margin: 0 }}>
              {editandoId ? `Editar ${sustantivo}` : `Nuevo ${sustantivo}`}
            </h3>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Unidad</label>
            <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} style={inputStyle}>
              <option value="">Selecciona...</option>
              {unidades.map(u => <option key={u} value={u}>{formatUnidad(u)}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Tipo de documento</label>
              <select value={form.tipo_documento} onChange={e => {
                const val = e.target.value;
                setForm(f => ({ ...f, tipo_documento: val, correo_contacto: TIPOS_DOCUMENTO_SIN_CORREO.includes(val) ? "" : f.correo_contacto }));
              }} style={inputStyle}>
                <option value="">Selecciona...</option>
                {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Número de documento</label>
              <input value={form.numero_documento} onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value.toUpperCase() }))} style={inputStyle}/>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nombres</label>
              <input value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value.toUpperCase() }))} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Apellidos</label>
              <input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value.toUpperCase() }))} style={inputStyle}/>
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

          {necesitaCorreo && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input type="email" value={form.correo_contacto} onChange={e => setForm(f => ({ ...f, correo_contacto: e.target.value }))} style={inputStyle} placeholder="correo@ejemplo.com"/>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: esPropietarios ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Número de matrícula inmobiliaria</label>
              <input value={form.numero_matricula} onChange={e => setForm(f => ({ ...f, numero_matricula: e.target.value.toUpperCase() }))} style={inputStyle}/>
            </div>
            {esPropietarios && (
              <div>
                <label style={labelStyle}>Dirección</label>
                <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value.toUpperCase() }))} style={inputStyle}/>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Ciudad</label>
            <input value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value.toUpperCase() }))} style={inputStyle} placeholder="TOCANCIPÁ"/>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={form.es_contacto_principal} onChange={e => setForm(f => ({ ...f, es_contacto_principal: e.target.checked }))}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>Es el titular para contacto</span>
          </label>

          {!esPropietarios && necesitaCorreo && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}>
              <input type="checkbox" checked={form.es_titular_arriendo} onChange={e => setForm(f => ({ ...f, es_titular_arriendo: e.target.checked }))}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>Titular del Arriendo</span>
            </label>
          )}

          {!editandoId && (
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
          )}

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
    </>
  );
}
