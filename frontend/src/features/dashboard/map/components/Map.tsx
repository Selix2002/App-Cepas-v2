// src/components/map/Map.tsx
import { MapContainer, TileLayer } from "react-leaflet";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./map.css";

import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";
//L.Icon.Default.mergeOptions({ iconRetinaUrl: marker2x, iconUrl: marker, shadowUrl: shadow });

type Props = {
  center?: [number, number];
  zoom?: number;
  markers?: ReactNode;
};

export function Map({ center = [-53.16, -70.91], zoom = 5, markers }: Props) {
  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom doubleClickZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {markers}
      </MapContainer>
    </div>
  );
}
