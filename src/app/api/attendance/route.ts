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

    const { data: puesto, error: puestoError } = await supabaseAny
      .from("puestos")
      .select("id, requiere_gps, requiere_qr, radio_gps, latitud, longitud")
      .eq("sede_id", sede_id)
      .eq("activo", true)
      .maybeSingle()

    if (puestoError) throw puestoError

    if (puesto?.requiere_gps && latitud != null && longitud != null) {
      const R = 6371000
      const dLat = ((puesto.latitud - latitud) * Math.PI) / 180
      const dLng = ((puesto.longitud - longitud) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((latitud * Math.PI) / 180) *
          Math.cos((puesto.latitud * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      const distancia = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const gpsValido = distancia <= (puesto.radio_gps || 50)
    }

    const { data, error } = await supabaseAny.from("asistencia").insert({
      agente_id,
      sede_id,
      puesto_id: puesto?.id ?? null,
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
