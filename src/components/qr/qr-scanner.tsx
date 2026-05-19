"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CameraOff, Scan, Keyboard } from "lucide-react"

interface QRScannerProps {
  onScan: (codigo: string) => void
  onError?: (error: string) => void
  escaneando?: boolean
}

const QR_SCANNER_ID = "qr-scanner-element"

export function QRScanner({ onScan, onError, escaneando }: QRScannerProps) {
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [iniciando, setIniciando] = useState(true)
  const [permisoDenegado, setPermisoDenegado] = useState(false)
  const [modoTexto, setModoTexto] = useState(false)
  const [codigoManual, setCodigoManual] = useState("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const ultimoScanRef = useRef("")

  useEffect(() => {
    let activo = true
    async function iniciar() {
      try {
        const scanner = new Html5Qrcode(QR_SCANNER_ID)
        if (!activo) return
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (ultimoScanRef.current !== decodedText && activo) {
              ultimoScanRef.current = decodedText
              onScan(decodedText)
            }
          },
          () => {},
        )

        if (activo) setCamaraActiva(true)
      } catch (err) {
        if (!activo) return
        const msg = err instanceof Error ? err.message : ""
        if (msg.includes("NotAllowed") || msg.includes("Permission")) {
          setPermisoDenegado(true)
        } else {
          onError?.(msg || "Error al iniciar cámara")
        }
      } finally {
        if (activo) setIniciando(false)
      }
    }
    iniciar()

    return () => {
      activo = false
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch {}
        scannerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (escaneando === false && camaraActiva && scannerRef.current) {
      try { scannerRef.current.stop() } catch {}
      scannerRef.current = null
      setCamaraActiva(false)
    }
  }, [escaneando])

  function enviarManual() {
    const codigo = codigoManual.trim().toUpperCase()
    if (codigo) onScan(codigo)
  }

  if (permisoDenegado) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
          <CameraOff className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Permiso de cámara denegado. Habilítalo en la configuración del dispositivo.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => setModoTexto(true)}>
          <Keyboard className="mr-2 h-4 w-4" /> Ingresar código manualmente
        </Button>
        {modoTexto && (
          <div className="flex gap-2">
            <Input placeholder="AGT-001" value={codigoManual} onChange={(e) => setCodigoManual(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviarManual() }} />
            <Button onClick={enviarManual}>OK</Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div id={QR_SCANNER_ID} className="mx-auto overflow-hidden rounded-lg bg-black" style={{ width: "100%", maxWidth: 360, minHeight: camaraActiva ? 0 : 280 }} />

      {iniciando && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Iniciando cámara...
        </div>
      )}

      {modoTexto && (
        <div className="flex gap-2">
          <Input placeholder="AGT-001" value={codigoManual} onChange={(e) => setCodigoManual(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviarManual() }} />
          <Button onClick={enviarManual}>OK</Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setModoTexto(!modoTexto)}>
          <Keyboard className="mr-2 h-4 w-4" /> {modoTexto ? "Escanear QR" : "Ingresar manual"}
        </Button>
        {camaraActiva && (
          <Button variant="destructive" onClick={() => {
            if (scannerRef.current) { try { scannerRef.current.stop() } catch {}; scannerRef.current = null }
            setCamaraActiva(false)
          }}>
            <Scan className="mr-2 h-4 w-4" /> Detener
          </Button>
        )}
      </div>
    </div>
  )
}
