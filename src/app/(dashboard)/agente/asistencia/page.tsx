"use client"

import { useState, useCallback, useEffect } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { useSecureGps } from "@/hooks/use-secure-gps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { MapPin, Camera, QrCode, CheckCircle, Loader2, Satellite } from "lucide-react"
import { QRScanner } from "@/components/qr/qr-scanner"
import { SecureCamera } from "@/components/camera/secure-camera"
import { useAttendance } from "@/hooks/use-attendance"
import { obtenerSedeAgente } from "@/lib/supabase/agente-sede"
import type { Coordenadas } from "@/types/app"

type Step = "scanner" | "gps" | "foto" | "confirmar" | "completado"

export default function AsistenciaPage() {
  const { usuario, isLoading: authLoading } = useAuthStore()
  const { supabase } = useSupabase()
  
  // Nuevo Hook Anti-Spoofing de GPS
  const { location: ubicacionSegura, error: gpsError, requestLocation, validarDistancia, loading: gpsLoading } = useSecureGps()
  
  // Hook de Asistencia (Apunta a IndexedDB + SyncEngine)
  const { marcar, marcando } = useAttendance()

  const [step, setStep] = useState<Step>("scanner")
  const [qrValido, setQrValido] = useState(false)
  const [codigoEscanado, setCodigoEscanado] = useState("")
  const [sedeId, setSedeId] = useState<string>("")
  const [sedeNombre, setSedeNombre] = useState<string>("")
  const [gpsCoords, setGpsCoords] = useState<Coordenadas | null>(null)
  const [gpsValidado, setGpsValidado] = useState(false)
  
  // Ahora manejamos datos binarios para offline
  const [fotoData, setFotoData] = useState<string | null>(null)
  
  const [error, setError] = useState("")
  const [escaneando, setEscaneando] = useState(false)
  
  const [sedeLat, setSedeLat] = useState<number | null>(null)
  const [sedeLng, setSedeLng] = useState<number | null>(null)
  const [sedeRadio, setSedeRadio] = useState<number>(100)
  const [agenteRecordId, setAgenteRecordId] = useState<string | null>(null)
  const [agenteNombre, setAgenteNombre] = useState("")

  const handleScan = useCallback(async (codigo: string) => {
    setEscaneando(true)
    setError("")

    try {
      const supabaseAny = supabase as any

      const { data: agente, error: err } = await supabaseAny
        .from("agentes")
        .select("id, codigo, usuario_id, usuarios!inner(nombre, apellido), sede_principal")
        .eq("codigo", codigo)
        .eq("activo", true)
        .maybeSingle()

      if (err || !agente) {
        setError("QR inválido: agente no encontrado")
        setQrValido(false)
        return
      }

      if (agente.usuario_id !== usuario?.id) {
        setError("Este código QR no corresponde a tu usuario")
        setQrValido(false)
        return
      }

      setQrValido(true)
      setCodigoEscanado(codigo)
      setAgenteRecordId(agente.id)
      setAgenteNombre(`${agente.usuarios.nombre} ${agente.usuarios.apellido}`)

      const sedeCruda = await obtenerSedeAgente(supabaseAny, agente.id)

      if (!sedeCruda) {
        setError("No tienes sede asignada. Contacta a un administrador.")
        setQrValido(false)
        return
      }

      setSedeId(sedeCruda.id)
      setSedeNombre(sedeCruda.nombre)
      setSedeLat(sedeCruda.latitud ?? null)
      setSedeLng(sedeCruda.longitud ?? null)
      setSedeRadio(sedeCruda.radio_gps ?? 100)

      setStep("gps")
    } catch {
      setError("Error al validar QR")
    } finally {
      setEscaneando(false)
    }
  }, [supabase, usuario])

  const handleGPSValidation = useCallback(async () => {
    setError("")

    try {
      const pos = await requestLocation() // Llama al GPS fresco obligatoriamente

      const coords: Coordenadas = {
        lat: pos.latitud,
        lng: pos.longitud,
        precision: pos.precision,
      }
      setGpsCoords(coords)

      const errores: string[] = []

      // Validación de distancia a la sede (Haversine)
      if (sedeLat !== null && sedeLng !== null) {
        const distancia = validarDistancia(coords.lat, coords.lng, sedeLat, sedeLng)
        if (distancia > sedeRadio) {
          errores.push(`Estás a ${Math.round(distancia)}m de la sede (máx ${sedeRadio}m)`)
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
      setStep("foto")
    } catch (err: any) {
      setError(err.message || "Error al validar ubicación GPS")
      setGpsValidado(false)
    }
  }, [requestLocation, validarDistancia, sedeLat, sedeLng, sedeRadio])

  const handleConfirmar = useCallback(async () => {
    if (!usuario || !gpsCoords || !agenteRecordId) return

    const result = await marcar({
      tipo: "entrada",
      agente_id: agenteRecordId,
      sede_id: sedeId,
      latitud: gpsCoords.lat,
      longitud: gpsCoords.lng,
      gps_precision: gpsCoords.precision,
      qr_escanado: codigoEscanado,
      foto_data: fotoData ?? undefined, // <-- Pasar Base64/DataURL en vez de URL directa
    })

    if (result.success) {
      setStep("completado")
    } else {
      setError("Error al encolar la asistencia.")
    }
  }, [usuario, gpsCoords, marcar, sedeId, codigoEscanado, fotoData, agenteRecordId])

  if (authLoading) return <LoadingScreen />

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Marcar Asistencia</h1>
        <p className="text-muted-foreground">Sigue los pasos para registrar tu ingreso</p>
      </div>

      <div className="flex items-center justify-between">
        {["scanner", "gps", "foto", "confirmar"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step === s ? "bg-primary text-primary-foreground" :
              ["completado", "confirmar"].includes(step) && ["scanner", "gps", "foto"].includes(s) ? "bg-green-500 text-white" :
              "bg-muted text-muted-foreground"
            }`}>
              {["completado", "confirmar"].includes(step) && ["scanner", "gps", "foto"].includes(s) ? (
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
              Escanear tu Código QR
            </CardTitle>
            <CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Validar Ubicación
            </CardTitle>
            <CardDescription>
              {sedeNombre} — {agenteNombre}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
               <p>Debes estar físicamente en la sede (Radio permitido: {sedeRadio}m).</p>
               <p>Asegúrate de tener buena señal GPS (a cielo abierto o cerca de ventana).</p>
            </div>
            
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            
            <Button className="w-full" size="lg" onClick={handleGPSValidation} disabled={gpsLoading}>
              {gpsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Satellite className="mr-2 h-4 w-4" />}
              {gpsLoading ? "Obteniendo precisión militar..." : "Validar mi posición GPS"}
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
              Toma una foto para registrar tu asistencia (Se añadirá marca de agua automática)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SecureCamera
              gpsData={gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng } : null}
              onCapture={(webpBlob) => {
                // Convertir Blob a Base64 para guardarlo en IndexedDB Offline
                const reader = new FileReader()
                reader.readAsDataURL(webpBlob)
                reader.onloadend = () => {
                  setFotoData(reader.result as string)
                }
              }}
            />
            
            <Button className="w-full" onClick={() => setStep("confirmar")} disabled={!fotoData}>
              Continuar a Confirmación
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "confirmar" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar Asistencia</CardTitle>
            <CardDescription>Verifica los datos antes de confirmar (Soporta Modo Offline)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agente:</span>
                <span className="font-medium">{agenteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Código:</span>
                <span className="font-medium">{codigoEscanado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sede:</span>
                <span className="font-medium">{sedeNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium text-blue-600">Entrada</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precisión GPS:</span>
                <Badge variant={gpsValidado ? "success" : "destructive"}>
                  {gpsValidado ? `${Math.round(gpsCoords?.precision || 0)}m` : "Inválido"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evidencia Visual:</span>
                <Badge variant={fotoData ? "success" : "destructive"}>
                  {fotoData ? "Capturada" : "Ausente"}
                </Badge>
              </div>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <Button className="w-full" size="lg" onClick={handleConfirmar} disabled={marcando}>
              {marcando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Asistencia Segura
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "completado" && (
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl">Asistencia Registrada</CardTitle>
            <CardDescription className="text-lg">
              {sedeNombre} <br/> 
              <span className="font-semibold text-foreground">{new Date().toLocaleTimeString("es-PE")}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
             <p className="text-sm text-muted-foreground">Tu registro se sincronizará automáticamente en segundo plano cuando tengas conexión estable.</p>
             <Button variant="outline" className="mt-6" onClick={() => window.location.href = "/agente/historial"}>
               Ver mi historial
             </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
