"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { useSecureGps } from "@/hooks/use-secure-gps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { MapPin, QrCode, CheckCircle, Loader2, Satellite, Send, FileText, Copy } from "lucide-react"
import { QRScanner } from "@/components/qr/qr-scanner"
import { useAttendance } from "@/hooks/use-attendance"
import { obtenerSedeAgente, type SedeData } from "@/lib/supabase/agente-sede"
import type { Coordenadas, EdificioEstado } from "@/types/app"

type Step = "scanner" | "gps" | "reporte" | "confirmar" | "completado"

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"]

function formatearFecha(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

function obtenerSaludo(): string {
  const h = new Date().getHours()
  return h >= 6 && h < 19 ? "☀️ Buenos días" : "🌙 Buenas noches"
}

function turnoLabel(turno: "dia" | "noche"): string {
  return turno === "noche" ? "Noche (19:00 – 07:00)" : "Día (07:00 – 19:00)"
}

function turnoOpuesto(turno: "dia" | "noche"): "dia" | "noche" {
  return turno === "noche" ? "dia" : "noche"
}

function generarReporte(opts: {
  tipo: "entrada" | "salida"
  saludo: string
  fecha: string
  sedeNombre: string
  sedeDireccion: string | null
  agenteNombre: string
  turno: "dia" | "noche"
  relevoNombre: string
  estado: EdificioEstado
}): string {
  const dir = opts.sedeDireccion ? ` – ${opts.sedeDireccion}` : ""
  const [rolAgente, rolRelevo, turnoAgente, turnoRelevo] =
    opts.tipo === "entrada"
      ? ["ingresa", "entrega", opts.turno, turnoOpuesto(opts.turno)]
      : ["entrega", "ingresa", opts.turno, turnoOpuesto(opts.turno)]

  let estadoTexto: string
  switch (opts.estado) {
    case "casa_vacia":
      estadoTexto = "🏢 Casa vacía"
      break
    case "personal_laborando":
      estadoTexto = "🏢 Personal Laborando"
      break
    case "almacen_cerrado":
      estadoTexto = "🏢 Personal Laborando\n🏭 Almacén cerrado"
      break
    case "almacen_abierto":
      estadoTexto = "🏢 Personal Laborando\n🏭 Almacén abierto"
      break
  }

  return [
    `${opts.saludo}`,
    "",
    "⚖️ CENTRO DE CONTROL OSEDENA",
    "Distrito Fiscal de Lima Cercado",
    "",
    "🛡️ Servicio de Asistencia en Seguridad",
    "",
    `📅 ${opts.fecha}`,
    `📍 ${opts.sedeNombre}${dir}`,
    "────────────",
    "",
    `👮‍♂️ Guardia que ${rolAgente}`,
    `Turno ${turnoLabel(turnoAgente)}`,
    `• ${opts.agenteNombre}`,
    "",
    `👮‍♂️ Guardia que ${rolRelevo}`,
    `Turno ${turnoLabel(turnoRelevo)}`,
    `• ${opts.relevoNombre}`,
    "────────────",
    "",
    estadoTexto,
    "",
    "📋 Relevo realizado con normalidad.",
    "",
    "✅ Servicio sin novedad",
  ].join("\n")
}

export default function AsistenciaPage() {
  const { usuario, isLoading: authLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const supabaseAny = supabase as any

  const { requestLocation, error: gpsError, validarDistancia, loading: gpsLoading } = useSecureGps()
  const { marcar, marcando } = useAttendance()

  const [step, setStep] = useState<Step>("scanner")
  const [error, setError] = useState("")
  const [escaneando, setEscaneando] = useState(false)

  const [codigoEscanado, setCodigoEscanado] = useState("")
  const [agenteRecordId, setAgenteRecordId] = useState<string | null>(null)
  const [agenteNombre, setAgenteNombre] = useState("")
  const [turnoAgente, setTurnoAgente] = useState<"dia" | "noche">("noche")

  const [sedeData, setSedeData] = useState<SedeData | null>(null)
  const [gpsCoords, setGpsCoords] = useState<Coordenadas | null>(null)
  const [gpsValidado, setGpsValidado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada")
  const [relevoNombre, setRelevoNombre] = useState("")
  const [edificioEstado, setEdificioEstado] = useState<EdificioEstado>("personal_laborando")
  const [reporteTexto, setReporteTexto] = useState("")

  const buscandoRelevo = useRef(false)

  useEffect(() => {
    if (!sedeData || !agenteNombre) return
    const saludo = obtenerSaludo()
    const fecha = formatearFecha(new Date())
    setReporteTexto(generarReporte({
      tipo,
      saludo,
      fecha,
      sedeNombre: sedeData.nombre,
      sedeDireccion: sedeData.direccion,
      agenteNombre,
      turno: turnoAgente,
      relevoNombre: relevoNombre || "[Nombre del relevo]",
      estado: edificioEstado,
    }))
  }, [tipo, sedeData, agenteNombre, turnoAgente, relevoNombre, edificioEstado])

  const autoDetectarTipoYRelevo = useCallback(async (agenteId: string) => {
    try {
      const { data: lastOwn } = await supabaseAny
        .from("asistencia")
        .select("tipo, created_at")
        .eq("agente_id", agenteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const today = new Date().toDateString()
      const lastDate = lastOwn?.created_at ? new Date(lastOwn.created_at).toDateString() : null
      const detected = lastOwn?.tipo === "entrada" && lastDate === today ? "salida" : "entrada"
      setTipo(detected)

      if (!sedeData) return
      buscandoRelevo.current = true
      const { data: lastOther } = await supabaseAny
        .from("asistencia")
        .select("agente_id")
        .eq("sede_id", sedeData.id)
        .neq("agente_id", agenteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastOther?.agente_id) {
        const { data: a } = await supabaseAny
          .from("agentes")
          .select("usuario_id")
          .eq("id", lastOther.agente_id)
          .maybeSingle()
        if (a?.usuario_id) {
          const { data: u } = await supabaseAny
            .from("usuarios")
            .select("nombre, apellido")
            .eq("id", a.usuario_id)
            .maybeSingle()
          if (u) setRelevoNombre(`${u.nombre} ${u.apellido}`)
        }
      }
    } catch (e) {
      console.warn("Error auto-detectando tipo/relevo:", e)
    }
    buscandoRelevo.current = false
  }, [supabaseAny, sedeData])

  const handleScan = useCallback(async (codigo: string) => {
    setEscaneando(true)
    setError("")

    try {
      const res = await fetch("/api/validate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, usuario_id: usuario?.id }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Error al validar QR")
        return
      }

      setCodigoEscanado(codigo)
      setAgenteRecordId(json.agente.id)
      setAgenteNombre(json.agente.nombre)

      const sedeCruda = await obtenerSedeAgente(supabaseAny, json.agente.id)
      if (!sedeCruda) {
        setError("No tienes sede asignada. Contacta a un administrador.")
        return
      }

      setSedeData(sedeCruda)

      const { data: agentInfo } = await supabaseAny
        .from("agentes")
        .select("turno_asignado")
        .eq("id", json.agente.id)
        .maybeSingle()
      const turno = (agentInfo?.turno_asignado || "noche") as "dia" | "noche"
      setTurnoAgente(turno)

      if (sedeCruda.tiene_almacen) {
        setEdificioEstado("personal_laborando")
      } else {
        setEdificioEstado("personal_laborando")
      }

      setStep("gps")
    } catch {
      setError("Error al validar QR")
    } finally {
      setEscaneando(false)
    }
  }, [supabase, usuario, supabaseAny])

  useEffect(() => {
    if (step === "gps" && agenteRecordId && sedeData) {
      autoDetectarTipoYRelevo(agenteRecordId)
    }
  }, [step, agenteRecordId, sedeData, autoDetectarTipoYRelevo])

  const handleGPSValidation = useCallback(async () => {
    setError("")
    try {
      const pos = await requestLocation()
      const coords: Coordenadas = { lat: pos.latitud, lng: pos.longitud, precision: pos.precision }
      setGpsCoords(coords)

      const errores: string[] = []
      if (sedeData?.latitud != null && sedeData?.longitud != null) {
        const distancia = validarDistancia(coords.lat, coords.lng, sedeData.latitud, sedeData.longitud)
        if (distancia > (sedeData.radio_gps || 100)) {
          errores.push(`Estás a ${Math.round(distancia)}m de la sede (máx ${sedeData.radio_gps || 100}m)`)
        }
      } else {
        errores.push("La sede no tiene coordenadas registradas en el sistema.")
      }

      if (errores.length > 0) {
        setError(errores.join(". "))
        setGpsValidado(false)
        return
      }

      setGpsValidado(true)
      if (usuario?.rol === "jefe_grupo") {
        setStep("reporte")
      } else {
        setStep("confirmar")
      }
    } catch (err: any) {
      setError(err.message || "Error al validar ubicación GPS")
      setGpsValidado(false)
    }
  }, [requestLocation, validarDistancia, sedeData])

  const handleConfirmar = useCallback(async () => {
    if (!usuario || !gpsCoords || !agenteRecordId || !sedeData) return

    const textoFinal = usuario?.rol === "jefe_grupo" ? reporteTexto : undefined

    const result = await marcar({
      tipo,
      agente_id: agenteRecordId,
      sede_id: sedeData.id,
      latitud: gpsCoords.lat,
      longitud: gpsCoords.lng,
      gps_precision: gpsCoords.precision,
      qr_escanado: codigoEscanado,
      observaciones: textoFinal,
    })

    if (!result.success) {
      setError("Error al registrar asistencia.")
      return
    }

    setStep("completado")
  }, [usuario, gpsCoords, agenteRecordId, sedeData, reporteTexto, marcar, tipo, codigoEscanado])

  function abrirWhatsApp() {
    if (!sedeData) return
    const numero = sedeData.whatsapp || "51910545980"
    const link = `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(reporteTexto)}`
    window.open(link, "_blank")
  }

  function handleCopiarTexto() {
    navigator.clipboard.writeText(reporteTexto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const opcionesEdificio: { value: EdificioEstado; label: string }[] = sedeData?.tiene_almacen
    ? [
        { value: "personal_laborando", label: "Personal Laborando" },
        { value: "casa_vacia", label: "Casa Vacía" },
        { value: "almacen_cerrado", label: "Almacén Cerrado" },
        { value: "almacen_abierto", label: "Almacén Abierto" },
      ]
    : [
        { value: "personal_laborando", label: "Personal Laborando" },
        { value: "casa_vacia", label: "Casa Vacía" },
      ]

  if (authLoading) return <LoadingScreen />

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Marcar Asistencia</h1>
        <p className="text-muted-foreground">Sigue los pasos para registrar tu ingreso o salida</p>
      </div>

      {usuario?.rol === "jefe_grupo" && (
        <div className="flex items-center justify-between overflow-x-auto">
          {["scanner", "gps", "reporte", "confirmar"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s ? "bg-primary text-primary-foreground" :
                (step === "completado" && ["scanner", "gps", "reporte"].includes(s)) ? "bg-green-500 text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {step === "completado" && ["scanner", "gps", "reporte", "confirmar"].includes(s) ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className="h-px w-6 bg-border hidden sm:block" />}
            </div>
          ))}
        </div>
      )}

      {step === "scanner" && (
        <Card className="glass-panel border-white/10 shadow-2xl animate-scan-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <QrCode className="h-5 w-5 text-blue-400" />
              Escanear tu Código QR
            </CardTitle>
            <CardDescription className="text-gray-400">
              Escanea el código QR con tu código de agente (ej: AGT-001)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QRScanner
              onScan={handleScan}
              onError={(msg) => setError(msg)}
              escaneando={escaneando}
            />
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "gps" && (
        <Card className="glass-panel border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <MapPin className="h-5 w-5 text-blue-400" />
              Validar Ubicación
            </CardTitle>
            <CardDescription className="text-gray-400">
              {sedeData?.nombre} — {agenteNombre}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 rounded-lg glass-panel-light p-4 text-sm text-gray-300">
               <p>Debes estar físicamente en la sede (Radio permitido: {sedeData?.radio_gps || 100}m).</p>
               <p>Asegúrate de tener buena señal GPS (a cielo abierto o cerca de ventana).</p>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <Button className="w-full premium-btn-hover transition-transform duration-200" size="lg" onClick={handleGPSValidation} disabled={gpsLoading}>
              {gpsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Satellite className={`mr-2 h-4 w-4 ${gpsLoading ? "" : "animate-gps-orbit text-blue-400"}`} />}
              {gpsLoading ? "Obteniendo precisión militar..." : "Validar mi posición GPS"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "reporte" && (
        <Card className="glass-panel border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-blue-400" />
              Reporte de {tipo === "entrada" ? "Ingreso" : "Salida"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Completa los datos y edita el texto del reporte si es necesario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Tipo de marcación</Label>
              <div className="flex gap-2">
                <Button
                  variant={tipo === "entrada" ? "default" : "outline"}
                  className="flex-1 premium-btn-hover transition-all duration-200"
                  onClick={() => setTipo("entrada")}
                >
                  Entrada
                </Button>
                <Button
                  variant={tipo === "salida" ? "default" : "outline"}
                  className="flex-1 premium-btn-hover transition-all duration-200"
                  onClick={() => setTipo("salida")}
                >
                  Salida
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relevo" className="text-gray-300">Guardia que {tipo === "entrada" ? "entrega" : "ingresa"} (relevo)</Label>
              <Input
                id="relevo"
                placeholder="Nombre del relevo"
                value={relevoNombre}
                onChange={(e) => setRelevoNombre(e.target.value)}
                className="bg-slate-900/50 border-white/10 focus:border-blue-500 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Estado de la sede</Label>
              <div className="flex flex-wrap gap-2">
                {opcionesEdificio.map((op) => (
                  <Button
                    key={op.value}
                    variant={edificioEstado === op.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEdificioEstado(op.value)}
                    className="premium-btn-hover transition-all duration-200"
                  >
                    {op.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Texto del reporte (editable)</Label>
              <textarea
                className="w-full min-h-[280px] rounded-md border bg-slate-900/60 border-white/10 p-3 text-xs font-mono resize-y text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={reporteTexto}
                onChange={(e) => setReporteTexto(e.target.value)}
              />
            </div>

            <Button className="w-full premium-btn-hover transition-transform duration-200 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setStep("confirmar")}>
              Continuar a Confirmación
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "confirmar" && (
        <Card className="glass-panel border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Confirmar Asistencia</CardTitle>
            <CardDescription className="text-gray-400">Verifica los datos antes de confirmar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg glass-panel-light p-3 text-sm text-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-400">Agente:</span>
                <span className="font-medium">{agenteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Código:</span>
                <span className="font-medium">{codigoEscanado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sede:</span>
                <span className="font-medium">{sedeData?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tipo:</span>
                <span className={`font-medium ${tipo === "entrada" ? "text-blue-400" : "text-amber-400"}`}>
                  {tipo === "entrada" ? "Entrada" : "Salida"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Relevo:</span>
                <span className="font-medium">{relevoNombre || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Precisión GPS:</span>
                <Badge variant={gpsValidado ? "success" : "destructive"}>
                  {gpsValidado ? `${Math.round(gpsCoords?.precision || 0)}m` : "Inválido"}
                </Badge>
              </div>
            </div>

            {usuario?.rol === "jefe_grupo" && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400">TEXTO DEL REPORTE</p>
                <div className="whitespace-pre-wrap rounded-md border border-white/10 bg-slate-950/60 p-3 text-xs text-gray-200 font-mono">
                  {reporteTexto}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="flex flex-col gap-2">
              <Button className="w-full premium-btn-hover transition-transform duration-200 bg-blue-600 hover:bg-blue-700 text-white" size="lg" onClick={handleConfirmar} disabled={marcando}>
                {marcando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Confirmar Asistencia
              </Button>
              {usuario?.rol === "jefe_grupo" && (
                <Button variant="outline" size="sm" onClick={() => setStep("reporte")} className="premium-btn-hover border-white/10 text-gray-300 hover:bg-slate-800">
                  Volver a editar reporte
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "completado" && (
        <Card className="glass-panel border-white/10 shadow-2xl border-green-500/30">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-pulse" />
            <CardTitle className="text-2xl text-white">Asistencia Registrada</CardTitle>
            <CardDescription className="text-lg text-gray-300">
              {sedeData?.nombre} <br/> 
              <span className="font-semibold text-white">{new Date().toLocaleTimeString("es-PE")}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-gray-400">
              {tipo === "entrada" ? "Ingreso" : "Salida"} registrado correctamente.
            </p>
            <div className="flex flex-col gap-2">
              {usuario?.rol === "jefe_grupo" && (
                <>
                  <Button onClick={abrirWhatsApp} size="lg" className="premium-btn-hover bg-green-600 hover:bg-green-700 text-white">
                    <Send className="mr-2 h-4 w-4" /> Enviar reporte a WhatsApp
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleCopiarTexto} className="premium-btn-hover border-white/10 text-gray-300 hover:bg-slate-800">
                    <Copy className="mr-2 h-4 w-4" /> {copiado ? "¡Copiado!" : "Copiar texto del reporte"}
                  </Button>
                  <p className="text-xs text-gray-500">
                    Adjunta la foto manualmente desde tu galería al enviar por WhatsApp
                  </p>
                </>
              )}
              <Button variant="outline" onClick={() => window.location.href = "/agente/historial"} className="premium-btn-hover border-white/10 text-gray-300 hover:bg-slate-800">
                Ver mi historial
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-gray-400 hover:text-white">
              Nueva marcación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
