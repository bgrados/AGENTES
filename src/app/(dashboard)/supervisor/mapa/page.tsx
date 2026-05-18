"use client"

import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

const MapaConDinamico = dynamic(
  () => import("@/components/maps/realtime-map"),
  { ssr: false, loading: () => (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
      <p className="text-sm text-muted-foreground">Cargando mapa...</p>
    </div>
  )}
)

export default function MapaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mapa en Tiempo Real</h1>
        <p className="text-muted-foreground">Ubicación de agentes y cobertura de puestos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Vista General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full rounded-lg border">
            <MapaConDinamico />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
