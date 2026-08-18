"use client";
import { useState, useEffect, useCallback } from "react";
import { formatUnidad } from "@/lib/unidad";
import { esDomingoOFestivo, rangoHorarioPermitido } from "@/lib/festivosColombia";
import PreregistroNota from "./PreregistroNota";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const VERDE_LIGHT = "#2E7D32";

interface Mudanza {
  id: string;
  numero: number;
  unidad: string;
  tipo_formato: "A" | "B";
  tipo_movimiento: "ingreso" | "salida";
  es_propietario: boolean;
  fecha_mudanza: string;
  hora_inicio: string;
  created_at: string;
}

interface Props {
  correo: string;
  unidades: string[];
  token: string;
  onVolver: () => void;
}

const TIPOS_FORMATO: { valor: "A" | "B"; label: string; detalle: string }[] = [
  { valor: "A", label: "Tipo A — Mudanza / Trasteo", detalle: "Entrada o salida completa (o parcial) de menaje del inmueble" },
  { valor: "B", label: "Tipo B — Objeto grande o electrodoméstico", detalle: "Salida o ingreso puntual de un objeto (nevera, lavadora, muebles, etc.), sin ser mudanza" },
];

const FORM_INIT = {
  unidad: "",
  tipo_formato: "" as "" | "A" | "B",
  tipo_movimiento: "" as "" | "ingreso" | "salida",
  es_propietario: "" as "" | "si" | "no",
  fecha_mudanza: "",
  hora_inicio: "",
};

const inputStyle = { width: "100%", border: "2px solid #ddd", borderRadius: 10, padding: "11px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, color: "#111" };
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 6 };

const formatoNumero = (n: number) => `MUD-${String(n).padStart(4, "0")}`;

