"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { calcularEdad } from "@/lib/edad";
import { formatUnidad } from "@/lib/unidad";
import ListaAdmin, { ColumnaLista, NARANJA, VERDE } from "./ListaAdmin";
import TarjetasResumen from "./TarjetasResumen";

interface RegistroAdmin {
  id: string;
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  fecha_nacimiento: string;
  correo_contacto: string;
  es_contacto_principal: boolean;
  inmueble_arrendado?: string;
  es_titular_arriendo?: boolean;
  tiene_discapacidad?: string;
  discapacidades?: string[];
  discapacidad_otro?: string;
  unidad?: string;
  eliminado?: boolean;
  numero_matricula?: string;
  direccion?: string;
  ciudad?: string;
  created_at: string;
}

function textoDiscapacidad(r: RegistroAdmin): string {
  if (r.tiene_discapacidad !== "Sí") return "No";
  return [...(r.discapacidades || []).filter(d => d !== "Otra"), r.discapacidad_otro].filter(Boolean).join(", ") || "Sí";
}

interface Props {
  adminHeaders: () => Record<string, string>;
  registrosTipo: "residentes" | "propietarios";
  setRegistrosTipo: (t: "residentes" | "propietarios") => void;
}

export default function RegistrosTab({ adminHeaders, registrosTipo, setRegistrosTipo }: Props) {
  const [registros, setRegistros] = useState<RegistroAdmin[]>([]);
  const [cargando, setCargando] = useState(false);
  const [verEliminados, setVerEliminados] = useState(false);

  const cargar = useCallback(async (tipo: "residentes" | "propietarios", eliminados: boolean) => {
    setCargando(true);
    const res = await fetch(`/api/admin/registros?tabla=${tipo}&eliminados=${eliminados}`, { headers: adminHeaders() });
    const data = await res.json();
    setRegistros(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [adminHeaders]);

  useEffect(() => { cargar(registrosTipo, verEliminados); }, [cargar, registrosTipo, verEliminados]);

  const restaurar = async (id: string) => {
    await fetch(`/api/admin/registros/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ tabla: registrosTipo }),
    });
    cargar(registrosTipo, verEliminados);
  };

  const esPropietarios = registrosTipo === "propietarios";

  const columnas: ColumnaLista<RegistroAdmin>[] = [
    { header: "#", render: (_r, i) => i + 1 },
    { header: "Unidad", render: r => r.unidad ? formatUnidad(r.unidad) : "—" },
    { header: "Nombres", render: r => r.nombres },
    { header: "Apellidos", render: r => r.apellidos },
    { header: "Documento", render: r => `${r.tipo_documento} ${r.numero_documento}` },
    { header: "Teléfono", render: r => r.telefono || "—" },
    { header: "Edad", render: r => calcularEdad(r.fecha_nacimiento) },
    { header: "Correo contacto", render: r => r.correo_contacto || "—" },
    { header: "Contacto", render: r => <span style={{ color: r.es_contacto_principal ? NARANJA : "#111", fontWeight: r.es_contacto_principal ? 700 : 400 }}>{r.es_contacto_principal ? "Principal" : "—"}</span> },
    ...(esPropietarios ? [] : [
      { header: "Inmueble arrendado", render: (r: RegistroAdmin) => r.inmueble_arrendado || "—" } as ColumnaLista<RegistroAdmin>,
      { header: "Titular Arriendo", render: (r: RegistroAdmin) => <span style={{ color: r.es_titular_arriendo ? NARANJA : "#111", fontWeight: r.es_titular_arriendo ? 700 : 400 }}>{r.es_titular_arriendo ? "Sí" : "—"}</span> } as ColumnaLista<RegistroAdmin>,
      { header: "Discapacidad", render: (r: RegistroAdmin) => <span style={{ color: r.tiene_discapacidad === "Sí" ? NARANJA : "#111", fontWeight: r.tiene_discapacidad === "Sí" ? 700 : 400 }}>{r.tiene_discapacidad === "Sí" ? textoDiscapacidad(r) : "—"}</span> } as ColumnaLista<RegistroAdmin>,
    ]),
    { header: "Matrícula", render: r => r.numero_matricula || "—" },
    ...(esPropietarios ? [
      { header: "Dirección", render: (r: RegistroAdmin) => r.direccion || "—" } as ColumnaLista<RegistroAdmin>,
      { header: "Ciudad", render: (r: RegistroAdmin) => r.ciudad || "—" } as ColumnaLista<RegistroAdmin>,
    ] : []),
    { header: "Fecha registro", render: r => new Date(r.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }) },
  ];

  const exportarXLSX = () => {
    const filas = registros.map((r, i) => ({
      "#": i + 1,
      Unidad: r.unidad ? formatUnidad(r.unidad) : "",
      Nombres: r.nombres,
      Apellidos: r.apellidos,
      "Tipo Documento": r.tipo_documento,
      "N° Documento": r.numero_documento,
      Teléfono: r.telefono || "",
      Edad: calcularEdad(r.fecha_nacimiento),
      "Correo contacto": r.correo_contacto || "",
      "Contacto principal": r.es_contacto_principal ? "Sí" : "No",
      ...(esPropietarios ? {} : {
        "Inmueble arrendado": r.inmueble_arrendado || "No",
        "Titular del Arriendo": r.es_titular_arriendo ? "Sí" : "No",
        "Discapacidad": textoDiscapacidad(r),
      }),
      "N° Matrícula": r.numero_matricula || "",
      ...(esPropietarios ? { Dirección: r.direccion || "", Ciudad: r.ciudad || "" } : {}),
      "Correo cuenta": r.correo,
      "Fecha registro": new Date(r.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, registrosTipo);
    XLSX.writeFile(wb, `${registrosTipo}_${verEliminados ? "eliminados_" : ""}${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const conDiscapacidad = registros.filter(r => r.tiene_discapacidad === "Sí").length;
  const arrendados = registros.filter(r => r.inmueble_arrendado === "Sí").length;
  const titulares = registros.filter(r => r.es_contacto_principal).length;

  const resumen = verEliminados ? [] : esPropietarios
    ? [
        { label: "Total propietarios", value: registros.length },
        { label: "Titulares de contacto", value: titulares, color: NARANJA },
      ]
    : [
        { label: "Total residentes", value: registros.length },
        { label: "Con discapacidad", value: conDiscapacidad, color: NARANJA },
        { label: "Inmueble arrendado", value: arrendados, color: VERDE },
        { label: "Titulares de contacto", value: titulares },
      ];

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {([["residentes", "Residentes"], ["propietarios", "Propietarios"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setRegistrosTipo(t)}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: registrosTipo === t ? VERDE : "#f0f0f0", color: registrosTipo === t ? "#fff" : "#555" }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={exportarXLSX} disabled={registros.length === 0}
          style={{ background: registros.length === 0 ? "#9e9e9e" : "#217346", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: registros.length === 0 ? "not-allowed" : "pointer" }}>
          Exportar Excel
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {([[false, "Activos"], [true, "Histórico (eliminados)"]] as const).map(([v, label]) => (
          <button key={String(v)} onClick={() => setVerEliminados(v)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer",
              background: verEliminados === v ? NARANJA : "#f0f0f0", color: verEliminados === v ? "#fff" : "#555" }}>
            {label}
          </button>
        ))}
      </div>

      <TarjetasResumen tarjetas={resumen}/>

      <h3 style={{ fontWeight: 700, color: "#111", marginBottom: 16, fontSize: 15 }}>
        {esPropietarios ? "Propietarios" : "Residentes"} {verEliminados ? "eliminados" : "registrados"} ({registros.length})
      </h3>

      <ListaAdmin
        filas={registros}
        columnas={columnas}
        cargando={cargando}
        textoVacio={verEliminados ? "No hay registros eliminados." : "Aún no hay registros en este módulo."}
        placeholderBusqueda="Buscar por nombre, documento, correo..."
        buscarTexto={r => `${r.nombres} ${r.apellidos} ${r.numero_documento} ${r.correo} ${r.correo_contacto || ""}`}
        verEliminados={verEliminados}
        onRestaurar={restaurar}
      />
    </div>
  );
}

export type { RegistroAdmin };
