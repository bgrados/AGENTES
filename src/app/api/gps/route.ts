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
    const { ubicaciones } = body

    if (!ubicaciones || !Array.isArray(ubicaciones) || ubicaciones.length === 0) {
      return NextResponse.json({ error: "Se requiere array de ubicaciones" }, { status: 400 })
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

    const { data: agente } = await supabaseAny
      .from("agentes")
      .select("id")
      .eq("usuario_id", userData.id)
      .maybeSingle()

    if (!agente) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 })
    }

    const registros = ubicaciones.map((u: any) => ({
      agente_id: agente.id,
      latitud: u.latitud,
      longitud: u.longitud,
      precision: u.precision ?? null,
      velocidad: u.velocidad ?? null,
      altitud: u.altitud ?? null,
      bateria: u.bateria ?? null,
    }))

    const { error } = await supabaseAny.from("historial_ubicaciones").insert(registros)
    if (error) throw error

    return NextResponse.json({ success: true, count: registros.length })
  } catch (error) {
    console.error("GPS batch error:", error)
    return NextResponse.json({ error: "Error al enviar ubicaciones" }, { status: 500 })
  }
}
