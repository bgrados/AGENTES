"use client"

import { useEffect, useState, useMemo } from "react"
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
import { Camera, Send, Clock, FileText, Sun, Moon, Loader2, CheckCircle, Copy } from "lucide-react"
import { REPORTES_DIA, REPORTES_NOCHE } from "@/lib/constants"
import { SecureCamera } from "@/components/camera/secure-camera"

function generarTextoReporte(opts: {
  sedeNombre: string
  agenteNombre: string
  turno: string
  hora: string
  novedades: string
}) {
  const esNoche = Number(opts.hora.split(":")[0]) >= 19 || Number(opts.hora.split(":")[0]) < 7
  const saludo = esNoche ? "🌙" : "☀️"

  return `${saludo} REPORTE OPERATIVO - ${opts.sedeNombre}
Agente: ${opts.agenteNombre}
Turno: ${opts.turno.toUpperCase()}
Hora: ${opts.hora}

Novedades:
${opts.novedades || "Sin novedades relevantes."}

_Enviado desde Seguridad Control App_`
}

export default function ReportesPage() {
  const { usuario, isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const { requestLocation, location: gpsCoords } = useSecureGps()

  const [novedades, setNovedades] = useState("")
  const [horaSeleccionada, setHoraSeleccionada] = useState("")
  const [fotoData, setFotoData] = useState<string | null>(null)
  const [turno, setTurno] = useState<"dia" | "noche">("noche")
  const [cargandoTurno, setCargandoTurno] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [error, setError] = useState("")
  const [textoPreview, setTextoPreview] = useState("")
  const [mensajeWhatsApp, setMensajeWhatsApp] = useState("")
  const [fotoUrl, setFotoUrl] = useState("")
  const [copiado, setCopiado] = useState(false)

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
        { id: "ingreso", label: "Ingreso", descripcion: "Registro de ingreso al turno", icon: Sun, horas: ["07:00"], requiere_foto: true, requiere_novedades: false },
        { id: "relevo", label: "Relevo", descripcion: "Registro de salida y relevo", icon: Moon, horas: ["19:00"], requiere_foto: true, requiere_novedades: false },
      ]
    : [
        { id: "ingreso", label: "Ingreso", descripcion: "Registro de ingreso al turno noche", icon: Sun, horas: ["19:00"], requiere_foto: true, requiere_novedades: false },
        { id: "estandar", label: "Reporte Estándar", descripcion: "Reporte horario sin foto", icon: FileText, horas: ["20:00","21:00","22:00","23:00","00:00"], requiere_foto: false, requiere_novedades: true },
        { id: "con_foto", label: "Reporte con Foto", descripcion: "Reporte horario con foto de evidencia", icon: Camera, horas: ["01:00","02:00","03:00","04:00","05:00"], requiere_foto: true, requiere_novedades: true },
        { id: "relevo", label: "Relevo", descripcion: "Registro de salida y relevo", icon: Moon, horas: ["07:00"], requiere_foto: true, requiere_novedades: false },
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
    setConfirmado(false)
    setTextoPreview("")
    setMensajeWhatsApp("")
    setCopiado(false)
    setError("")
  }

  const textoGenerado = useMemo(() => {
    if (!horaSeleccionada) return ""
    return generarTextoReporte({
      sedeNombre,
      agenteNombre,
      turno,
      hora: horaSeleccionada,
      novedades: novedades || "Sin novedades relevantes.",
    })
  }, [horaSeleccionada, sedeNombre, agenteNombre, turno, novedades])

  useEffect(() => {
    setTextoPreview(textoGenerado)
  }, [textoGenerado])

  async function handleConfirmar() {
    setConfirmando(true)
    setError("")

    try {
      if (grupoActual?.requiere_foto && !fotoData) {
        throw new Error("La foto de evidencia es obligatoria para este reporte.")
      }

      let pos = gpsCoords
      if (!pos) pos = await requestLocation()

      let fotoUrlSubida = ""
      if (fotoData) {
        try {
          const sb = supabase as any
          const partes = fotoData.split(',')
          const mime = partes[0].match(/:(.*?);/)?.[1] || 'image/webp'
          const raw = atob(partes[1])
          const u8 = new Uint8Array(raw.length)
          for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i)
          const blob = new Blob([u8], { type: mime })
          const fileName = `${agenteId}_${horaSeleccionada.replace(":","")}_${Date.now()}.webp`
          const { error: uploadErr } = await sb.storage
            .from("agent-photos")
            .upload(`reportes/${fileName}`, blob, { contentType: mime, upsert: false })
          if (!uploadErr) {
            const { data: { publicUrl } } = sb.storage.from("agent-photos").getPublicUrl(`reportes/${fileName}`)
            fotoUrlSubida = publicUrl
            setFotoUrl(publicUrl)
          }
        } catch (e) {
          console.warn("No se pudo subir la foto:", e)
        }
      }

      const payload = {
        agente_id: agenteId,
        sede_id: sedeId,
        turno,
        hora_programada: horaSeleccionada,
        tipo_reporte: grupoActual?.requiere_foto ? "con_foto" : "sin_foto",
        latitud: pos.latitud,
        longitud: pos.longitud,
        foto_data: fotoData ?? undefined,
        foto_url: fotoUrlSubida || undefined,
        novedades: textoPreview,
      }

      await syncEngine.queueOperation("reportes", "INSERT", payload)
      syncEngine.syncAll().catch(console.error)

      const textoFinal = fotoUrlSubida
        ? `${textoPreview}\n\nFoto: ${fotoUrlSubida}`
        : textoPreview

      const wpLink = generateWhatsAppLink(supervisorTelefono, {
        agenteNombre,
        sedeNombre,
        turno,
        hora: horaSeleccionada,
        tipoReporte: payload.tipo_reporte,
        novedades: textoFinal,
      })

      setReportados(prev => new Set(prev).add(horaSeleccionada))
      setConfirmado(true)
      setMensajeWhatsApp(wpLink)
    } catch (err: any) {
      setError(err.message || "Error al confirmar el reporte.")
    } finally {
      setConfirmando(false)
    }
  }

  function handleCopiarTexto() {
    navigator.clipboard.writeText(textoPreview)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function base64ToFile(dataUrl: string): Promise<File> {
    const partes = dataUrl.split(',')
    const mime = partes[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const raw = atob(partes[1])
    const u8 = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i)
    return new File([u8], 'reporte.' + mime.split('/')[1], { type: mime })
  }

  function handleCompartir() {
    const textoCompartir = fotoUrl
      ? `${textoPreview}\n\nFoto: ${fotoUrl}`
      : textoPreview

    if (typeof navigator.share === 'function' && fotoData) {
      base64ToFile(fotoData).then(file => {
        navigator.share({ title: 'Reporte Operativo', text: textoCompartir, files: [file] })
          .catch(() => {
            // fallback: wa.me link
            if (mensajeWhatsApp) window.open(mensajeWhatsApp, '_blank')
          })
      }).catch(() => {
        if (mensajeWhatsApp) window.open(mensajeWhatsApp, '_blank')
      })
      return
    }

    if (mensajeWhatsApp) {
      window.open(mensajeWhatsApp, '_blank')
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
        </CardContent>
      </Card>

      {horaSeleccionada && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {configActual?.label || horaSeleccionada}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grupoActual?.requiere_foto && !confirmado && (
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

            {grupoActual?.requiere_novedades && !confirmado && (
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

            <div className="space-y-2">
              <Label>Vista previa del reporte</Label>
              <textarea
                value={textoPreview}
                onChange={(e) => setTextoPreview(e.target.value)}
                className="w-full min-h-[140px] rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            {!confirmado ? (
              <Button className="w-full" size="lg" onClick={handleConfirmar} disabled={confirmando}>
                {confirmando ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo foto y confirmando...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> Confirmar Reporte</>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  Reporte confirmado
                </div>

                {fotoData && (
                  <div>
                    <Label>Foto tomada</Label>
                    <div className="mt-1 rounded-lg overflow-hidden border bg-black/5">
                      <img
                        src={fotoData}
                        alt="Foto de evidencia"
                        className="w-full h-auto max-h-64 object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <Button size="lg" onClick={handleCompartir}>
                    <Send className="mr-2 h-4 w-4" /> Compartir en WhatsApp
                  </Button>
                  <div className="flex gap-2">
                    <Button size="lg" variant="outline" className="flex-1" onClick={() => { if (mensajeWhatsApp) window.open(mensajeWhatsApp, '_blank') }}>
                      <Send className="mr-2 h-4 w-4" /> Solo texto
                    </Button>
                    <Button size="lg" variant="outline" className="flex-1" onClick={handleCopiarTexto}>
                      <Copy className="mr-2 h-4 w-4" /> {copiado ? "Copiado" : "Copiar texto"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
