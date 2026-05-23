"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSupabase } from "@/providers/supabase-provider"
import { useSecureGps } from "@/hooks/use-secure-gps"
import { syncEngine } from "@/lib/offline/sync-engine"
import { generateWhatsAppLink } from "@/lib/whatsapp/generate-link"
import { obtenerSedeAgente } from "@/lib/supabase/agente-sede"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Camera, Send, MapPin, Clock, FileText, Sun, Moon, Loader2, CheckCircle } from "lucide-react"
import { REPORTES_DIA, REPORTES_NOCHE } from "@/lib/constants"
import { SecureCamera } from "@/components/camera/secure-camera"
import type { ReportePayload } from "@/types/app"

export default function ReportesPage() {
  const { usuario, isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const { requestLocation, location: gpsCoords, loading: gpsLoading } = useSecureGps()

  const [novedades, setNovedades] = useState("")
  const [horaSeleccionada, setHoraSeleccionada] = useState("")
  const [fotoData, setFotoData] = useState<string | null>(null)
  const [turno, setTurno] = useState<"dia" | "noche">("noche")
  const [cargandoTurno, setCargandoTurno] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState("")

  const [sedeId, setSedeId] = useState<string>("")
  const [sedeNombre, setSedeNombre] = useState<string>("")
  const [agenteId, setAgenteId] = useState<string>("")
  const [agenteNombre, setAgenteNombre] = useState<string>("")
  const [supervisorTelefono] = useState("51910545980")
  const [reportados, setReportados] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!usuario || !supabase) return
    ;(async () => {
      const sb = supabase as any
      const { data: agente } = await sb
        .from("agentes")
        .select("id, turno_asignado, sede_principal, usuarios(nombre, apellido)")
        .eq("usuario_id", usuario.id)
        .maybeSingle()

      if (agente) {
        setAgenteId(agente.id)
        if (agente.turno_asignado) setTurno(agente.turno_asignado)
        if (agente.usuarios) setAgenteNombre(`${agente.usuarios.nombre} ${agente.usuarios.apellido}`)

        const sede = await obtenerSedeAgente(sb, agente.id)
        if (sede) {
          setSedeId(sede.id)
          setSedeNombre(sede.nombre)
        }

        const hoy = new Date().toISOString().slice(0, 10)
        const { data: reportesHoy } = await sb
          .from("reportes")
          .select("hora_programada")
          .eq("agente_id", agente.id)
          .eq("fecha_reporte", hoy)

        if (reportesHoy) {
          setReportados(new Set(reportesHoy.map((r: any) => r.hora_programada)))
        }
      }
      setCargandoTurno(false)
    })()
  }, [usuario, supabase])

  if (isLoading || cargandoTurno) return <LoadingScreen />

  const REPORTES = turno === "dia" ? REPORTES_DIA : REPORTES_NOCHE

  const rangoGpos = turno === "dia"
    ? [
        { id: "ingreso", label: "Ingreso", descripcion: "Registro de ingreso al turno", icon: Sun, horas: ["07:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
        { id: "relevo", label: "Relevo", descripcion: "Registro de salida y relevo", icon: Moon, horas: ["19:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
      ]
    : [
        { id: "ingreso", label: "Ingreso", descripcion: "Registro de ingreso al turno noche", icon: Sun, horas: ["19:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
        { id: "estandar", label: "Reporte Estándar", descripcion: "Reporte horario sin foto", icon: FileText, horas: ["20:00","21:00","22:00","23:00","00:00"], requiere_foto: false, requiere_novedades: true, color: "secondary" as const },
        { id: "con_foto", label: "Reporte con Foto", descripcion: "Reporte horario con foto de evidencia", icon: Camera, horas: ["01:00","02:00","03:00","04:00","05:00"], requiere_foto: true, requiere_novedades: true, color: "default" as const },
        { id: "relevo", label: "Relevo", descripcion: "Registro de salida y relevo", icon: Moon, horas: ["07:00"], requiere_foto: true, requiere_novedades: false, color: "default" as const },
      ]

  const grupos = rangoGpos.map(g => ({
    ...g,
    slots: g.horas.map(h => ({ hora: h, config: REPORTES[h] })).filter(s => s.config),
  })).filter(g => g.slots.length > 0)

  const configActual = horaSeleccionada ? REPORTES[horaSeleccionada] : null
  const grupoActual = configActual ? grupos.find(g => g.horas.includes(horaSeleccionada)) : null

  function handleSeleccionar(hora: string) {
    if (hora === horaSeleccionada) {
      setHoraSeleccionada("")
      return
    }
    setHoraSeleccionada(hora)
    setFotoData(null)
    setNovedades("")
    setEnviado(false)
    setError("")
  }

  async function handleSubmit() {
    setEnviando(true)
    setError("")

    try {
      if (grupoActual?.requiere_foto && !fotoData) {
        throw new Error("La foto de evidencia es obligatoria para este reporte.")
      }

      let pos = gpsCoords
      if (!pos) pos = await requestLocation()

      const payload: ReportePayload = {
        agente_id: agenteId,
        sede_id: sedeId,
        turno,
        hora_programada: horaSeleccionada,
        tipo_reporte: grupoActual?.requiere_foto ? "con_foto" : "sin_foto",
        latitud: pos.latitud,
        longitud: pos.longitud,
        foto_data: fotoData ?? undefined,
        novedades: novedades || "Sin novedades relevantes.",
      }

      await syncEngine.queueOperation("reportes", "INSERT", payload)
      syncEngine.syncAll().catch(console.error)

      const wpLink = generateWhatsAppLink(supervisorTelefono, {
        agenteNombre,
        sedeNombre,
        turno,
        hora: horaSeleccionada,
        tipoReporte: payload.tipo_reporte,
        novedades: payload.novedades!,
      })

      setReportados(prev => new Set(prev).add(horaSeleccionada))
      setEnviado(true)
      window.open(wpLink, '_blank')
    } catch (err: any) {
      setError(err.message || "Error al procesar el reporte.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Reportes Operativos</h1>
        <p className="text-muted-foreground">Selecciona un horario para registrar tu reporte</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horas del Turno {turno === "dia" ? "Día" : "Noche"}
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
                {grupo.slots.map(({ hora, config }) => {
                  const reportado = reportados.has(hora)
                  return (
                    <Button
                      key={hora}
                      variant={horaSeleccionada === hora ? "default" : reportado ? "secondary" : "outline"}
                      className={`flex-col h-auto py-2 gap-1 relative ${reportado ? "border-green-500" : ""}`}
                      onClick={() => handleSeleccionar(hora)}
                    >
                      {reportado && (
                        <CheckCircle className="absolute -top-1.5 -right-1.5 h-4 w-4 text-green-500 bg-white rounded-full" />
                      )}
                      <span className="text-xs font-bold">{hora}</span>
                      <Badge variant={config.requiere_foto ? "default" : "secondary"} className="text-[10px] px-1 py-0 leading-tight">
                        {config.requiere_foto ? "FOTO" : "TXT"}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
          {grupos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay horarios disponibles</p>
          )}

          {horaSeleccionada && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{configActual?.label || horaSeleccionada}</p>
                  <p className="text-xs text-muted-foreground">
                    {turno === "dia" ? "Turno Día" : "Turno Noche"} — {sedeNombre}
                  </p>
                </div>
                {enviado && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" /> Enviado
                  </Badge>
                )}
              </div>

              {grupoActual?.requiere_foto && !enviado && (
                <div>
                  <Label>Foto de Evidencia</Label>
                  <div className="mt-1">
                    <SecureCamera
                      gpsData={gpsCoords ? { lat: gpsCoords.latitud, lng: gpsCoords.longitud } : null}
                      onCapture={(webpBlob) => {
                        const reader = new FileReader()
                        reader.readAsDataURL(webpBlob)
                        reader.onloadend = () => setFotoData(reader.result as string)
                      }}
                    />
                  </div>
                </div>
              )}

              {grupoActual?.requiere_novedades && !enviado && (
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

              {!grupoActual?.requiere_foto && !grupoActual?.requiere_novedades && !enviado && (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-1 opacity-30" />
                  <p className="text-sm">Reporte de {configActual?.label || horaSeleccionada}</p>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}

              {!enviado && (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> GPS Seguro
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" /> WhatsApp Auto
                    </span>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleSubmit} disabled={enviando}>
                    {enviando ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando Reporte...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Enviar Reporte y Abrir WhatsApp</>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
