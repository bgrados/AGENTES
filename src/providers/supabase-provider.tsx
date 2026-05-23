"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"
import type { UsuarioSession, UserRole } from "@/types/app"
import type { Session } from "@supabase/supabase-js"

type SupabaseClient = ReturnType<typeof createClient>

interface SupabaseContextType {
  supabase: SupabaseClient
  session: Session | null
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [session, setSession] = useState<Session | null>(null)
  const { setUsuario, setLoading } = useAuthStore()

  const cargarUsuario = useCallback(async (authUid: string) => {
    const supabaseAny = supabase as any
    const { data: userData } = await supabaseAny
      .from("usuarios")
      .select("*")
      .eq("auth_uid", authUid)
      .maybeSingle()

    if (userData) {
      const { data: rolData } = await supabaseAny
        .from("roles")
        .select("nombre")
        .eq("id", userData.rol_id)
        .maybeSingle()

      const usuario: UsuarioSession = {
        id: userData.id,
        auth_uid: userData.auth_uid ?? "",
        empresa_id: userData.empresa_id,
        rol: (rolData?.nombre ?? "agente") as UserRole,
        codigo: userData.codigo,
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email,
        telefono: userData.telefono,
        foto_url: userData.foto_url,
        dni: userData.dni ?? null,
      }
      setUsuario(usuario)
    } else {
      setUsuario(null)
      setLoading(false)
    }
  }, [supabase, setUsuario, setLoading])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        cargarUsuario(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        cargarUsuario(session.user.id)
      } else {
        setUsuario(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, cargarUsuario, setUsuario, setLoading])

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error("useSupabase must be used within SupabaseProvider")
  return context
}
