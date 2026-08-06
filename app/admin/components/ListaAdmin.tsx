"use client";
import { useState, useMemo, useEffect, ReactNode } from "react";
import { formatUnidad } from "@/lib/unidad";

const VERDE = "#1B5E20";
const NARANJA = "#E65100";
const POR_PAGINA = 25;

export interface ColumnaLista<T> {
  header: string;
  render: (fila: T, indice: number) => ReactNode;
}

interface FilaBase {
  id: string;
  unidad?: string;
}

interface Props<T extends FilaBase> {
  filas: T[];
  columnas: ColumnaLista<T>[];
  cargando: boolean;
  textoVacio: string;
  buscarTexto: (fila: T) => string;
  placeholderBusqueda?: string;
  conFiltroUnidad?: boolean;
  verEliminados?: boolean;
  onRestaurar?: (id: string) => void;
  extraAcciones?: ReactNode;
}

// Tabla reutilizable con búsqueda de texto libre, filtro por unidad y
// paginación. La usan registros/contactos/parqueaderos/mascotas/bicicletas
// para no repetir la misma lógica 5 veces (antes de esto, cada pestaña tenía
// su propia copia casi idéntica de este bloque).
export default function ListaAdmin<T extends FilaBase>({
  filas, columnas, cargando, textoVacio, buscarTexto, placeholderBusqueda = "Buscar...",
  conFiltroUnidad = true, verEliminados, onRestaurar, extraAcciones,
}: Props<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => { setPagina(1); }, [busqueda, filtroUnidad, filas]);

  const unidadesDisponibles = useMemo(() =>
    Array.from(new Set(filas.map(f => f.unidad).filter((u): u is string => !!u)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [filas]
  );

  const filtradas = useMemo(() => {
    let r = filas;
    if (filtroUnidad) r = r.filter(f => f.unidad === filtroUnidad);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      r = r.filter(f => buscarTexto(f).toLowerCase().includes(q));
    }
    return r;
  }, [filas, filtroUnidad, busqueda, buscarTexto]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={placeholderBusqueda}
          style={{ flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 8, border: "2px solid #ddd", fontSize: 13, color: "#111", outline: "none" }}
        />
        {conFiltroUnidad && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>Unidad:</label>
            <select value={filtroUnidad} onChange={e => setFiltroUnidad(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #ddd", fontSize: 12, color: "#111" }}>
              <option value="">Todas</option>
              {unidadesDisponibles.map(u => <option key={u} value={u}>{formatUnidad(u)}</option>)}
            </select>
          </div>
        )}
        {extraAcciones}
      </div>

      {cargando ? (
        <p style={{ color: "#111", fontSize: 13 }}>Cargando...</p>
      ) : filtradas.length === 0 ? (
        <p style={{ color: "#111", fontSize: 13 }}>
          {filas.length === 0 ? textoVacio : "Ningún registro coincide con la búsqueda."}
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f9f9f9" }}>
                  {columnas.map(c => (
                    <th key={c.header} style={{ padding: "8px 10px", textAlign: "left", color: "#111", fontWeight: 700, borderBottom: "2px solid #e5e5e5" }}>{c.header}</th>
                  ))}
                  {verEliminados && <th style={{ padding: "8px 10px", borderBottom: "2px solid #e5e5e5" }} />}
                </tr>
              </thead>
              <tbody>
                {visibles.map((fila, i) => (
                  <tr key={fila.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    {columnas.map(c => (
                      <td key={c.header} style={{ padding: "8px 10px", color: "#111" }}>
                        {c.render(fila, (paginaSegura - 1) * POR_PAGINA + i)}
                      </td>
                    ))}
                    {verEliminados && onRestaurar && (
                      <td style={{ padding: "8px 10px" }}>
                        <button onClick={() => onRestaurar(fila.id)}
                          style={{ background: "#f1f8e9", color: VERDE, border: `1px solid ${VERDE}40`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Restaurar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaSegura === 1}
                style={{ background: "#fff", border: "2px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: paginaSegura === 1 ? "#bbb" : "#111", cursor: paginaSegura === 1 ? "not-allowed" : "pointer" }}>
                Anterior
              </button>
              <span style={{ fontSize: 12, color: "#111", fontWeight: 600 }}>
                Página {paginaSegura} de {totalPaginas} · {filtradas.length} resultado(s)
              </span>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaSegura === totalPaginas}
                style={{ background: "#fff", border: "2px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: paginaSegura === totalPaginas ? "#bbb" : "#111", cursor: paginaSegura === totalPaginas ? "not-allowed" : "pointer" }}>
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export { NARANJA, VERDE };
