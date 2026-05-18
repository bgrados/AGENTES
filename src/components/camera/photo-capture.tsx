"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, ImageUp, X } from "lucide-react"
import { FOTO_CONFIG } from "@/lib/constants"

interface PhotoCaptureProps {
  onPhoto: (url: string) => void
  onClear: () => void
  fotoUrl?: string | null
}

export function PhotoCapture({ onPhoto, onClear, fotoUrl }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!(FOTO_CONFIG.FORMATOS as readonly string[]).includes(file.type)) {
      setError("Formato no permitido. Usa JPEG, PNG o WebP.")
      return
    }

    if (file.size > FOTO_CONFIG.MAX_SIZE) {
      setError(`Archivo muy grande. Máximo ${FOTO_CONFIG.MAX_SIZE / 1024 / 1024}MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      onPhoto(ev.target?.result as string)
      setError("")
    }
    reader.readAsDataURL(file)
  }

  const tomarFoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setError("No se pudo acceder a la cámara")
      return
    }

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.capture = "environment"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          onPhoto(ev.target?.result as string)
          setError("")
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  if (fotoUrl) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-lg border">
          <img src={fotoUrl} alt="Foto" className="h-48 w-full object-cover" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={tomarFoto}>
          <Camera className="mr-2 h-4 w-4" /> Cámara
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
          <ImageUp className="mr-2 h-4 w-4" /> Galería
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
