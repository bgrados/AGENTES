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
      const supabaseAny = supabase as any

      const insertData = {
        agente_id: payload.agente_id,
        sede_id: payload.sede_id,
        tipo: payload.tipo,
        latitud: payload.latitud ?? null,
        longitud: payload.longitud ?? null,
        gps_precision: payload.gps_precision ?? null,
        foto_url: payload.foto_url ?? null,
        qr_escanado: payload.qr_escanado ?? null,
        observaciones: payload.observaciones ?? null,
        dispositivo: navigator.userAgent,
      }

      const { error: directError } = await supabaseAny.from("asistencia").insert(insertData)

      if (directError) {
        console.warn("Fallo INSERT directo, encolando para sync offline:", directError.message)
        await syncEngine.queueOperation("asistencia", "INSERT", {
          ...insertData,
          foto_data: payload.foto_data ?? null,
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
