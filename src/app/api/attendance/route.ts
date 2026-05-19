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
    const { agente_id, sede_id, tipo, latitud, longitud, gps_precision, qr_escanado, foto_url, observaciones } = body

    if (!agente_id || !sede_id || !tipo) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const supabaseAny = supabase as any

    const { data: sede, error: sedeError } = await supabaseAny
      .from("sedes")
      .select("latitud, longitud, radio_gps")
      .eq("id", sede_id)
      .eq("activo", true)
      .maybeSingle()

    if (sedeError) throw sedeError

    if (sede && latitud != null && longitud != null) {
      const R = 6371000
      const dLat = ((sede.latitud - latitud) * Math.PI) / 180
      const dLng = ((sede.longitud - longitud) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((latitud * Math.PI) / 180) *
          Math.cos((sede.latitud * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      const distancia = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const gpsValido = distancia <= (sede.radio_gps || 100)
    }

    const { data, error } = await supabaseAny.from("asistencia").insert({
      agente_id,
      sede_id,
      tipo,
      latitud: latitud ?? null,
      longitud: longitud ?? null,
      gps_precision: gps_precision ?? null,
      qr_escanado: qr_escanado ?? null,
      foto_url: foto_url ?? null,
      observaciones: observaciones ?? null,
      dispositivo: request.headers.get("user-agent") || null,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Attendance error:", error)
    return NextResponse.json({ error: "Error al registrar asistencia" }, { status: 500 })
  }
}
