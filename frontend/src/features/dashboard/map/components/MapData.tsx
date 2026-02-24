// src/components/map/MapData.tsx
import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import { Map } from "./Map";

type Row = {
  id: number | string;
  nombre?: string;
  cod_lab?: string;
  latitud?: number | string | null;
  longitud?: number | string | null;
};

export default function MapData({
  data,
  onPointDblClick,                 // 👈 nuevo
}: {
  data?: Row[];
  onPointDblClick?: (lat: number, lng: number) => void;
}) {
  const toNum = (v: unknown) =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "")
      ? NaN
      : Number(v);

  const points = useMemo(() => {
    if (!data?.length) return [] as {
      id: Row["id"];
      nombre: string;
      cod_lab?: string;
      pos: [number, number];
    }[];
    return data.flatMap((r) => {
      const lat = toNum(r.latitud);
      const lng = toNum(r.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      return [
        {
          id: r.id,
          nombre: r.nombre ?? String(r.id),
          cod_lab: r.cod_lab,
          pos: [lat, lng] as [number, number],
        },
      ];
    });
  }, [data]);

  // === AGRUPACIÓN POR COORDENADAS (misma que ya te propuse) ===
  const grouped = useMemo(() => {
    const map = new globalThis.Map<string, typeof points[0][]>();
    for (const p of points) {
      const key = `${p.pos[0].toFixed(6)},${p.pos[1].toFixed(6)}`; // precisión
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [lat, lng] = key.split(",").map(Number);
      return { key, pos: [lat, lng] as [number, number], items };
    });
  }, [points]);

  const markers = useMemo(
    () =>
      grouped.map((g) => (
        <Marker
          key={g.key}
          position={g.pos}
          eventHandlers={{
            dblclick: () => onPointDblClick?.(g.pos[0], g.pos[1]), // 👈 aquí
          }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">
                {g.items.length} cepa{g.items.length > 1 ? "s" : ""} en este punto
              </div>
              <ul className="mt-1 space-y-1">
                {g.items.slice(0, 10).map((c) => (
                  <li key={c.id}>
                    {c.nombre}
                    {c.cod_lab && (
                      <span className="text-xs text-gray-500"> ({c.cod_lab})</span>
                    )}
                  </li>
                ))}
              </ul>
              {g.items.length > 10 && (
                <div className="text-xs text-gray-400">
                  …y {g.items.length - 10} más
                </div>
              )}
              <div className="text-xs opacity-70 mt-2">
                [{g.pos[0].toFixed(5)}, {g.pos[1].toFixed(5)}]
              </div>
            </div>
          </Popup>
        </Marker>
      )),
    [grouped, onPointDblClick]
  );

  const center: [number, number] = grouped[0]?.pos ?? [-53.16, -70.91];
  return <Map center={center} zoom={grouped.length ? 7 : 4} markers={markers} />;
}
