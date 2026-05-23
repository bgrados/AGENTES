"use client"

import { useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAttendanceStore } from "@/stores/attendance-store"
import { syncEngine } from "@/lib/offline/sync-engine"
import type { MarcarAsistenciaPayload } from "@/types/app"

export function useAttendance() {
  const { supabase } = useSupabase()
  const { setUltimaMarcacion, setMarcando, marcando } = useAttendanceStore()

  const marcar = useCallback(async (payload: MarcarAsistenciaPayload) => {
    setMarcando(true)
    try {
      let fotoUrl = payload.foto_url ?? null

      // Subir foto si se tomó una (solo online)
      if (payload.foto_data && !fotoUrl) {
        try {
          const supabaseAny = supabase as any
          const res = await fetch(payload.foto_data)
          const blob = await res.blob()
          const fileName = `${payload.agente_id}_${Date.now()}.webp`
          const { error: uploadErr } = await supabaseAny.storage
            .from("agent-photos")
            .upload(`asistencia/${fileName}`, blob, { contentType: "image/webp", upsert: false })
          if (!uploadErr) {
            const { data: { publicUrl } } = supabaseAny.storage.from("agent-photos").getPublicUrl(`asistencia/${fileName}`)
            fotoUrl = publicUrl
          }
        } catch (e) {
          console.warn("Error subiendo foto, se enviará sin ella:", e)
        }
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agente_id: payload.agente_id,
          sede_id: payload.sede_id,
          tipo: payload.tipo,
          latitud: payload.latitud,
          longitud: payload.longitud,
          gps_precision: payload.gps_precision,
          qr_escanado: payload.qr_escanado,
          foto_url: fotoUrl,
          observaciones: payload.observaciones,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        console.warn("API attendance falló, encolando para sync offline:", result.error)
        await syncEngine.queueOperation("asistencia", "INSERT", {
          agente_id: payload.agente_id,
          sede_id: payload.sede_id,
          tipo: payload.tipo,
          latitud: payload.latitud ?? null,
          longitud: payload.longitud ?? null,
          gps_precision: payload.gps_precision ?? null,
          qr_escanado: payload.qr_escanado ?? null,
          foto_url: fotoUrl,
          foto_data: payload.foto_data ?? null,
          observaciones: payload.observaciones ?? null,
          dispositivo: navigator.userAgent,
        })
        syncEngine.syncAll().catch(console.error)
      }

      setUltimaMarcacion({
        tipo: payload.tipo,
        fecha_hora: new Date().toISOString(),
        sede_nombre: "Registrado",
      })

      return { success: true }
    } catch (error) {
      console.error("Error al registrar asistencia:", error)
      return { success: false, error }
    } finally {
      setMarcando(false)
    }
  }, [supabase, setUltimaMarcacion, setMarcando])

  return { marcar, marcando }
}
