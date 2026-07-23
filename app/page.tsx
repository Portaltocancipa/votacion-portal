"use client";
import { useState } from "react";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const VERDE_LIGHT = "#2E7D32";

type Fase = "bienvenida" | "encuestas" | "gracias";

interface Votante {
  nombre: string;
  cantidad: number;
  correo: string;
  unidades: string[];
}

interface Encuesta {
  id: string;
  pregunta: string;
  opciones: string[];
  tipo: "unica" | "multiple";
  yaRespondio: boolean;
  seleccion: string[];
  enviando: boolean;
  respondida: boolean;
  error: string;
}

export default function Home() {
  const [correo, setCorreo] = useState("");
  const [token, setToken] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [popup, setPopup] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");
  const [popupVoto, setPopupVoto] = useState(false);
  const [fase, setFase] = useState<Fase>("bienvenida");
  const [votante, setVotante] = useState<Votante | null>(null);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);

  const validar = async () => {
    const c = correo.trim().toLowerCase();
    const t = token.trim();
    if (!c) { setError("Ingresa tu correo electrónico"); return; }
    if (!t) { setError("Ingresa tu token de acceso"); return; }
    setCargando(true); setError("");
    try {
      const res = await fetch("/api/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: c, token: t }),
      });
      const data = await res.json();
      if (!data.encontrado) {
        setPopupMsg("Correo no encontrado. Si tienes inquietudes comunícate con la administradora.");
        setPopup(true);
      } else if (!data.habilitado) {
        setPopupMsg("Usted no está habilitado para votar. Comuníquese con la administradora.");
        setPopup(true);
      } else if (!data.tokenValido) {
        setPopupMsg("Token incorrecto. Verifique el token enviado y vuelva a intentarlo.");
        setPopup(true);
      } else {
        setVotante(data.votante);
        const encRes = await fetch(`/api/encuestas?correo=${encodeURIComponent(c)}`);
        const encData: any[] = await encRes.json();
        const mapped: Encuesta[] = encData.map((e: any) => ({
          ...e,
          seleccion: [],
          enviando: false,
          respondida: e.yaRespondio,
          error: "",
        }));
        setEncuestas(mapped);
        if (mapped.length > 0 && mapped.every(e => e.respondida)) {
          setFase("gracias");
        } else {
          setFase("encuestas");
        }
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setCargando(false);
  };

  const toggleOpcion = (encId: string, op: string, tipo: "unica" | "multiple") => {
    setEncuestas(prev => prev.map(e => {
      if (e.id !== encId) return e;
      if (tipo === "unica") return { ...e, seleccion: [op], error: "" };
      const sel = e.seleccion.includes(op)
        ? e.seleccion.filter(s => s !== op)
        : [...e.seleccion, op];
      return { ...e, seleccion: sel, error: "" };
    }));
  };

  const responder = async (encId: string) => {
    const enc = encuestas.find(e => e.id === encId);
    if (!enc || enc.seleccion.length === 0) {
      setEncuestas(prev => prev.map(e => e.id === encId ? { ...e, error: "Selecciona al menos una opción" } : e));
      return;
    }
    setEncuestas(prev => prev.map(e => e.id === encId ? { ...e, enviando: true, error: "" } : e));
    try {
      const res = await fetch("/api/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: votante?.correo, encuesta_id: encId, opciones_elegidas: enc.seleccion }),
      });
      const data = await res.json();
      if (data.ok) {
        setEncuestas(prev => prev.map(e => e.id === encId ? { ...e, respondida: true, enviando: false } : e));
        setPopupVoto(true);
      } else {
        setEncuestas(prev => prev.map(e => e.id === encId ? { ...e, enviando: false, error: data.error || "Error al enviar" } : e));
      }
    } catch {
      setEncuestas(prev => prev.map(e => e.id === encId ? { ...e, enviando: false, error: "Error de conexión" } : e));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${VERDE} 0%, #2E7D32 50%, #1B5E20 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>

      {popup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: 16, color: "#111", lineHeight: 1.6, marginBottom: 24 }}>{popupMsg}</p>
            <button onClick={() => setPopup(false)} style={{ background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
          </div>
        </div>
      )}

      {popupVoto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "36px 28px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: VERDE, marginBottom: 10 }}>¡Hemos recibido su voto!</h2>
            <p style={{ fontSize: 14, color: "#111", lineHeight: 1.6, marginBottom: 28 }}>
              Su respuesta ha sido registrada exitosamente. Gracias por participar.
            </p>
            <button
              onClick={() => {
                setPopupVoto(false);
                setFase("bienvenida");
                setCorreo("");
                setToken("");
                setVotante(null);
                setEncuestas([]);
              }}
              style={{ background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "13px 40px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              Salir
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", overflow: "hidden" }}>

        <div style={{ background: VERDE, padding: "28px 32px", textAlign: "center", borderBottom: `4px solid ${NARANJA}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            Agrupación El Portal · Tocancipá
          </div>
          <h1 style={{ color: "#fff", fontSize: 21, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
            Bienvenido al sistema de votación del Portal de Tocancipá
          </h1>
          <div style={{ marginTop: 14, background: NARANJA, display: "inline-block", borderRadius: 8, padding: "7px 18px" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
              Encuentre aqui las votaciones de la copropiedad
            </span>
          </div>
        </div>

        <div style={{ padding: "32px 32px 36px" }}>

          {fase === "bienvenida" && (
            <>
              <div style={{ background: "#f1f8e9", border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: "18px 20px", marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: VERDE, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  VALIDADOR DE ACCESO
                </div>
                <p style={{ fontSize: 13, color: "#111", margin: 0 }}>
                  Ingrese su correo y el token de acceso enviado por la administradora para participar en las votaciones.
                </p>
              </div>

              <label style={{ fontSize: 13, fontWeight: 700, color: "#111", display: "block", marginBottom: 8 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={e => { setCorreo(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && validar()}
                placeholder="Ej: copropietario@gmail.com"
                style={{ width: "100%", border: `2px solid ${error ? "#ef4444" : "#ddd"}`, borderRadius: 10, padding: "13px 16px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, color: "#111" }}
              />

              <label style={{ fontSize: 13, fontWeight: 700, color: "#111", display: "block", marginBottom: 8 }}>
                Token de acceso
              </label>
              <input
                type="text"
                value={token}
                onChange={e => { setToken(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && validar()}
                placeholder="Ej: ABC123"
                style={{ width: "100%", border: `2px solid ${error ? "#ef4444" : "#ddd"}`, borderRadius: 10, padding: "13px 16px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8, color: "#111" }}
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

          {fase === "encuestas" && votante && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f8e9", border: `2px solid ${VERDE_LIGHT}`, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: VERDE, margin: "0 0 2px" }}>Hola, {votante.nombre}</p>
                  <p style={{ fontSize: 13, color: "#111", margin: 0 }}>
                    Su voto vale por <strong>{votante.cantidad}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => { setFase("bienvenida"); setCorreo(""); setToken(""); setVotante(null); setEncuestas([]); }}
                  style={{ background: "#fff", color: NARANJA, border: `2px solid ${NARANJA}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  Salir
                </button>
              </div>

              {encuestas.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#111" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                  <p style={{ fontSize: 14 }}>No hay votaciones activas en este momento.</p>
                </div>
              )}

              {encuestas.map(enc => (
                <div key={enc.id} style={{ border: `2px solid ${enc.respondida ? VERDE : "#e5e7eb"}`, borderRadius: 14, padding: "20px", marginBottom: 16, background: enc.respondida ? "#f1f8e9" : "#fff" }}>
                  {enc.respondida ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 30 }}>✅</div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: VERDE, margin: 0 }}>{enc.pregunta}</p>
                        <p style={{ fontSize: 12, color: "#111", margin: "4px 0 0" }}>Ya respondiste esta votación · Gracias</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{enc.pregunta}</p>
                      <p style={{ fontSize: 12, color: "#111", marginBottom: 14 }}>
                        {enc.tipo === "multiple" ? "Puede seleccionar varias opciones" : "Seleccione una opción"}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                        {enc.opciones.map(op => {
                          const sel = enc.seleccion.includes(op);
                          return (
                            <label key={op} onClick={() => toggleOpcion(enc.id, op, enc.tipo)}
                              style={{ display: "flex", alignItems: "center", gap: 10, background: sel ? "#f1f8e9" : "#fafafa", border: `2px solid ${sel ? VERDE : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}>
                              <div style={{
                                width: 18, height: 18,
                                borderRadius: enc.tipo === "multiple" ? 4 : "50%",
                                border: `2px solid ${sel ? VERDE : "#ccc"}`,
                                background: sel ? VERDE : "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                {sel && <div style={{ width: enc.tipo === "multiple" ? 10 : 7, height: enc.tipo === "multiple" ? 10 : 7, borderRadius: enc.tipo === "multiple" ? 2 : "50%", background: "#fff" }} />}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? VERDE : "#444" }}>{op}</span>
                            </label>
                          );
                        })}
                      </div>
                      {enc.error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{enc.error}</p>}
                      <button
                        onClick={() => responder(enc.id)}
                        disabled={enc.enviando || enc.seleccion.length === 0}
                        style={{ width: "100%", background: enc.seleccion.length === 0 || enc.enviando ? "#9e9e9e" : NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 800, cursor: enc.seleccion.length === 0 || enc.enviando ? "not-allowed" : "pointer" }}>
                        {enc.enviando ? "Enviando..." : "Confirmar respuesta"}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </>
          )}

          {fase === "gracias" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: VERDE, marginBottom: 12 }}>¡Gracias por participar!</h2>
              <p style={{ fontSize: 15, color: "#111", lineHeight: 1.6 }}>
                Tus respuestas han sido registradas exitosamente.
              </p>
            </div>
          )}
        </div>

        <div style={{ background: "#f5f5f5", borderTop: "1px solid #eee", padding: "14px 32px", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "#bbb" }}>Agrupación El Portal de Tocancipá · Sistema de votación digital 2026</span>
        </div>
      </div>
    </div>
  );
}
