"use client"

import { useState, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useSupabase } from "@/providers/supabase-provider"
import { useJefeSedes } from "@/hooks/use-jefe-sedes"
import { Badge } from "@/components/ui/badge"

// Fix Leaflet default icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// Custom icons by status
const createIcon = (color: string) =>
  new L.DivIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

const ICONS = {
  activo: createIcon("#22c55e"),   // green
  tardanza: createIcon("#f59e0b"), // amber
  inactivo: createIcon("#ef4444"), // red
}

interface AgentMarker {
  id: string
  nombre: string
  apellido: string
  lat: number
  lng: number
  precision: number
  estado: "activo" | "tardanza" | "inactivo"
  sede: string
  horaRegistro: string
}

interface SedeCircle {
  id: string
  nombre: string
  lat: number
  lng: number
  radio: number
}

export default function RealtimeMap() {
  const { supabase } = useSupabase()
  const { sedeIds, esJefe } = useJefeSedes()
  const [agents, setAgents] = useState<AgentMarker[]>([])
  const [sedes, setSedes] = useState<SedeCircle[]>([])
  const [loading, setLoading] = useState(true)

  const center: [number, number] = [-12.0464, -77.0428] // Lima Centro default

  const fetchData = useCallback(async () => {
    const supabaseAny = supabase as any
    const hoy = new Date().toISOString().split("T")[0]

    // 1. Fetch sedes with coordinates
    let sedesQuery = supabaseAny
      .from("sedes")
      .select("id, nombre, latitud, longitud, radio_gps")
      .eq("activo", true)
      .not("latitud", "is", null)
      .not("longitud", "is", null)

    if (esJefe && sedeIds.length > 0) {
      sedesQuery = sedesQuery.in("id", sedeIds)
    }

    const { data: sedesData } = await sedesQuery
    if (sedesData) {
      setSedes(
        sedesData.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          lat: s.latitud,
          lng: s.longitud,
          radio: s.radio_gps || 100,
        }))
      )
    }

    // 2. Fetch today's attendance with GPS data
    let asistQuery = supabaseAny
      .from("asistencia")
      .select("agente_id, latitud, longitud, gps_precision, fecha_hora, sede_id, agentes(usuarios(nombre, apellido)), sedes(nombre)")
      .gte("fecha_hora", `${hoy}T00:00:00`)
      .lte("fecha_hora", `${hoy}T23:59:59`)
      .order("fecha_hora", { ascending: false })

    if (esJefe && sedeIds.length > 0) {
      asistQuery = asistQuery.in("sede_id", sedeIds)
    }

    const { data: asistencias } = await asistQuery

    if (asistencias) {
      // Deduplicate: keep only latest per agente
      const seen = new Set<string>()
      const markers: AgentMarker[] = []

      for (const a of asistencias) {
        if (seen.has(a.agente_id) || !a.latitud || !a.longitud) continue
        seen.add(a.agente_id)

        const hora = new Date(a.fecha_hora)
        const ahora = new Date()
        const diffMin = (ahora.getTime() - hora.getTime()) / 60000

        markers.push({
          id: a.agente_id,
          nombre: a.agentes?.usuarios?.nombre || "Agente",
          apellido: a.agentes?.usuarios?.apellido || "",
          lat: a.latitud,
          lng: a.longitud,
          precision: a.gps_precision || 0,
          estado: diffMin < 60 ? "activo" : diffMin < 180 ? "tardanza" : "inactivo",
          sede: a.sedes?.nombre || "Sin sede",
          horaRegistro: hora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
        })
      }
      setAgents(markers)
    }

    setLoading(false)
  }, [supabase, esJefe, sedeIds])

  useEffect(() => {
    fetchData()

    // Supabase Realtime subscription
    const channel = (supabase as any)
      .channel("asistencia-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "asistencia" },
        () => {
          fetchData() // Refresh on new attendance
        }
      )
      .subscribe()

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 120_000)

    return () => {
      ;(supabase as any).removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchData, supabase])

  const mapCenter: [number, number] =
    sedes.length > 0 ? [sedes[0].lat, sedes[0].lng] : center

  return (
    <div className="relative h-full w-full">
      {/* Legend */}
      <div className="absolute top-2 right-2 z-[1000] rounded-lg bg-background/90 backdrop-blur-sm p-2 text-xs shadow-md border space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          Activo (&lt;1h)
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          Sin reporte (&lt;3h)
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          Inactivo (&gt;3h)
        </div>
        <div className="pt-1 border-t text-muted-foreground">
          {agents.length} agentes en mapa
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={14}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Sede coverage circles */}
        {sedes.map((sede) => (
          <Circle
            key={sede.id}
            center={[sede.lat, sede.lng]}
            radius={sede.radio}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.08,
              weight: 2,
              dashArray: "6 4",
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{sede.nombre}</p>
                <p className="text-xs text-gray-500">Radio: {sede.radio}m</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Agent markers */}
        {agents.map((agent) => (
          <Marker
            key={agent.id}
            position={[agent.lat, agent.lng]}
            icon={ICONS[agent.estado]}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <p className="font-semibold text-base">{agent.nombre} {agent.apellido}</p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-gray-500">📍 {agent.sede}</p>
                  <p className="text-xs text-gray-500">🕐 Último registro: {agent.horaRegistro}</p>
                  <p className="text-xs text-gray-500">🎯 Precisión: {Math.round(agent.precision)}m</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
