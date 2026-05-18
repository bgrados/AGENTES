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
    const { tabla, operacion, datos } = body

    if (!tabla || !operacion || !datos) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const tablasPermitidas = ["asistencia", "reportes", "historial_ubicaciones"]
    if (!tablasPermitidas.includes(tabla)) {
      return NextResponse.json({ error: "Tabla no permitida" }, { status: 400 })
    }

    const supabaseAny = supabase as any
    let result

    if (operacion === "INSERT") {
      result = await supabaseAny.from(tabla).insert(datos)
    } else if (operacion === "UPDATE") {
      result = await supabaseAny.from(tabla).update(datos).eq("id", datos.id)
    } else {
      return NextResponse.json({ error: "Operación no soportada" }, { status: 400 })
    }

    if (result.error) throw result.error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: "Error de sincronización" }, { status: 500 })
  }
}
