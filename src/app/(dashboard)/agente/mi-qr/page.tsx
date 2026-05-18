"use client"

import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { QrCode, Download, User, Fingerprint, MapPin } from "lucide-react"
import QRCode from "qrcode"

export default function MiQrPage() {
  const { usuario, isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrData, setQrData] = useState<string>("")
  const [agenteInfo, setAgenteInfo] = useState<{ codigo: string; sede: string; qr_code: string } | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuario) return
    ;(async () => {
      const supabaseAny = supabase as any
      const { data: agente } = await supabaseAny
        .from("agentes")
        .select("codigo, qr_code, sedes!sede_principal(nombre)")
        .eq("usuario_id", usuario.id)
        .maybeSingle()

      if (agente) {
        const qrContent = agente.qr_code || agente.codigo
        setQrData(qrContent)
        setAgenteInfo({
          codigo: agente.codigo,
          sede: agente.sedes?.nombre || "-",
          qr_code: agente.qr_code || agente.codigo,
        })
      }
      setCargando(false)
    })()
  }, [usuario])

  useEffect(() => {
    if (qrData && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
    }
  }, [qrData])

  function descargarQR() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `QR-${agenteInfo?.codigo || "agente"}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  if (isLoading || cargando) return <LoadingScreen />

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Código QR</h1>
        <p className="text-muted-foreground">Presenta este código para identificarte</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center pt-6 pb-6">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <canvas ref={canvasRef} className="h-[280px] w-[280px]" />
          </div>
          <div className="mt-4 text-center">
            <p className="text-lg font-bold">{usuario?.nombre} {usuario?.apellido}</p>
            <p className="text-sm text-muted-foreground">{agenteInfo?.codigo}</p>
          </div>
          <Button className="mt-4 w-full" onClick={descargarQR}>
            <Download className="mr-2 h-4 w-4" /> Descargar QR
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" /> Nombre
            </span>
            <span className="font-medium">{usuario?.nombre} {usuario?.apellido}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Fingerprint className="h-4 w-4" /> Código
            </span>
            <span className="font-medium">{agenteInfo?.codigo}</span>
          </div>
          {usuario?.dni && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Fingerprint className="h-4 w-4" /> DNI
              </span>
              <span className="font-medium">{usuario.dni}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> Sede
            </span>
            <span className="font-medium">{agenteInfo?.sede}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <QrCode className="h-4 w-4" /> QR activo
            </span>
            <Badge variant="success">Activo</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
