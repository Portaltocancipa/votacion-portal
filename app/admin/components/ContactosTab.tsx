"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { calcularEdad } from "@/lib/edad";
import { formatUnidad } from "@/lib/unidad";
import ListaAdmin, { ColumnaLista, VERDE } from "./ListaAdmin";
import type { RegistroAdmin } from "./RegistrosTab";

interface Props {
  adminHeaders: () => Record<string, string>;
  registrosTipo: "residentes" | "propietarios";
  setRegistrosTipo: (t: "residentes" | "propietarios") => void;
}

export default function ContactosTab({ adminHeaders, registrosTipo, setRegistrosTipo }: Props) {
  const [registros, setRegistros] = useState<RegistroAdmin[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async (tipo: "residentes" | "propietarios") => {
    setCargando(true);
    const res = await fetch(`/api/admin/registros?tabla=${tipo}&eliminados=false`, { headers: adminHeaders() });
    const data = await res.json();
    setRegistros(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [adminHeaders]);

  useEffect(() => { cargar(registrosTipo); }, [cargar, registrosTipo]);

  const esPropietarios = registrosTipo === "propietarios";
  const titulares = registros.filter(r => r.es_contacto_principal);

  const columnas: ColumnaLista<RegistroAdmin>[] = [
    { header: "#", render: (_r, i) => i + 1 },
    { header: "Unidad", render: r => r.unidad ? formatUnidad(r.unidad) : "—" },
    { header: "Nombres", render: r => <span style={{ fontWeight: 700 }}>{r.nombres}</span> },
    { header: "Apellidos", render: r => <span style={{ fontWeight: 700 }}>{r.apellidos}</span> },
    { header: "Documento", render: r => `${r.tipo_documento} ${r.numero_documento}` },
    { header: "Edad", render: r => calcularEdad(r.fecha_nacimiento) },
    { header: "Teléfono", render: r => r.telefono || "—" },
    { header: "Correo contacto", render: r => r.correo_contacto || "—" },
    { header: "Matrícula", render: r => r.numero_matricula || "—" },
    ...(esPropietarios ? [
      { header: "Dirección", render: (r: RegistroAdmin) => r.direccion || "—" } as ColumnaLista<RegistroAdmin>,
      { header: "Ciudad", render: (r: RegistroAdmin) => r.ciudad || "—" } as ColumnaLista<RegistroAdmin>,
    ] : []),
    { header: "Correo cuenta", render: r => r.correo },
  ];

  const exportarXLSX = () => {
    const filas = titulares.map((r, i) => ({
      "#": i + 1,
      Unidad: r.unidad ? formatUnidad(r.unidad) : "",
      Nombres: r.nombres,
      Apellidos: r.apellidos,
      "Tipo Documento": r.tipo_documento,
      "N° Documento": r.numero_documento,
      Teléfono: r.telefono || "",
      "Correo contacto": r.correo_contacto || "",
      "N° Matrícula": r.numero_matricula || "",
      ...(esPropietarios ? { Dirección: r.direccion || "", Ciudad: r.ciudad || "" } : {}),
      "Correo cuenta": r.correo,
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contactos");
    XLSX.writeFile(wb, `contactos_${registrosTipo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {([["residentes", "Residentes"], ["propietarios", "Propietarios"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setRegistrosTipo(t)}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: registrosTipo === t ? VERDE : "#f0f0f0", color: registrosTipo === t ? "#fff" : "#555" }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={exportarXLSX} disabled={titulares.length === 0}
          style={{ background: titulares.length === 0 ? "#9e9e9e" : "#217346", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: titulares.length === 0 ? "not-allowed" : "pointer" }}>
          Exportar Excel
        </button>
      </div>

      <h3 style={{ fontWeight: 700, color: "#111", marginBottom: 16, fontSize: 15 }}>
        Titular de comunicaciones · {esPropietarios ? "Propietarios" : "Residentes"}
      </h3>

      <ListaAdmin
        filas={titulares}
        columnas={columnas}
        cargando={cargando}
        textoVacio={`Aún no hay titular de comunicaciones seleccionado para ${registrosTipo}.`}
        placeholderBusqueda="Buscar por nombre, documento, correo..."
        buscarTexto={r => `${r.nombres} ${r.apellidos} ${r.numero_documento} ${r.correo} ${r.correo_contacto || ""}`}
      />
    </div>
  );
}
