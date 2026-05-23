"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSupabase } from "@/providers/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Camera, Send, MapPin, Clock, FileText, Sun, Moon } from "lucide-react"
import { REPORTES_DIA, REPORTES_NOCHE } from "@/lib/constants"
import { PhotoCapture } from "@/components/camera/photo-capture"

interface GrupoReporte {
  id: string
  label: string
  descripcion: string
  icon: typeof Clock
  horas: string[]
  requiere_foto: boolean
  requiere_novedades: boolean
  color: "default" | "secondary" | "outline"
}

export default function ReportesPage() {
  const { usuario, isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const [novedades, setNovedades] = useState("")
  const [horaSeleccionada, setHoraSeleccionada] = useState("")
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [turno, setTurno] = useState<"dia" | "noche">("noche")
  const [cargandoTurno, setCargandoTurno] = useState(true)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    if (!usuario) return
    ;(async () => {
      const supabaseAny = supabase as any
      const { data: agente } = await supabaseAny.from("agentes").select("turno_asignado").eq("usuario_id", usuario.id).maybeSingle()
      if (agente?.turno_asignado) setTurno(agente.turno_asignado)
      setCargandoTurno(false)
    })()
  }, [usuario])

  if (isLoading || cargandoTurno) return <LoadingScreen />

  const REPORTES = turno === "dia" ? REPORTES_DIA : REPORTES_NOCHE

  const rangoGpos = turno === "dia"
    ? [
        { id: "ingreso", label: "Ingreso", descripcion: "Registro de ingreso al turno", icon: Sun as typeof Clock, horas: ["07:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
        { id: "relevo", label: "Relevo", descripcion: "Registro de salida y relevo", icon: Moon as typeof Clock, horas: ["19:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
      ]
    : [
        { id: "ingreso", label: "Ingreso", descripcion: "Registro de ingreso al turno noche", icon: Sun as typeof Clock, horas: ["19:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
        { id: "estandar", label: "Reporte Estándar", descripcion: "Reporte horario sin foto — solo novedades", icon: FileText as typeof Clock, horas: ["20:00","21:00","22:00","23:00","00:00"], requiere_foto: false, requiere_novedades: true, color: "secondary" as const },
        { id: "con_foto", label: "Reporte con Foto", descripcion: "Reporte horario con foto de evidencia", icon: Camera as typeof Clock, horas: ["01:00","02:00","03:00","04:00","05:00"], requiere_foto: true, requiere_novedades: true, color: "default" as const },
        { id: "relevo", label: "Relevo", descripcion: "Registro de salida y relevo", icon: Moon as typeof Clock, horas: ["07:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
      ]

  const grupos = rangoGpos.map(g => ({
    ...g,
    slots: g.horas.map(h => ({ hora: h, config: REPORTES[h] })).filter(s => s.config),
  })).filter(g => g.slots.length > 0)

  const configActual = horaSeleccionada ? REPORTES[horaSeleccionada] : null
  const grupoActual = configActual ? grupos.find(g => g.horas.includes(horaSeleccionada)) : null

  function handleSubmit() {
    setEnviado(true)
    setTimeout(() => setEnviado(false), 3000)
  }

  function handleSeleccionar(hora: string) {
    setHoraSeleccionada(hora)
    setFotoUrl(null)
    setNovedades("")
    setEnviado(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes Operativos</h1>
        <p className="text-muted-foreground">Selecciona un horario para registrar tu reporte</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horas del Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grupos.map(grupo => (
              <div key={grupo.id}>
                <div className="mb-2 flex items-center gap-2">
                  <grupo.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{grupo.label}</span>
                  <span className="text-xs text-muted-foreground">— {grupo.descripcion}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {grupo.slots.map(({ hora, config }) => (
                    <Button
                      key={hora}
                      variant={horaSeleccionada === hora ? "default" : "outline"}
                      className="flex-col h-auto py-2 gap-1"
                      onClick={() => handleSeleccionar(hora)}
                    >
                      <span className="text-xs font-bold">{hora}</span>
                      <Badge variant={config.requiere_foto ? "default" : "secondary"} className="text-[10px] px-1 py-0 leading-tight">
                        {config.requiere_foto ? "FOTO" : "TXT"}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            {grupos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No hay horarios disponibles</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {grupoActual ? <grupoActual.icon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              {grupoActual ? grupoActual.label : "Selecciona un horario"}
            </CardTitle>
            {configActual && (
              <p className="text-sm text-muted-foreground">
                {horaSeleccionada} — {turno === "dia" ? "Turno Día" : "Turno Noche"}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!horaSeleccionada ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm">Selecciona una hora para comenzar</p>
              </div>
            ) : (
              <>
                {grupoActual?.requiere_foto && (
                  <div>
                    <Label>Foto de Evidencia</Label>
                    <div className="mt-1">
                      <PhotoCapture
                        onPhoto={(url) => setFotoUrl(url)}
                        onClear={() => setFotoUrl(null)}
                        fotoUrl={fotoUrl}
                      />
                    </div>
                  </div>
                )}

                {grupoActual?.requiere_novedades && (
                  <div className="space-y-2">
                    <Label htmlFor="novedades">Novedades Operativas</Label>
                    <textarea
                      id="novedades"
                      placeholder="Describe las novedades operativas..."
                      value={novedades}
                      onChange={(e) => setNovedades(e.target.value)}
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                )}

                {!grupoActual?.requiere_foto && !grupoActual?.requiere_novedades && (
                  <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                    <FileText className="h-8 w-8 mb-1 opacity-30" />
                    <p className="text-sm">Reporte de {configActual?.label || horaSeleccionada}</p>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> GPS activo
                  </span>
                  <span className="flex items-center gap-1">
                    <Send className="h-3 w-3" /> WhatsApp
                  </span>
                </div>

                <Button className="w-full" onClick={handleSubmit} disabled={enviado}>
                  {enviado ? "Reporte Enviado" : "Enviar Reporte"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes del Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(REPORTES).filter(([hora]) => {
              const h = Number.parseInt(hora.split(":")[0])
              const m = Number.parseInt(hora.split(":")[1])
              const ahora = new Date()
              const horaActual = ahora.getHours()
              const minActual = ahora.getMinutes()
              return h < horaActual || (h === horaActual && m <= minActual)
            }).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay reportes registrados hoy</p>
            ) : (
              Object.entries(REPORTES).filter(([hora]) => {
                const h = Number.parseInt(hora.split(":")[0])
                const m = Number.parseInt(hora.split(":")[1])
                const ahora = new Date()
                const horaActual = ahora.getHours()
                const minActual = ahora.getMinutes()
                return h < horaActual || (h === horaActual && m <= minActual)
              }).map(([hora, config]) => (
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
