"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import type { WhatsAppMessage } from "@/types/app"

interface WhatsAppShareProps {
  mensaje: WhatsAppMessage
  variant?: "default" | "outline"
}

function construirTexto(msg: WhatsAppMessage): string {
  const lineas = [
    `📋 *REPORTE OPERATIVO*`,
    `━━━━━━━━━━━━━━━━`,
    `📍 Sede: ${msg.sede}`,
    `🕐 Turno: ${msg.turno}`,
    `⏰ Hora: ${msg.hora}`,
    `━━━━━━━━━━━━━━━━`,
    `👤 *Agentes presentes:*`,
  ]

  msg.agentes.forEach((a) => lineas.push(`   • ${a}`))

  if (msg.novedades) {
    lineas.push(`━━━━━━━━━━━━━━━━`)
    lineas.push(`📝 *Novedades:*`)
    lineas.push(msg.novedades)
  }

  if (msg.ubicacion) {
    lineas.push(`━━━━━━━━━━━━━━━━`)
    lineas.push(`📍 Ubicación: ${msg.ubicacion}`)
  }

  lineas.push(`━━━━━━━━━━━━━━━━`)
  lineas.push(`✅ Enviado desde Seguridad Control`)

  return encodeURIComponent(lineas.join("\n"))
}

export function WhatsAppShare({ mensaje, variant = "default" }: WhatsAppShareProps) {
  const handleShare = () => {
    const texto = construirTexto(mensaje)
    const url = `https://wa.me/?text=${texto}`
    window.open(url, "_blank")
  }

  return (
    <Button variant={variant} className="w-full" onClick={handleShare}>
      <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
      Enviar a WhatsApp
    </Button>
  )
}

export function construirMensajeWhatsApp(msg: WhatsAppMessage): string {
  return construirTexto(msg)
}
