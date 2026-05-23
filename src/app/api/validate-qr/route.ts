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
    const { codigo, usuario_id } = body

    if (!codigo) {
      return NextResponse.json({ error: "Falta codigo" }, { status: 400 })
    }

    const supabaseAny = supabase as any

    const { data: agente, error } = await supabaseAny
      .from("agentes")
      .select("id, codigo, usuario_id, sede_principal")
      .eq("codigo", codigo)
      .eq("activo", true)
      .maybeSingle()

    if (error) {
      console.error("[validate-qr] supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!agente) {
      return NextResponse.json({ error: "agente no encontrado" }, { status: 404 })
    }

    if (agente.usuario_id !== usuario_id) {
      return NextResponse.json({ error: "QR no corresponde al usuario" }, { status: 403 })
    }

    const { data: userData, error: userError } = await supabaseAny
      .from("usuarios")
      .select("nombre, apellido")
      .eq("id", usuario_id)
      .maybeSingle()

    if (userError) {
      console.error("[validate-qr] user lookup error:", userError)
    }

    return NextResponse.json({
      success: true,
      agente: {
        id: agente.id,
        codigo: agente.codigo,
        nombre: userData ? `${userData.nombre} ${userData.apellido}` : null,
      },
    })
  } catch (error) {
    console.error("[validate-qr] error:", error)
    return NextResponse.json({ error: "Error al validar QR" }, { status: 500 })
  }
}
