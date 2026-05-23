"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSupabase } from "@/providers/supabase-provider"
import { useSecureGps } from "@/hooks/use-secure-gps"
import { syncEngine } from "@/lib/offline/sync-engine"
import { generateWhatsAppLink } from "@/lib/whatsapp/generate-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Camera, Send, MapPin, Clock, FileText, Sun, Moon, Loader2 } from "lucide-react"
import { REPORTES_DIA, REPORTES_NOCHE } from "@/lib/constants"
import { SecureCamera } from "@/components/camera/secure-camera"
import type { ReportePayload } from "@/types/app"

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
  
  // Motores Core
  const { requestLocation, location: gpsCoords, loading: gpsLoading } = useSecureGps()

  const [novedades, setNovedades] = useState("")
  const [horaSeleccionada, setHoraSeleccionada] = useState("")
  const [fotoData, setFotoData] = useState<string | null>(null)
  const [turno, setTurno] = useState<"dia" | "noche">("noche")
  const [cargandoTurno, setCargandoTurno] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState("")
  
  // Metadata agente
  const [sedeId, setSedeId] = useState<string>("")
  const [sedeNombre, setSedeNombre] = useState<string>("")
  const [agenteId, setAgenteId] = useState<string>("")
  const [agenteNombre, setAgenteNombre] = useState<string>("")
  const [supervisorTelefono, setSupervisorTelefono] = useState<string>("+51999999999") // Fallback
  
  useEffect(() => {
    if (!usuario) return
    ;(async () => {
      const supabaseAny = supabase as any
      // Obtener agente
      const { data: agente } = await supabaseAny
        .from("agentes")
        .select("id, turno_asignado, sede_principal, usuarios(nombre, apellido)")
        .eq("usuario_id", usuario.id)
        .maybeSingle()
        
      if (agente) {
        setAgenteId(agente.id)
        if (agente.turno_asignado) setTurno(agente.turno_asignado)
        if (agente.usuarios) setAgenteNombre(`${agente.usuarios.nombre} ${agente.usuarios.apellido}`)
        
        // Obtener sede
        if (agente.sede_principal) {
          const { data: sede } = await supabaseAny.from("sedes").select("id, nombre, supervisor_telefono").eq("id", agente.sede_principal).maybeSingle()
          if (sede) {
            setSedeId(sede.id)
            setSedeNombre(sede.nombre)
            if (sede.supervisor_telefono) setSupervisorTelefono(sede.supervisor_telefono)
          }
        }
      }
      setCargandoTurno(false)
    })()
  }, [usuario, supabase])

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

  function handleSeleccionar(hora: string) {
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

      // 1. Validar GPS Estricto (Anti-Spoofing)
      let pos = gpsCoords
      if (!pos) {
         pos = await requestLocation()
      }
      
      const payload: ReportePayload = {
        agente_id: agenteId,
        sede_id: sedeId,
        turno: turno,
        hora_programada: horaSeleccionada,
        tipo_reporte: grupoActual?.requiere_foto ? "con_foto" : "sin_foto",
        latitud: pos.latitud,
        longitud: pos.longitud,
        foto_data: fotoData ?? undefined,
        novedades: novedades || "Sin novedades relevantes.",
      }

      // 2. Encolar Offline
      await syncEngine.queueOperation("reportes", "INSERT", payload)
      syncEngine.syncAll().catch(console.error)

      // 3. Generar MVP Link WhatsApp y abrirlo
      const wpLink = generateWhatsAppLink(supervisorTelefono, {
        agenteNombre,
        sedeNombre,
        turno,
        hora: horaSeleccionada,
        tipoReporte: payload.tipo_reporte,
        novedades: payload.novedades!,
      })
      
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
        <p className="text-muted-foreground">Selecciona un horario para registrar tu reporte offline</p>
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
                {horaSeleccionada} — {turno === "dia" ? "Turno Día" : "Turno Noche"} en {sedeNombre}
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
                    <Label>Foto de Evidencia (Marca de Agua Obligatoria)</Label>
                    <div className="mt-1">
                      <SecureCamera
                        gpsData={gpsCoords}
                        onCapture={(webpBlob) => {
                          const reader = new FileReader()
                          reader.readAsDataURL(webpBlob)
                          reader.onloadend = () => setFotoData(reader.result as string)
                        }}
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

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                )}

                <div className="flex items-center justify-between rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> GPS Seguro
                  </span>
                  <span className="flex items-center gap-1">
                    <Send className="h-3 w-3" /> WhatsApp Auto
                  </span>
                </div>

                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={enviando || enviado}>
                  {enviando ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando Reporte...</>
                  ) : enviado ? (
                    "Reporte Guardado Offline"
                  ) : (
                    "Enviar Reporte y Abrir WhatsApp"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial Local del Turno</CardTitle>
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
                      {config.requiere_foto ? "Evidencia Física" : "Solo Texto"}
                    </Badge>
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
