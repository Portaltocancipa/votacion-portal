"use client";
import { useState } from "react";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const VERDE_LIGHT = "#2E7D32";

const OPCIONES = [
  "Presencial 12 de Julio 8 am",
  "Presencial 19 de Julio 8 am",
  "Virtual 10 de Julio 7 pm",
  "Virtual 15 de Julio 7 pm",
];

type Fase = "bienvenida" | "votacion" | "gracias";

interface Votante {
  nombre: string;
  cantidad: number;
  correo: string;
  unidad: string;
}

export default function Home() {
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [popup, setPopup] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");
  const [fase, setFase] = useState<Fase>("bienvenida");
  const [votante, setVotante] = useState<Votante | null>(null);
  const [opcion, setOpcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const validar = async () => {
    const c = correo.trim().toLowerCase();
    if (!c) { setError("Ingresa tu correo electrónico"); return; }
    setCargando(true); setError("");
    try {
      const res = await fetch("/api/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: c }),
      });
      const data = await res.json();
      if (!data.encontrado) {
        setPopupMsg("Por favor valide su correo. Si tiene inquietudes comuníquese con la administradora.");
        setPopup(true);
      } else if (data.yaVoto) {
        setPopupMsg("Ya registraste tu voto anteriormente. ¡Gracias por participar!");
        setPopup(true);
      } else {
        setVotante(data.votante);
        setFase("votacion");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setCargando(false);
  };

  const votar = async () => {
    if (!opcion) { setError("Selecciona una opción para continuar"); return; }
    setEnviando(true); setError("");
    try {
      const res = await fetch("/api/votar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: votante?.correo, opcion }),
      });
      const data = await res.json();
      if (data.ok) { setFase("gracias"); }
      else { setError(data.error || "Error al registrar el voto"); }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setEnviando(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${VERDE} 0%, #2E7D32 50%, #1B5E20 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>

      {/* POPUP */}
      {popup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: 16, color: "#333", lineHeight: 1.6, marginBottom: 24 }}>{popupMsg}</p>
            <button onClick={() => setPopup(false)} style={{ background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden" }}>

        {/* HEADER */}
        <div style={{ background: VERDE, padding: "28px 32px", textAlign: "center", borderBottom: `4px solid ${NARANJA}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            Agrupación El Portal · Tocancipá
          </div>
          <h1 style={{ color: "#fff", fontSize: 21, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
            Bienvenido al sistema de votación del Portal de Tocancipá
          </h1>
          <div style={{ marginTop: 14, background: NARANJA, display: "inline-block", borderRadius: 8, padding: "7px 18px" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
              Votación — Definición Fecha Asamblea Extraordinaria
            </span>
          </div>
        </div>

        <div style={{ padding: "32px 32px 36px" }}>

          {/* BIENVENIDA + VALIDADOR */}
          {fase === "bienvenida" && (
            <>
              <div style={{ background: "#f1f8e9", border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: "18px 20px", marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: VERDE, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  VALIDADOR DE CORREO ELECTRÓNICO
                </div>
                <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
                  Ingrese su correo sin espacios para verificar su registro en el sistema de votación.
                </p>
              </div>

              <label style={{ fontSize: 13, fontWeight: 700, color: "#444", display: "block", marginBottom: 8 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={e => { setCorreo(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && validar()}
                placeholder="Ej: agrupacionelportal11@gmail.com"
                style={{ width: "100%", border: `2px solid ${error ? "#ef4444" : "#ddd"}`, borderRadius: 10, padding: "13px 16px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

              <button
                onClick={validar}
                disabled={cargando}
                style={{ width: "100%", background: cargando ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 800, cursor: cargando ? "not-allowed" : "pointer", marginTop: 8 }}>
                {cargando ? "Validando..." : "Validar"}
              </button>
            </>
          )}

          {/* VOTACIÓN */}
          {fase === "votacion" && votante && (
            <>
              <div style={{ background: "#f1f8e9", border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
                <p style={{ fontSize: 19, fontWeight: 800, color: VERDE, margin: "0 0 4px" }}>
                  Hola, {votante.nombre}
                </p>
                <p style={{ fontSize: 14, color: "#555", margin: 0 }}>
                  Recuerde que <strong>su voto vale por {votante.cantidad} {votante.cantidad === 1 ? "cuota" : "cuotas"}</strong>.
                </p>
              </div>

              <div style={{ background: "#fff8f0", border: `1px solid ${NARANJA}60`, borderRadius: 10, padding: "11px 16px", marginBottom: 22 }}>
                <p style={{ fontSize: 13, color: NARANJA, margin: 0, fontWeight: 600 }}>
                  📌 Su voto vale por {votante.cantidad} {votante.cantidad === 1 ? "cuota" : "cuotas"}
                </p>
              </div>

              <p style={{ fontSize: 15, fontWeight: 700, color: "#222", marginBottom: 6, lineHeight: 1.5 }}>
                Para usted, ¿cuál es la mejor fecha para realizar la asamblea extraordinaria y modalidad?
              </p>
              <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>Seleccione una opción</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {OPCIONES.map(op => (
                  <label key={op} onClick={() => { setOpcion(op); setError(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, background: opcion === op ? "#f1f8e9" : "#fafafa", border: `2px solid ${opcion === op ? VERDE : "#e5e7eb"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${opcion === op ? VERDE : "#ccc"}`, background: opcion === op ? VERDE : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {opcion === op && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: opcion === op ? 700 : 500, color: opcion === op ? VERDE : "#444" }}>{op}</span>
                  </label>
                ))}
              </div>

              {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

              <button
                onClick={votar}
                disabled={enviando || !opcion}
                style={{ width: "100%", background: !opcion || enviando ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 800, cursor: !opcion || enviando ? "not-allowed" : "pointer" }}>
                {enviando ? "Registrando voto..." : "Confirmar voto"}
              </button>
            </>
          )}

          {/* GRACIAS */}
          {fase === "gracias" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: VERDE, marginBottom: 12 }}>¡Voto registrado!</h2>
              <p style={{ fontSize: 15, color: "#555", lineHeight: 1.6, marginBottom: 8 }}>
                Gracias por participar en la votación de la Asamblea Extraordinaria.
              </p>
              <p style={{ fontSize: 14, color: "#888" }}>
                Tu selección: <strong style={{ color: NARANJA }}>{opcion}</strong>
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ background: "#f5f5f5", borderTop: "1px solid #eee", padding: "14px 32px", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "#bbb" }}>Agrupación El Portal de Tocancipá · Sistema de votación digital 2026</span>
        </div>
      </div>
    </div>
  );
}
