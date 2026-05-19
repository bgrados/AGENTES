"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"

export function useJefeSedes() {
  const { supabase } = useSupabase()
  const { usuario } = useAuthStore()
  const [sedeIds, setSedeIds] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuario || usuario.rol !== "jefe_grupo") {
      setSedeIds([])
      setCargando(false)
      return
    }

    const uid = usuario!.id

    async function obtener() {
      const supabaseAny = supabase as any

      const { data: agente } = await supabaseAny
        .from("agentes")
        .select("id")
        .eq("usuario_id", uid)
        .eq("activo", true)
        .maybeSingle()

      if (!agente) {
        setSedeIds([])
        setCargando(false)
        return
      }

      const { data: asignaciones } = await supabaseAny
        .from("agentes_sedes")
        .select("sede_id")
        .eq("agente_id", agente.id)
        .eq("es_jefe_grupo", true)
        .eq("activo", true)

      setSedeIds(asignaciones?.map((a: any) => a.sede_id) || [])
      setCargando(false)
    }

    obtener()
  }, [supabase, usuario])

  return { sedeIds, cargando, esJefe: usuario?.rol === "jefe_grupo" }
}
