"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { formatUnidad } from "@/lib/unidad";
import ListaAdmin, { ColumnaLista, NARANJA } from "./ListaAdmin";
import TarjetasResumen from "./TarjetasResumen";

interface ParqueaderoAdmin {
  id: string;
  correo: string;
  unidad: string;
  numero_parqueadero: string;
  nombres: string;
  apellidos: string;
  placa: string;
  marca: string;
  modelo: string;
  tipo_vehiculo: string;
  eliminado?: boolean;
  created_at: string;
}

export default function ParqueaderosTab({ adminHeaders }: { adminHeaders: () => Record<string, string> }) {
  const [parqueaderos, setParqueaderos] = useState<ParqueaderoAdmin[]>([]);
  const [cargando, setCargando] = useState(false);
  const [verEliminados, setVerEliminados] = useState(false);

  const cargar = useCallback(async (eliminados: boolean) => {
    setCargando(true);
    const res = await fetch(`/api/admin/parqueaderos?eliminados=${eliminados}`, { headers: adminHeaders() });
    const data = await res.json();
    setParqueaderos(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [adminHeaders]);

  useEffect(() => { cargar(verEliminados); }, [cargar, verEliminados]);

  const restaurar = async (id: string) => {
    await fetch(`/api/admin/parqueaderos/${id}`, { method: "PUT", headers: adminHeaders() });
    cargar(verEliminados);
  };

  const columnas: ColumnaLista<ParqueaderoAdmin>[] = [
    { header: "#", render: (_p, i) => i + 1 },
    { header: "Unidad", render: p => p.unidad ? formatUnidad(p.unidad) : "—" },
    { header: "N° Parqueadero", render: p => p.numero_parqueadero },
    { header: "Nombres", render: p => p.nombres },
    { header: "Apellidos", render: p => p.apellidos },
    { header: "Tipo", render: p => p.tipo_vehiculo },
    { header: "Placa", render: p => <span style={{ fontWeight: 700 }}>{p.placa}</span> },
    { header: "Marca", render: p => p.marca },
    { header: "Modelo", render: p => p.modelo },
    { header: "Fecha registro", render: p => new Date(p.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }) },
  ];

  const exportarXLSX = () => {
    const filas = parqueaderos.map((p, i) => ({
      "#": i + 1,
      Unidad: p.unidad ? formatUnidad(p.unidad) : "",
      "N° Parqueadero": p.numero_parqueadero,
      Nombres: p.nombres,
      Apellidos: p.apellidos,
      Tipo: p.tipo_vehiculo,
      Placa: p.placa,
      Marca: p.marca,
      Modelo: p.modelo,
      "Correo cuenta": p.correo,
      "Fecha registro": new Date(p.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parqueaderos");
    XLSX.writeFile(wb, `parqueaderos_${verEliminados ? "eliminados_" : ""}${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const porTipo = parqueaderos.reduce<Record<string, number>>((acc, p) => {
    const t = p.tipo_vehiculo || "Sin especificar";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const resumen = verEliminados ? [] : [
    { label: "Total vehículos", value: parqueaderos.length },
    ...Object.entries(porTipo).map(([tipo, n]) => ({ label: tipo, value: n, color: NARANJA })),
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontWeight: 700, color: "#111", margin: 0, fontSize: 15 }}>
          Vehículos {verEliminados ? "eliminados" : "registrados"} ({parqueaderos.length})
        </h3>
        <button onClick={exportarXLSX} disabled={parqueaderos.length === 0}
          style={{ background: parqueaderos.length === 0 ? "#9e9e9e" : "#217346", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: parqueaderos.length === 0 ? "not-allowed" : "pointer" }}>
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
        filas={parqueaderos}
        columnas={columnas}
        cargando={cargando}
        textoVacio={verEliminados ? "No hay registros eliminados." : "Aún no hay vehículos registrados."}
        placeholderBusqueda="Buscar por placa, nombre, marca..."
        buscarTexto={p => `${p.nombres} ${p.apellidos} ${p.placa} ${p.marca} ${p.modelo} ${p.numero_parqueadero}`}
        verEliminados={verEliminados}
        onRestaurar={restaurar}
      />
    </div>
  );
}
