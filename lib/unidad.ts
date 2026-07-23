// Las unidades vienen del Sheet como código plano, ej: "3202" = Torre 3, Apto 202.
export function formatUnidad(unidad: string): string {
  const limpio = unidad.trim();
  if (!/^\d{3,4}$/.test(limpio)) return limpio;
  const torre = limpio.slice(0, limpio.length - 3);
  const apto = limpio.slice(limpio.length - 3);
  return `Torre ${torre} · Apto ${apto} (${limpio})`;
}
