import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo") || "asistencia"
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const sede_id = searchParams.get("sede_id")

    const supabaseAny = supabase as any

    let query = supabaseAny.from(tipo).select("*")

    if (desde) query = query.gte("created_at", desde)
    if (hasta) query = query.lte("created_at", hasta)
    if (sede_id) query = query.eq("sede_id", sede_id)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Error al exportar datos" }, { status: 500 })
  }
}
