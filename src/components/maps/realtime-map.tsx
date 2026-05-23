"use client"

import { useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

interface AgentMarker {
  id: string
  nombre: string
  lat: number
  lng: number
  estado: "activo" | "inactivo" | "alerta"
  ultimoReporte?: string
}

export default function RealtimeMap() {
  const [agents] = useState<AgentMarker[]>([])
  const center: [number, number] = [-12.0464, -77.0428]

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={center}
        radius={500}
        pathOptions={{ color: "blue", fillOpacity: 0.1 }}
      />
      {agents.map((agent) => (
        <Marker key={agent.id} position={[agent.lat, agent.lng]}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{agent.nombre}</p>
              <p className="text-xs text-muted-foreground">{agent.estado}</p>
              {agent.ultimoReporte && (
                <p className="text-xs">{agent.ultimoReporte}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