export default function MudanzaModulo({ correo, unidades, token, onVolver }: Props) {
  const [registros, setRegistros] = useState<Mudanza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ultimoCreado, setUltimoCreado] = useState<Mudanza | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true); setErrorCarga("");
    try {
      const res = await fetch(`/api/mudanzas?correo=${encodeURIComponent(correo)}`);
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
    setMostrarForm(false); setForm(FORM_INIT); setAceptaTratamiento(false); setError("");
  };

  const guardar = async () => {
    if (!aceptaTratamiento) { setError("Debes aceptar el tratamiento de datos personales para continuar"); return; }
    if (!form.unidad) { setError("Selecciona la unidad"); return; }
    if (!form.tipo_formato) { setError("Selecciona el tipo de formato"); return; }
    if (!form.tipo_movimiento) { setError("Selecciona si es ingreso o salida"); return; }
    if (!form.es_propietario) { setError("Indica si eres el propietario"); return; }
    if (!form.fecha_mudanza) { setError("Indica la fecha de la mudanza"); return; }
    if (esDomingoOFestivo(form.fecha_mudanza)) { setError("No se permiten mudanzas los domingos ni festivos. Elige otro día."); return; }
    if (!form.hora_inicio) { setError("Indica la hora de inicio de la mudanza"); return; }
    const rango = rangoHorarioPermitido(form.fecha_mudanza);
    if (form.hora_inicio < rango.min || form.hora_inicio > rango.max) {
      setError(`La hora de inicio debe estar entre ${rango.min} y ${rango.max}`);
      return;
    }

    setGuardando(true); setError("");
    const res = await fetch("/api/mudanzas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo,
        token,
        unidad: form.unidad,
        tipo_formato: form.tipo_formato,
        tipo_movimiento: form.tipo_movimiento,
        es_propietario: form.es_propietario === "si",
        fecha_mudanza: form.fecha_mudanza,
        hora_inicio: form.hora_inicio,
      }),
    });
    const data = await res.json();
    if (data.id) {
      setUltimoCreado(data);
      cancelarForm();
      cargar();
    } else {
      setError(data.error || "Error al guardar");
    }
    setGuardando(false);
  };

  return (
    <>
      <button onClick={onVolver} style={{ background: "none", border: "none", color: VERDE, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
        Volver al menú
      </button>

      <h2 style={{ fontSize: 18, fontWeight: 800, color: VERDE, marginBottom: 4 }}>Mudanza / Trasteo</h2>
      <p style={{ fontSize: 13, color: "#111", marginBottom: 12 }}>
        Preregistra tu mudanza, trasteo o salida/ingreso de un objeto grande para obtener tu número de autorización.
      </p>

      <PreregistroNota/>

      {ultimoCreado && (
        <div style={{ background: "#f1f8e9", border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: VERDE, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
            Preregistro generado
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: VERDE, margin: "0 0 8px" }}>
            {formatoNumero(ultimoCreado.numero)}
          </p>
          <p style={{ fontSize: 13, color: "#111", margin: 0, lineHeight: 1.5 }}>
            Guarda este número. Administración lo usará para preparar tu formato de autorización, que deberás completar, firmar y radicar.
          </p>
          <button onClick={() => setUltimoCreado(null)} style={{ background: "none", border: "none", color: NARANJA, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 10 }}>
            Cerrar
          </button>
        </div>
      )}

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
        <p style={{ fontSize: 13, color: "#111", marginBottom: 16 }}>Aún no has preregistrado ninguna mudanza.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {registros.map(r => (
            <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: VERDE, margin: 0 }}>
                {formatoNumero(r.numero)}
              </p>
              <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>
                {TIPOS_FORMATO.find(t => t.valor === r.tipo_formato)?.label} · {r.tipo_movimiento === "ingreso" ? "Ingreso" : "Salida"} · {formatUnidad(r.unidad)}
              </p>
              <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
                Fecha de mudanza: {r.fecha_mudanza} · Hora de inicio: {r.hora_inicio?.slice(0, 5) || "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {!mostrarForm ? (
        <button onClick={() => setMostrarForm(true)}
          style={{ width: "100%", background: VERDE, color: "#fff", border: "none", borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          + Nuevo preregistro
        </button>
      ) : (
        <div style={{ border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: VERDE, margin: "0 0 14px" }}>Nuevo preregistro</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Unidad</label>
              <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} style={inputStyle}>
                <option value="">Selecciona...</option>
                {unidades.map(u => <option key={u} value={u}>{formatUnidad(u)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fecha de la mudanza</label>
              <input type="date" value={form.fecha_mudanza} onChange={e => {
                const val = e.target.value;
                if (val && esDomingoOFestivo(val)) {
                  setError("No se permiten mudanzas los domingos ni festivos. Elige otro día.");
                  return;
                }
                setError("");
                setForm(f => ({ ...f, fecha_mudanza: val, hora_inicio: "" }));
              }} style={inputStyle}/>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Hora de inicio de la mudanza</label>
            <input type="time" value={form.hora_inicio} disabled={!form.fecha_mudanza}
              min={rangoHorarioPermitido(form.fecha_mudanza).min} max={rangoHorarioPermitido(form.fecha_mudanza).max}
              onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
              style={{ ...inputStyle, opacity: form.fecha_mudanza ? 1 : 0.6 }}/>
            <p style={{ fontSize: 11, color: "#666", margin: "6px 0 0" }}>
              {form.fecha_mudanza
                ? `Horario permitido: ${rangoHorarioPermitido(form.fecha_mudanza).min} a ${rangoHorarioPermitido(form.fecha_mudanza).max}`
                : "Selecciona primero la fecha"}
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Tipo de formato</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TIPOS_FORMATO.map(t => (
                <label key={t.valor} onClick={() => setForm(f => ({ ...f, tipo_formato: t.valor }))}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, background: form.tipo_formato === t.valor ? "#f1f8e9" : "#fafafa", border: `2px solid ${form.tipo_formato === t.valor ? VERDE : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.tipo_formato === t.valor ? VERDE : "#ccc"}`, background: form.tipo_formato === t.valor ? VERDE : "#fff", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {form.tipo_formato === t.valor && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#111", margin: 0 }}>{t.label}</p>
                    <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>{t.detalle}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Tipo de movimiento</label>
              <select value={form.tipo_movimiento} onChange={e => setForm(f => ({ ...f, tipo_movimiento: e.target.value as "" | "ingreso" | "salida" }))} style={inputStyle}>
                <option value="">Selecciona...</option>
                <option value="ingreso">Ingreso</option>
                <option value="salida">Salida</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>¿Eres el propietario?</label>
              <select value={form.es_propietario} onChange={e => setForm(f => ({ ...f, es_propietario: e.target.value as "" | "si" | "no" }))} style={inputStyle}>
                <option value="">Selecciona...</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#555", lineHeight: 1.6, margin: "0 0 10px" }}>
              Al registrar esta información usted autoriza a la Agrupación El Portal de Tocancipá para el tratamiento
              de los datos personales aquí suministrados, conforme a la Ley 1581 de 2012, con la finalidad exclusiva
              de gestionar la autorización de mudanza/trasteo y el control de seguridad de la copropiedad.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={aceptaTratamiento} onChange={e => setAceptaTratamiento(e.target.checked)}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>Acepto el tratamiento de mis datos personales</span>
            </label>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={cancelarForm}
              style={{ flex: 1, background: "#fff", color: "#555", border: "2px solid #ddd", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ flex: 1, background: guardando ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 800, cursor: guardando ? "not-allowed" : "pointer" }}>
              {guardando ? "Guardando..." : "Generar preregistro"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
