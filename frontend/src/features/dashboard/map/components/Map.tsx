// src/components/map/Map.tsx
import { MapContainer, TileLayer } from "react-leaflet";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix iconos Leaflet con bundlers
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: marker2x, iconUrl: marker, shadowUrl: shadow });

type Props = {
  /** Centro inicial [lat, lng] (Leaflet usa lat,lng) */
  center?: [number, number];
  /** Zoom inicial */
  zoom?: number;
  /** Marcadores u otras capas listas para renderizar */
  markers?: ReactNode;
};

export function Map({ center = [-53.16, -70.91], zoom = 5, markers }: Props) {
  return (
    <div className="h-full w-full">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom doubleClickZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {markers /* ← vienen desde MapData */}
      </MapContainer>
    </div>
  );
}
