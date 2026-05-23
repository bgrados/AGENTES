"use client"

import { useRef, useState } from "react"
import { compressImageToWebP } from "@/lib/camera/compression"
import { Button } from "@/components/ui/button"
import { Camera, Loader2 } from "lucide-react"

interface SecureCameraProps {
  onCapture: (webpBlob: Blob) => void
  gpsData?: { lat: number; lng: number } | null
}

export function SecureCamera({ onCapture, gpsData }: SecureCameraProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      // 1. Leer archivo y dibujar en Canvas para Watermarking
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = async () => {
          const canvas = document.createElement("canvas")
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext("2d")

          if (!ctx) throw new Error("Canvas 2D context not available")

          // Dibujar foto original
          ctx.drawImage(img, 0, 0)

          // 2. Agregar Marca de Agua (Watermark Anti-Spoofing)
          const fontSize = Math.max(24, Math.floor(img.width * 0.03))
          ctx.font = `bold ${fontSize}px Arial`
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
          ctx.shadowColor = "black"
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2

          const now = new Date()
          const dateStr = now.toLocaleDateString("es-PE")
          const timeStr = now.toLocaleTimeString("es-PE")
          
          let watermarkText = `Fecha: ${dateStr} - Hora: ${timeStr}`
          if (gpsData) {
            watermarkText += `\nLat: ${gpsData.lat.toFixed(5)} Lng: ${gpsData.lng.toFixed(5)}`
          }

          // Dibujar lineas de texto (manejo de saltos de linea)
          const lines = watermarkText.split("\n")
          const startY = img.height - (lines.length * fontSize) - 20
          
          lines.forEach((line, index) => {
            ctx.fillText(line, 20, startY + (index * (fontSize + 10)))
          })

          // 3. Exportar Canvas a Blob Temporal
          canvas.toBlob(async (blob) => {
            if (!blob) return

            // 4. Comprimir a WebP usando nuestro módulo central
            const webpBlob = await compressImageToWebP(blob, {
              maxWidthOrHeight: 1280,
              quality: 0.8
            })

            // Crear preview y notificar al padre
            const objectUrl = URL.createObjectURL(webpBlob)
            setPreview(objectUrl)
            onCapture(webpBlob)
            setLoading(false)
          }, "image/jpeg", 0.9)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error procesando foto:", error)
      setLoading(false)
    }
  }

  const triggerCamera = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* input oculto pero nativo para mejor compatibilidad móvil */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleCapture}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img src={preview} alt="Evidencia capturada" className="w-full h-auto object-cover" />
          <Button 
            variant="destructive" 
            size="sm" 
            className="absolute top-2 right-2"
            onClick={() => {
              setPreview(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          >
            Retomar Foto
          </Button>
        </div>
      ) : (
        <Button 
          type="button" 
          onClick={triggerCamera} 
          disabled={loading}
          className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed bg-muted/50 hover:bg-muted"
          variant="outline"
        >
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Tomar Evidencia Fotográfica</span>
            </>
          )}
        </Button>
      )}
    </div>
  )
}
