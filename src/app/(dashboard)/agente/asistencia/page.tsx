"use client"

import { useState, useCallback, useEffect } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { useGPS } from "@/hooks/use-gps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { MapPin, Camera, QrCode, CheckCircle, XCircle, Loader2, ImageUp } from "lucide-react"
import { QRScanner } from "@/components/qr/qr-scanner"
import { PhotoCapture } from "@/components/camera/photo-capture"
import { useAttendance } from "@/hooks/use-attendance"
import { GPS_CONFIG } from "@/lib/constants"
import type { Coordenadas } from "@/types/app"

type Step = "scanner" | "gps" | "foto" | "confirmar" | "completado"

export default function AsistenciaPage() {
  const { usuario, isLoading: authLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const { gpsActivo, ubicacionActual, validarDistancia, obtenerPosicion } = useGPS()
  const { marcar, marcando } = useAttendance()

  const [step, setStep] = useState<Step>("scanner")
  const [qrValido, setQrValido] = useState(false)
  const [puestoId, setPuestoId] = useState<string | null>(null)
  const [puestoNombre, setPuestoNombre] = useState<string>("")
  const [sedeId, setSedeId] = useState<string>("")
  const [sedeNombre, setSedeNombre] = useState<string>("")
  const [gpsCoords, setGpsCoords] = useState<Coordenadas | null>(null)
  const [gpsValidado, setGpsValidado] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [escaneando, setEscaneando] = useState(false)
  const [validandoGPS, setValidandoGPS] = useState(false)
  const [sedeLat, setSedeLat] = useState<number | null>(null)
  const [sedeLng, setSedeLng] = useState<number | null>(null)
  const [sedeRadio, setSedeRadio] = useState<number>(100)
  const [agenteRecordId, setAgenteRecordId] = useState<string | null>(null)

  useEffect(() => {
    if (!usuario) return
    ;(async () => {
      const supabaseAny = supabase as any
      const { data } = await supabaseAny.from("agentes").select("id").eq("usuario_id", usuario.id).maybeSingle()
      if (data?.id) setAgenteRecordId(data.id)
    })()
  }, [usuario])

  const handleScan = useCallback(async (codigo: string) => {
    setEscaneando(true)
    setError("")

    try {
      const supabaseAny = supabase as any
      const { data, error: err } = await supabaseAny
        .from("puestos")
        .select("id, nombre, sede_id, sedes!inner(id, nombre)")
        .eq("qr_code", codigo)
        .eq("qr_activo", true)
        .maybeSingle()

      if (err || !data) {
        setError("QR inválido o desactivado")
        setQrValido(false)
        return
      }

      const puesto = data as {
        id: string; nombre: string; sede_id: string
        sedes: { id: string; nombre: string }
      }

      setQrValido(true)
      setPuestoId(puesto.id)
      setPuestoNombre(puesto.nombre)
      setSedeId(puesto.sedes.id)
      setSedeNombre(puesto.sedes.nombre)

      const { data: sedeGps } = await supabaseAny.from("sedes").select("latitud, longitud, radio_gps").eq("id", puesto.sedes.id).maybeSingle()
      if (sedeGps) {
        setSedeLat(sedeGps.latitud)
        setSedeLng(sedeGps.longitud)
        setSedeRadio(sedeGps.radio_gps ?? 100)
      }

      setStep("gps")
    } catch {
      setError("Error al validar QR")
    } finally {
      setEscaneando(false)
    }
  }, [supabase])

  const handleGPSValidation = useCallback(async () => {
    setValidandoGPS(true)
    setError("")

    try {
      const pos = await obtenerPosicion()
      const coords: Coordenadas = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precision: pos.coords.accuracy,
      }
      setGpsCoords(coords)

      const errores: string[] = []

      if (pos.coords.accuracy > GPS_CONFIG.PRECISION_MINIMA) {
        errores.push(`Precisión GPS baja: ${Math.round(pos.coords.accuracy)}m`)
      }

      if (sedeLat !== null && sedeLng !== null) {
        const distancia = validarDistancia(coords.lat, coords.lng, sedeLat, sedeLng)
        if (distancia > sedeRadio) {
          errores.push(`Estás a ${Math.round(distancia)}m de la sede (máx ${sedeRadio}m)`)
        }
      }

      if (errores.length > 0) {
        setError(errores.join(". "))
        setGpsValidado(false)
        return
      }

      setGpsValidado(true)
      setStep("foto")
    } catch {
      setError("No se pudo obtener ubicación. Activa el GPS.")
    } finally {
      setValidandoGPS(false)
    }
  }, [obtenerPosicion, validarDistancia, sedeLat, sedeLng, sedeRadio])

  const handleFoto = useCallback(async () => {
    setStep("confirmar")
  }, [])

  const handleConfirmar = useCallback(async () => {
    if (!usuario || !gpsCoords || !agenteRecordId) return

    const result = await marcar({
      tipo: "entrada",
      agente_id: agenteRecordId,
      sede_id: sedeId,
      puesto_id: puestoId ?? undefined,
      latitud: gpsCoords.lat,
      longitud: gpsCoords.lng,
      gps_precision: gpsCoords.precision,
      qr_escanado: (qrValido && puestoId ? puestoId : undefined) as string | undefined,
      foto_url: fotoUrl ?? undefined,
    })

    if (result.success) {
      setStep("completado")
    } else {
      setError("Error al registrar asistencia")
    }
  }, [usuario, gpsCoords, marcar, sedeId, puestoId, qrValido, fotoUrl])

  if (authLoading) return <LoadingScreen />

  if (!gpsActivo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MapPin className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle>GPS Requerido</CardTitle>
            <CardDescription>
              Activa la ubicación GPS para poder marcar asistencia
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marcar Asistencia</h1>
        <p className="text-muted-foreground">Sigue los pasos para registrar tu ingreso</p>
      </div>

      <div className="flex items-center justify-between">
        {["scanner", "gps", "foto", "confirmar"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step === s ? "bg-primary text-primary-foreground" :
              ["completado", "confirmar"].includes(step) && ["scanner", "gps"].includes(s) ? "bg-green-500 text-white" :
              "bg-muted text-muted-foreground"
            }`}>
              {["completado", "confirmar"].includes(step) && ["scanner", "gps"].includes(s) ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {step === "scanner" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Escanear Código QR
            </CardTitle>
            <CardDescription>
              Escanea el código QR del puesto donde te encuentras
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Validar Ubicación
            </CardTitle>
            <CardDescription>
              {sedeNombre} - {puestoNombre}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gpsCoords && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>Lat: {gpsCoords.lat.toFixed(6)}</p>
                <p>Lng: {gpsCoords.lng.toFixed(6)}</p>
                <p>Precisión: {gpsCoords.precision?.toFixed(0)}m</p>
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <Button className="w-full" onClick={handleGPSValidation} disabled={validandoGPS}>
              {validandoGPS ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {gpsValidado ? "Ubicación Validada" : "Validar Ubicación"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "foto" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Foto de Evidencia
            </CardTitle>
            <CardDescription>
              Toma una foto para registrar tu asistencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PhotoCapture
              onPhoto={(url) => setFotoUrl(url)}
              onClear={() => setFotoUrl(null)}
              fotoUrl={fotoUrl}
            />
            <Button className="w-full" onClick={handleFoto} disabled={!fotoUrl}>
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "confirmar" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar Asistencia</CardTitle>
            <CardDescription>Verifica los datos antes de confirmar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sede:</span>
                <span className="font-medium">{sedeNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Puesto:</span>
                <span className="font-medium">{puestoNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">Entrada</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GPS:</span>
                <Badge variant={gpsValidado ? "success" : "destructive"}>
                  {gpsValidado ? "Válido" : "Inválido"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">QR:</span>
                <Badge variant={qrValido ? "success" : "destructive"}>
                  {qrValido ? "Válido" : "Inválido"}
                </Badge>
              </div>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <Button className="w-full" size="lg" onClick={handleConfirmar} disabled={marcando}>
              {marcando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Asistencia
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "completado" && (
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <CardTitle className="text-xl">Asistencia Registrada</CardTitle>
            <CardDescription>
              {sedeNombre} - {new Date().toLocaleTimeString("es-PE")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
