"use client"

import { useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Camera, Send, MapPin, Clock, Image } from "lucide-react"
import { REPORTES_NOCHE } from "@/lib/constants"

export default function ReportesPage() {
  const { usuario, isLoading } = useAuthStore()
  const [novedades, setNovedades] = useState("")
  const [horaSeleccionada, setHoraSeleccionada] = useState("")

  if (isLoading) return <LoadingScreen />

  const horas = Object.entries(REPORTES_NOCHE).filter(([hora]) => {
    const h = Number.parseInt(hora.split(":")[0])
    const m = Number.parseInt(hora.split(":")[1])
    const ahora = new Date()
    const horaActual = ahora.getHours()
    const minActual = ahora.getMinutes()
    return h < horaActual || (h === horaActual && m <= minActual)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes Operativos</h1>
        <p className="text-muted-foreground">Registra tus reportes por hora programada</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horas del Turno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(REPORTES_NOCHE).map(([hora, config]) => (
                <Button
                  key={hora}
                  variant={horaSeleccionada === hora ? "default" : "outline"}
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => setHoraSeleccionada(hora)}
                >
                  <span className="text-xs font-bold">{hora}</span>
                  <Badge variant={config.requiere_foto ? "default" : "secondary"} className="text-[10px] px-1 py-0">
                    {config.requiere_foto ? "FOTO" : "TXT"}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {horaSeleccionada ? REPORTES_NOCHE[horaSeleccionada]?.label : "Selecciona una hora"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
              <div className="text-center">
                <Image className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-1 text-xs text-muted-foreground">Foto requerida para esta hora</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Camera className="mr-1 h-4 w-4" /> Cámara
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Image className="mr-1 h-4 w-4" /> Galería
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="novedades">Novedades</Label>
              <Input
                id="novedades"
                placeholder="Describe las novedades operativas..."
                value={novedades}
                onChange={(e) => setNovedades(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> GPS activo
              </span>
              <span className="flex items-center gap-1">
                <Send className="h-3 w-3" /> WhatsApp listo
              </span>
            </div>
            <Button className="w-full" disabled={!horaSeleccionada}>
              Enviar Reporte
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes del Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {horas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay reportes registrados hoy</p>
            ) : (
              horas.map(([hora, config]) => (
                <div key={hora} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{hora}</span>
                    <span className="text-sm text-muted-foreground">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.requiere_foto ? "default" : "secondary"}>
                      {config.requiere_foto ? "Con Foto" : "Sin Foto"}
                    </Badge>
                    <Badge variant="outline">Pendiente</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
