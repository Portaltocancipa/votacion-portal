"use client";

export interface TarjetaResumen {
  label: string;
  value: number | string;
  color?: string;
  bg?: string;
}

const DEFAULT_COLOR = "#111";
const DEFAULT_BG = "#f9f9f9";

export default function TarjetasResumen({ tarjetas }: { tarjetas: TarjetaResumen[] }) {
  if (tarjetas.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${tarjetas.length}, 1fr)`, gap: 14, marginBottom: 18 }}>
      {tarjetas.map(t => (
        <div key={t.label} style={{ background: t.bg || DEFAULT_BG, border: `2px solid ${(t.color || DEFAULT_COLOR)}30`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.color || DEFAULT_COLOR }}>{t.value}</div>
          <div style={{ fontSize: 12, color: "#111", marginTop: 4, fontWeight: 600 }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}
