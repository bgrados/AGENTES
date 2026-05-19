import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabaseAny = supabase as any
    const { data: perfil } = await supabaseAny
      .from("usuarios")
      .select("roles!inner(nombre)")
      .eq("auth_uid", adminUser.id)
      .maybeSingle()

    if (perfil?.roles?.nombre !== "admin") {
      return NextResponse.json({ error: "Se requiere rol admin" }, { status: 403 })
    }

    const { usuario_id, email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Buscar si el email ya existe en Auth
    const goTrueUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`
    const searchRes = await fetch(goTrueUrl, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` },
    })
    const searchBody = await searchRes.json()
    const usersList: { id: string; email: string }[] = searchBody?.users ?? (Array.isArray(searchBody) ? searchBody : [])
    const existente = usersList.find(u => u.email === email)

    if (existente) {
      // Ya existe → solo actualizar password
      const { error: updateErr } = await admin.auth.admin.updateUserById(existente.id, { password })
      if (updateErr) {
        return NextResponse.json({ error: "Error al actualizar password: " + updateErr.message }, { status: 400 })
      }
      await supabaseAny.from("usuarios").update({ auth_uid: existente.id }).eq("id", usuario_id)
      return NextResponse.json({ success: true, uid: existente.id, actualizado: true })
    }

    // 2. No existe → crear nuevo
    const { data: nuevo, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { from_usuario: usuario_id },
    })
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }
    await supabaseAny.from("usuarios").update({ auth_uid: nuevo.user.id }).eq("id", usuario_id)
    return NextResponse.json({ success: true, uid: nuevo.user.id, actualizado: false })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
