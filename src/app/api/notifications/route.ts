import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription) {
      return NextResponse.json({ error: "Se requiere subscription" }, { status: 400 })
    }

    const supabaseAny = supabase as any

    const { data: userData } = await supabaseAny
      .from("usuarios")
      .select("id")
      .eq("auth_uid", user.id)
      .maybeSingle()

    if (!userData) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { error } = await supabaseAny.from("notificaciones_push").upsert({
      usuario_id: userData.id,
      subscription,
      dispositivo: request.headers.get("user-agent") || "desconocido",
      last_used_at: new Date().toISOString(),
    }, { onConflict: "usuario_id" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification subscription error:", error)
    return NextResponse.json({ error: "Error al guardar suscripción" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabaseAny = supabase as any

    const { data: userData } = await supabaseAny
      .from("usuarios")
      .select("id")
      .eq("auth_uid", user.id)
      .maybeSingle()

    if (userData) {
      await supabaseAny.from("notificaciones_push").update({ activo: false }).eq("usuario_id", userData.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification unsubscribe error:", error)
    return NextResponse.json({ error: "Error al eliminar suscripción" }, { status: 500 })
  }
}
