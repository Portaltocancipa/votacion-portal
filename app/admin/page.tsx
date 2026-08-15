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

type Seccion = "votaciones" | "registros";
type VotacionesTab = "resultados" | "encuestas";
type RegistrosSubTab = "registros" | "contactos" | "parqueaderos" | "mascotas" | "bicicletas";

const SECCIONES: { key: Seccion; label: string }[] = [
  { key: "votaciones", label: "Votaciones" },
  { key: "registros", label: "Registros" },
];

const VOTACIONES_TABS: { key: VotacionesTab; label: string }[] = [
  { key: "resultados", label: "Resultados" },
  { key: "encuestas", label: "Encuestas" },
];

const REGISTROS_TABS: { key: RegistrosSubTab; label: string }[] = [
  { key: "registros", label: "Registros" },
  { key: "contactos", label: "Contactos" },
  { key: "parqueaderos", label: "Parqueaderos" },
  { key: "mascotas", label: "Mascotas" },
  { key: "bicicletas", label: "Bicicletas" },
];

const tabPillStyle = (activo: boolean) => ({
  padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" as const,
  background: activo ? VERDE : "#fff", color: activo ? "#fff" : "#555", boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
});

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [errorAuth, setErrorAuth] = useState("");
  const [seccion, setSeccion] = useState<Seccion>("votaciones");
  const [votacionesTab, setVotacionesTab] = useState<VotacionesTab>("resultados");
  const [registrosSubTab, setRegistrosSubTab] = useState<RegistrosSubTab>("registros");
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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

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

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 200, flexShrink: 0 }}>
            {SECCIONES.map(s => (
              <button key={s.key} onClick={() => setSeccion(s.key)}
                style={{ textAlign: "left", padding: "13px 18px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  background: seccion === s.key ? VERDE : "#fff", color: seccion === s.key ? "#fff" : "#555", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {seccion === "votaciones" && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {VOTACIONES_TABS.map(t => (
                    <button key={t.key} onClick={() => setVotacionesTab(t.key)} style={tabPillStyle(votacionesTab === t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {votacionesTab === "resultados" && <ResultadosTab adminHeaders={adminHeaders} reloadKey={reloadKey}/>}
                {votacionesTab === "encuestas" && <EncuestasTab adminHeaders={adminHeaders} reloadKey={reloadKey} onCambio={() => setReloadKey(k => k + 1)}/>}
              </>
            )}

            {seccion === "registros" && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {REGISTROS_TABS.map(t => (
                    <button key={t.key} onClick={() => setRegistrosSubTab(t.key)} style={tabPillStyle(registrosSubTab === t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {registrosSubTab === "registros" && <RegistrosTab adminHeaders={adminHeaders} registrosTipo={registrosTipo} setRegistrosTipo={setRegistrosTipo}/>}
                {registrosSubTab === "contactos" && <ContactosTab adminHeaders={adminHeaders} registrosTipo={registrosTipo} setRegistrosTipo={setRegistrosTipo}/>}
                {registrosSubTab === "parqueaderos" && <ParqueaderosTab adminHeaders={adminHeaders}/>}
                {registrosSubTab === "mascotas" && <MascotasTab adminHeaders={adminHeaders}/>}
                {registrosSubTab === "bicicletas" && <BicicletasTab adminHeaders={adminHeaders}/>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
