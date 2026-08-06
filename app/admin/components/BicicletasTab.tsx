"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { formatUnidad } from "@/lib/unidad";
import ListaAdmin, { ColumnaLista, NARANJA, VERDE } from "./ListaAdmin";
import TarjetasResumen from "./TarjetasResumen";

interface BicicletaAdmin {
  id: string;
  correo: string;
  unidad: string;
  color: string;
  marca: string;
  en_bicicletero: string;
  numero_asignado?: string;
  eliminado?: boolean;
  created_at: string;
}

export default function BicicletasTab({ adminHeaders }: { adminHeaders: () => Record<string, string> }) {
  const [bicicletas, setBicicletas] = useState<BicicletaAdmin[]>([]);
  const [cargando, setCargando] = useState(false);
  const [verEliminados, setVerEliminados] = useState(false);

  const cargar = useCallback(async (eliminados: boolean) => {
    setCargando(true);
    const res = await fetch(`/api/admin/bicicletas?eliminados=${eliminados}`, { headers: adminHeaders() });
    const data = await res.json();
    setBicicletas(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [adminHeaders]);

  useEffect(() => { cargar(verEliminados); }, [cargar, verEliminados]);

  const restaurar = async (id: string) => {
    await fetch(`/api/admin/bicicletas/${id}`, { method: "PUT", headers: adminHeaders() });
    cargar(verEliminados);
  };

  const columnas: ColumnaLista<BicicletaAdmin>[] = [
    { header: "#", render: (_b, i) => i + 1 },
    { header: "Unidad", render: b => b.unidad ? formatUnidad(b.unidad) : "—" },
    { header: "Color", render: b => b.color },
    { header: "Marca", render: b => <span style={{ fontWeight: 700 }}>{b.marca}</span> },
    { header: "En bicicletero", render: b => b.en_bicicletero },
    { header: "N° Asignado", render: b => b.numero_asignado || "—" },
    { header: "Fecha registro", render: b => new Date(b.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }) },
  ];

  const exportarXLSX = () => {
    const filas = bicicletas.map((b, i) => ({
      "#": i + 1,
      Unidad: b.unidad ? formatUnidad(b.unidad) : "",
      Color: b.color,
      Marca: b.marca,
      "En bicicletero": b.en_bicicletero,
      "N° Asignado": b.numero_asignado || "",
      "Correo cuenta": b.correo,
      "Fecha registro": new Date(b.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bicicletas");
    XLSX.writeFile(wb, `bicicletas_${verEliminados ? "eliminados_" : ""}${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const enBicicletero = bicicletas.filter(b => b.en_bicicletero === "Sí").length;
  const resumen = verEliminados ? [] : [
    { label: "Total bicicletas", value: bicicletas.length },
    { label: "En bicicletero", value: enBicicletero, color: VERDE },
    { label: "Fuera del bicicletero", value: bicicletas.length - enBicicletero, color: NARANJA },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontWeight: 700, color: "#111", margin: 0, fontSize: 15 }}>
          Bicicletas {verEliminados ? "eliminadas" : "registradas"} ({bicicletas.length})
        </h3>
        <button onClick={exportarXLSX} disabled={bicicletas.length === 0}
          style={{ background: bicicletas.length === 0 ? "#9e9e9e" : "#217346", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: bicicletas.length === 0 ? "not-allowed" : "pointer" }}>
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

      <ListaAdmin
        filas={bicicletas}
        columnas={columnas}
        cargando={cargando}
        textoVacio={verEliminados ? "No hay registros eliminados." : "Aún no hay bicicletas registradas."}
        placeholderBusqueda="Buscar por color, marca..."
        buscarTexto={b => `${b.color} ${b.marca} ${b.numero_asignado || ""}`}
        verEliminados={verEliminados}
        onRestaurar={restaurar}
      />
    </div>
  );
}
