"use client"

import { useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAttendanceStore } from "@/stores/attendance-store"
import type { MarcarAsistenciaPayload } from "@/types/app"

export function useAttendance() {
  const { supabase } = useSupabase()
  const { setUltimaMarcacion, setMarcando, marcando } = useAttendanceStore()

  const marcar = useCallback(async (payload: MarcarAsistenciaPayload) => {
    setMarcando(true)
    try {
      const supabaseAny = supabase as any
      const { error } = await supabaseAny
        .from("asistencia")
        .insert({
          agente_id: payload.agente_id,
          sede_id: payload.sede_id,
          puesto_id: payload.puesto_id ?? null,
          tipo: payload.tipo,
          latitud: payload.latitud ?? null,
          longitud: payload.longitud ?? null,
          gps_precision: payload.gps_precision ?? null,
          qr_escanado: payload.qr_escanado ?? null,
          foto_url: payload.foto_url ?? null,
          observaciones: payload.observaciones ?? null,
          dispositivo: navigator.userAgent,
        })

      if (error) throw error

      setUltimaMarcacion({
        tipo: payload.tipo,
        fecha_hora: new Date().toISOString(),
        sede_nombre: "Registrado",
      })

      return { success: true }
    } catch (error) {
      return { success: false, error }
    } finally {
      setMarcando(false)
    }
  }, [supabase, setUltimaMarcacion, setMarcando])

  return { marcar, marcando }
}
