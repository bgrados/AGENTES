"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { RUTAS_POR_ROL } from "@/lib/constants"

export function useAuth() {
  const { supabase } = useSupabase()
  const { usuario, isLoading } = useAuthStore()
  const router = useRouter()

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Error al obtener usuario")

    const supabaseAny = supabase as any
    const { data: userData } = await supabaseAny
      .from("usuarios")
      .select("*")
      .eq("auth_uid", user.id)
      .maybeSingle()

    if (!userData) throw new Error("Usuario no configurado en el sistema")

    const { data: rolData } = await supabaseAny
      .from("roles")
      .select("nombre")
      .eq("id", userData.rol_id)
      .maybeSingle()

    const rol = (rolData?.nombre) || "agente"
    const ruta = RUTAS_POR_ROL[rol] || "/agente"
    router.push(ruta)
  }, [supabase, router])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }, [supabase, router])

  return {
    usuario,
    isLoading,
    login,
    logout,
  }
}
