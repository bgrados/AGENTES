"use client"

import { useState, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { useGPS } from "@/hooks/use-gps"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { MapPin, UserCheck, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { GPS_CONFIG } from "@/lib/constants"

export default function MarcarManualPage() {
  const { usuario, isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const { gpsActivo, obtenerPosicion } = useGPS()

  const [agenteId, setAgenteId] = useState("")
  const [sedeId, setSedeId] = useState("")
  const [tipo, setTipo] = useState("entrada")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!usuario || !agenteId || !sedeId) {
      setError("Completa todos los campos requeridos")
      return
    }

    setEnviando(true)
    setError("")

    try {
      let coords: { lat: number | null; lng: number | null } = { lat: null, lng: null }

      if (gpsActivo) {
        try {
          const pos = await obtenerPosicion()
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        } catch {}
      }

      const supabaseAny = supabase as any
      const { error: err } = await supabaseAny.from("asistencia").insert({
        agente_id: agenteId,
        sede_id: sedeId,
        tipo,
        es_manual: true,
        validado_por: usuario.id,
        latitud: coords.lat,
        longitud: coords.lng,
        observaciones: observaciones || `Marcación manual por supervisor`,
        dispositivo: navigator.userAgent,
      })

      if (err) throw err
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar")
    } finally {
      setEnviando(false)
    }
  }, [usuario, agenteId, sedeId, tipo, observaciones, gpsActivo, obtenerPosicion, supabase])

  if (isLoading) return <LoadingScreen />

  if (success) {
    return (
      <div className="mx-auto max-w-md pt-12">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <CardTitle className="text-xl">Asistencia Manual Registrada</CardTitle>
            <CardDescription>
              La marcación ha sido registrada correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => { setSuccess(false); setAgenteId(""); setSedeId(""); setObservaciones("") }}>
              Nueva Marcación
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marcación Manual</h1>
        <p className="text-muted-foreground">Registrar asistencia manualmente (supervisor)</p>
      </div>

      {!gpsActivo && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>GPS no disponible. La marcación se registrará sin ubicación.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Datos de Marcación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agente">Agente *</Label>
            <Select value={agenteId} onValueChange={setAgenteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder">Selecciona un agente...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sede">Sede *</Label>
            <Select value={sedeId} onValueChange={setSedeId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder">Selecciona una sede...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="relevo_entrada">Relevo - Entrada</SelectItem>
                <SelectItem value="relevo_salida">Relevo - Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observaciones</Label>
            <Input
              id="obs"
              placeholder="Motivo de la marcación manual"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={enviando}>
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Registrar Marcación Manual
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
