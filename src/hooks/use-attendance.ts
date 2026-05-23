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
      // 1. Enviar a la cola offline en lugar de insertar directo
      await syncEngine.queueOperation("asistencia", "INSERT", {
        agente_id: payload.agente_id,
        sede_id: payload.sede_id,
        puesto_id: payload.puesto_id ?? null,
        tipo: payload.tipo,
        latitud: payload.latitud ?? null,
        longitud: payload.longitud ?? null,
        gps_precision: payload.gps_precision ?? null,
        qr_escanado: payload.qr_escanado ?? null,
        foto_url: payload.foto_url ?? null,
        foto_data: payload.foto_data ?? null,
        observaciones: payload.observaciones ?? null,
        dispositivo: navigator.userAgent,
      })

      // 2. Intentar sincronizar en background inmediatamente
      // No esperamos a que termine para darle feedback rápido al usuario
      syncEngine.syncAll().catch(console.error)

      setUltimaMarcacion({
        tipo: payload.tipo,
        fecha_hora: new Date().toISOString(),
        sede_nombre: "Registrado",
      })

      return { success: true }
    } catch (error) {
      console.error("Error al encolar asistencia:", error)
      return { success: false, error }
    } finally {
      setMarcando(false)
    }
  }, [setUltimaMarcacion, setMarcando])

  return { marcar, marcando }
}
