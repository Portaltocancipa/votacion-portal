"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { formatUnidad } from "@/lib/unidad";
import ListaAdmin, { ColumnaLista, NARANJA } from "./ListaAdmin";
import TarjetasResumen from "./TarjetasResumen";

interface MascotaAdmin {
  id: string;
  correo: string;
  unidad: string;
  especie: string;
  nombre: string;
  raza: string;
  edad: string;
  tamano: string;
  eliminado?: boolean;
  created_at: string;
}

export default function MascotasTab({ adminHeaders }: { adminHeaders: () => Record<string, string> }) {
  const [mascotas, setMascotas] = useState<MascotaAdmin[]>([]);
  const [cargando, setCargando] = useState(false);
  const [verEliminados, setVerEliminados] = useState(false);

  const cargar = useCallback(async (eliminados: boolean) => {
    setCargando(true);
    const res = await fetch(`/api/admin/mascotas?eliminados=${eliminados}`, { headers: adminHeaders() });
    const data = await res.json();
    setMascotas(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [adminHeaders]);

  useEffect(() => { cargar(verEliminados); }, [cargar, verEliminados]);

  const restaurar = async (id: string) => {
    await fetch(`/api/admin/mascotas/${id}`, { method: "PUT", headers: adminHeaders() });
    cargar(verEliminados);
  };

  const columnas: ColumnaLista<MascotaAdmin>[] = [
    { header: "#", render: (_m, i) => i + 1 },
    { header: "Unidad", render: m => m.unidad ? formatUnidad(m.unidad) : "—" },
    { header: "Especie", render: m => m.especie },
    { header: "Nombre", render: m => <span style={{ fontWeight: 700 }}>{m.nombre}</span> },
    { header: "Raza", render: m => m.raza },
    { header: "Edad", render: m => m.edad },
    { header: "Tamaño", render: m => m.tamano },
    { header: "Fecha registro", render: m => new Date(m.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }) },
  ];

  const exportarXLSX = () => {
    const filas = mascotas.map((m, i) => ({
      "#": i + 1,
      Unidad: m.unidad ? formatUnidad(m.unidad) : "",
      Especie: m.especie,
      Nombre: m.nombre,
      Raza: m.raza,
      Edad: m.edad,
      Tamaño: m.tamano,
      "Correo cuenta": m.correo,
      "Fecha registro": new Date(m.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mascotas");
    XLSX.writeFile(wb, `mascotas_${verEliminados ? "eliminados_" : ""}${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const porEspecie = mascotas.reduce<Record<string, number>>((acc, m) => {
    const e = m.especie || "Sin especificar";
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});
  const resumen = verEliminados ? [] : [
    { label: "Total mascotas", value: mascotas.length },
    ...Object.entries(porEspecie).map(([especie, n]) => ({ label: especie, value: n, color: NARANJA })),
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontWeight: 700, color: "#111", margin: 0, fontSize: 15 }}>
          Mascotas {verEliminados ? "eliminadas" : "registradas"} ({mascotas.length})
        </h3>
        <button onClick={exportarXLSX} disabled={mascotas.length === 0}
          style={{ background: mascotas.length === 0 ? "#9e9e9e" : "#217346", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: mascotas.length === 0 ? "not-allowed" : "pointer" }}>
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
        filas={mascotas}
        columnas={columnas}
        cargando={cargando}
        textoVacio={verEliminados ? "No hay registros eliminados." : "Aún no hay mascotas registradas."}
        placeholderBusqueda="Buscar por nombre, especie, raza..."
        buscarTexto={m => `${m.nombre} ${m.especie} ${m.raza}`}
        verEliminados={verEliminados}
        onRestaurar={restaurar}
      />
    </div>
  );
}
