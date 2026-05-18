"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Loader2, Camera, CameraOff, Scan } from "lucide-react"

interface QRScannerProps {
  onScan: (codigo: string) => void
  onError?: (error: string) => void
  escaneando?: boolean
}

const QR_SCANNER_ID = "qr-scanner-element"

export function QRScanner({ onScan, onError, escaneando }: QRScannerProps) {
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [permiso, setPermiso] = useState<boolean | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const ultimoScanRef = useRef("")

  const iniciarCamara = async () => {
    setIniciando(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      stream.getTracks().forEach((t) => t.stop())
      setPermiso(true)
    } catch {
      setPermiso(false)
      setIniciando(false)
      return
    }

    try {
      const scanner = new Html5Qrcode(QR_SCANNER_ID)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
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
      onError?.(msg)
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

  if (permiso === false) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
        <CameraOff className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Permiso de cámara denegado. Habilítalo en la configuración del dispositivo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        id={QR_SCANNER_ID}
        className="mx-auto overflow-hidden rounded-lg"
        style={{ width: "100%", maxWidth: 360, minHeight: 280 }}
      />

      {!camaraActiva ? (
        <Button className="w-full" onClick={iniciarCamara} disabled={iniciando}>
          {iniciando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}
          {iniciando ? "Iniciando cámara..." : "Escanear QR"}
        </Button>
      ) : (
        <Button variant="destructive" className="w-full" onClick={detenerCamara}>
          <Scan className="mr-2 h-4 w-4" />
          Detener escaneo
        </Button>
      )}
    </div>
  )
}
