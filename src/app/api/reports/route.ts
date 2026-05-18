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
    const { agente_id, sede_id, turno, hora_programada, tipo_reporte, foto_url, latitud, longitud, novedades, agentes_presentes } = body

    if (!agente_id || !sede_id || !turno || !hora_programada || !tipo_reporte) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const supabaseAny = supabase as any

    const { data, error } = await supabaseAny.from("reportes").insert({
      agente_id,
      sede_id,
      turno,
      hora_programada,
      fecha_reporte: new Date().toISOString().split("T")[0],
      tipo_reporte,
      foto_url: foto_url ?? null,
      latitud: latitud ?? null,
      longitud: longitud ?? null,
      novedades: novedades ?? null,
      agentes_presentes: agentes_presentes ?? null,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Report creation error:", error)
    return NextResponse.json({ error: "Error al crear reporte" }, { status: 500 })
  }
}
