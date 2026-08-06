"use client";
import { useState, useCallback } from "react";
import ResultadosTab from "./components/ResultadosTab";
import EncuestasTab from "./components/EncuestasTab";
import RegistrosTab from "./components/RegistrosTab";
import ContactosTab from "./components/ContactosTab";
import ParqueaderosTab from "./components/ParqueaderosTab";
import MascotasTab from "./components/MascotasTab";
import BicicletasTab from "./components/BicicletasTab";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";

type Tab = "resultados" | "encuestas" | "registros" | "contactos" | "parqueaderos" | "mascotas" | "bicicletas";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [errorAuth, setErrorAuth] = useState("");
  const [tab, setTab] = useState<Tab>("resultados");
  const [registrosTipo, setRegistrosTipo] = useState<"residentes" | "propietarios">("residentes");
  const [reloadKey, setReloadKey] = useState(0);

  // La clave nunca se guarda hardcodeada en el cliente: es lo que el admin
  // escribió en el login, y el servidor es quien decide si es correcta.
  const adminHeaders = useCallback(() => ({ "x-admin-key": key }), [key]);

  const login = async () => {
    setErrorAuth("");
    try {
      const res = await fetch("/api/admin/encuestas", { headers: adminHeaders() });
      if (res.ok) setAutenticado(true);
      else setErrorAuth("Clave incorrecta");
    } catch {
      setErrorAuth("Error de conexión");
    }
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
          <button onClick={() => setReloadKey(k => k + 1)}
            style={{ background: NARANJA, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Actualizar
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {([["resultados", "Resultados"], ["encuestas", "Encuestas"], ["registros", "Registros"], ["contactos", "Contactos"], ["parqueaderos", "Parqueaderos"], ["mascotas", "Mascotas"], ["bicicletas", "Bicicletas"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
                background: tab === t ? VERDE : "#fff", color: tab === t ? "#fff" : "#555", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "resultados" && <ResultadosTab adminHeaders={adminHeaders} reloadKey={reloadKey}/>}
        {tab === "encuestas" && <EncuestasTab adminHeaders={adminHeaders} reloadKey={reloadKey} onCambio={() => setReloadKey(k => k + 1)}/>}
        {tab === "registros" && <RegistrosTab adminHeaders={adminHeaders} registrosTipo={registrosTipo} setRegistrosTipo={setRegistrosTipo}/>}
        {tab === "contactos" && <ContactosTab adminHeaders={adminHeaders} registrosTipo={registrosTipo} setRegistrosTipo={setRegistrosTipo}/>}
        {tab === "parqueaderos" && <ParqueaderosTab adminHeaders={adminHeaders}/>}
        {tab === "mascotas" && <MascotasTab adminHeaders={adminHeaders}/>}
        {tab === "bicicletas" && <BicicletasTab adminHeaders={adminHeaders}/>}
      </div>
    </div>
  );
}
