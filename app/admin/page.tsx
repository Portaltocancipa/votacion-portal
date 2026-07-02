"use client";
import { useState, useEffect } from "react";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const ADMIN_KEY = "portal2026";
const BASE_TOTAL = 80;

const OPCIONES = [
  "Presencial 12 de Julio 8 am",
  "Presencial 19 de Julio 8 am",
  "Virtual 10 de Julio 7 pm",
  "Virtual 15 de Julio 7 pm",
];

interface Resultados {
  totalVotantes: number;
  hanVotado: number;
  faltan: number;
  conteo: Record<string, { votos: number; cantidad: number }>;
  detalle: { correo: string; nombre: string; unidad: string; opcion: string; cantidad: number; created_at: string }[];
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [errorAuth, setErrorAuth] = useState("");
  const [datos, setDatos] = useState<Resultados | null>(null);
  const [cargando, setCargando] = useState(false);

  const login = () => {
    if (key === ADMIN_KEY) { setAutenticado(true); setErrorAuth(""); }
    else setErrorAuth("Clave incorrecta");
  };

  const cargar = async () => {
    setCargando(true);
    const res = await fetch(`/api/resultados?key=${ADMIN_KEY}`);
    const data = await res.json();
    setDatos(data);
    setCargando(false);
  };

  useEffect(() => { if (autenticado) cargar(); }, [autenticado]);

  const pct = (v: number) => BASE_TOTAL > 0 ? Math.round((v / BASE_TOTAL) * 100) : 0;

  if (!autenticado) return (
    <div style={{ minHeight: "100vh", background: VERDE, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "36px 32px", maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontWeight: 800, color: VERDE, marginBottom: 4, fontSize: 20 }}>Panel Administrador</h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>Agrupación El Portal · Tocancipá</p>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 8 }}>Clave de acceso</label>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          placeholder="••••••••"
          style={{ width: "100%", border: "2px solid #ddd", borderRadius: 8, padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
        />
        {errorAuth && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{errorAuth}</p>}
        <button onClick={login} style={{ width: "100%", background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>Ingresar</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui", padding: "24px 16px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <div style={{ background: VERDE, borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `4px solid ${NARANJA}` }}>
          <div>
            <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>Panel de Resultados</h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "4px 0 0" }}>Asamblea Extraordinaria · Portal de Tocancipá</p>
          </div>
          <button onClick={cargar} disabled={cargando}
            style={{ background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {cargando ? "Actualizando..." : "↻ Actualizar"}
          </button>
        </div>

        {!datos ? (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Cargando resultados...</div>
        ) : (
          <>
            {/* TARJETAS RESUMEN */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Han votado", value: datos.hanVotado, color: VERDE, bg: "#f1f8e9" },
                { label: "Faltan por votar", value: datos.faltan, color: NARANJA, bg: "#fff8f0" },
                { label: "Base total", value: datos.totalVotantes, color: "#555", bg: "#f9f9f9" },
              ].map(t => (
                <div key={t.label} style={{ background: t.bg, border: `2px solid ${t.color}30`, borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: t.color }}>{t.value}</div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4, fontWeight: 600 }}>{t.label}</div>
                </div>
              ))}
            </div>

            {/* BARRA PROGRESO */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", marginBottom: 24, border: "1px solid #e5e5e5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>Participación</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: VERDE }}>{pct(datos.hanVotado)}%</span>
              </div>
              <div style={{ background: "#e5e7eb", borderRadius: 8, height: 18, overflow: "hidden" }}>
                <div style={{ background: VERDE, width: `${pct(datos.hanVotado)}%`, height: "100%", borderRadius: 8, transition: "width 0.6s ease" }} />
              </div>
              <p style={{ fontSize: 12, color: "#aaa", margin: "8px 0 0" }}>{datos.hanVotado} de {datos.totalVotantes} copropietarios han votado</p>
            </div>

            {/* RESULTADOS POR OPCIÓN */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", marginBottom: 24, border: "1px solid #e5e5e5" }}>
              <h3 style={{ fontWeight: 700, color: "#333", marginBottom: 16, fontSize: 15 }}>Resultados por opción</h3>
              {OPCIONES.map(op => {
                const c = datos.conteo[op] || { votos: 0, cantidad: 0 };
                const p = datos.hanVotado > 0 ? Math.round((c.votos / datos.hanVotado) * 100) : 0;
                return (
                  <div key={op} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{op}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: NARANJA }}>{c.votos} votos · {c.cantidad} cuotas ({p}%)</span>
                    </div>
                    <div style={{ background: "#f0f0f0", borderRadius: 6, height: 12, overflow: "hidden" }}>
                      <div style={{ background: NARANJA, width: `${p}%`, height: "100%", borderRadius: 6, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DETALLE */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #e5e5e5" }}>
              <h3 style={{ fontWeight: 700, color: "#333", marginBottom: 16, fontSize: 15 }}>Detalle de votos ({datos.detalle.length})</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      {["#", "Nombre", "Unidad", "Correo", "Opción", "Cuotas", "Fecha"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#666", fontWeight: 700, borderBottom: "2px solid #e5e5e5" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.detalle.map((v, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "10px 12px", color: "#aaa" }}>{i + 1}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#333" }}>{v.nombre}</td>
                        <td style={{ padding: "10px 12px", color: "#666" }}>{v.unidad}</td>
                        <td style={{ padding: "10px 12px", color: "#666", fontSize: 12 }}>{v.correo}</td>
                        <td style={{ padding: "10px 12px", color: VERDE, fontWeight: 600 }}>{v.opcion}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: NARANJA }}>{v.cantidad}</td>
                        <td style={{ padding: "10px 12px", color: "#aaa", fontSize: 12 }}>{new Date(v.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
