"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Camera, CameraOff, Scan, Keyboard } from "lucide-react"

interface QRScannerProps {
  onScan: (codigo: string) => void
  onError?: (error: string) => void
  escaneando?: boolean
}

const QR_SCANNER_ID = "qr-scanner-element"

export function QRScanner({ onScan, onError, escaneando }: QRScannerProps) {
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [permisoDenegado, setPermisoDenegado] = useState(false)
  const [modoTexto, setModoTexto] = useState(false)
  const [codigoManual, setCodigoManual] = useState("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const ultimoScanRef = useRef("")
  const contenedorRef = useRef<HTMLDivElement>(null)

  const iniciarCamara = async () => {
    setIniciando(true)
    try {
      const scanner = new Html5Qrcode(QR_SCANNER_ID)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          if (ultimoScanRef.current !== decodedText) {
            ultimoScanRef.current = decodedText
            onScan(decodedText)
          }
        },
        () => {},
      )

      setCamaraActiva(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar cámara"
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setPermisoDenegado(true)
      } else {
        onError?.(msg)
      }
    } finally {
      setIniciando(false)
    }
  }

  const detenerCamara = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {}
      scannerRef.current = null
    }
    setCamaraActiva(false)
  }

  useEffect(() => {
    return () => {
      detenerCamara()
    }
  }, [])

  useEffect(() => {
    if (escaneando === false && camaraActiva) {
      detenerCamara()
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
            <Input
              placeholder="AGT-001"
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") enviarManual() }}
            />
            <Button onClick={enviarManual}>OK</Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        ref={contenedorRef}
        id={QR_SCANNER_ID}
        className="mx-auto overflow-hidden rounded-lg bg-black"
        style={{ width: "100%", maxWidth: 360, minHeight: camaraActiva ? 0 : 280 }}
      />

      {modoTexto && (
        <div className="flex gap-2">
          <Input
            placeholder="AGT-001"
            value={codigoManual}
            onChange={(e) => setCodigoManual(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") enviarManual() }}
          />
          <Button onClick={enviarManual}>OK</Button>
        </div>
      )}

      {!camaraActiva ? (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={iniciarCamara} disabled={iniciando}>
            {iniciando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {iniciando ? "Iniciando cámara..." : "Escanear QR"}
          </Button>
          <Button variant="outline" className="shrink-0" onClick={() => setModoTexto(!modoTexto)} title="Ingresar código manual">
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="destructive" className="w-full" onClick={detenerCamara}>
          <Scan className="mr-2 h-4 w-4" />
          Detener escaneo
        </Button>
      )}
    </div>
  )
}
