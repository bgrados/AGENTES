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
    let { codigo, usuario_id } = body

    if (!codigo) {
      return NextResponse.json({ error: "Falta codigo" }, { status: 400 })
    }

    codigo = String(codigo).trim()

    const { data: { session } } = await supabase.auth.getSession()
    const userJwt = session?.access_token || ""
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: "Config error" }, { status: 500 })
    }

    const restApi = supabaseUrl + "/rest/v1"

    async function query(table: string, params: Record<string, string>) {
      const url = new URL(`${restApi}/${table}`)
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
      const res = await fetch(url.toString(), {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${userJwt}`,
          Accept: "application/vnd.pgrst.object+json",
        },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error(`[validate-qr] REST ${table} error ${res.status}:`, text)
        return null
      }
      return res.json()
    }

    const agente = await query("agentes", {
      select: "id,codigo,usuario_id,sede_principal",
      codigo: `eq.${codigo}`,
      activo: "eq.true",
      limit: "1",
    })

    if (!agente || !agente.id) {
      console.error("[validate-qr] not found, codigo:", JSON.stringify(codigo))
      return NextResponse.json({ error: `agente no encontrado: "${codigo}"` }, { status: 404 })
    }

    if (agente.usuario_id !== usuario_id) {
      return NextResponse.json({ error: "QR no corresponde al usuario" }, { status: 403 })
    }

    const userData = await query("usuarios", {
      select: "nombre,apellido",
      id: `eq.${usuario_id}`,
      limit: "1",
    })

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
