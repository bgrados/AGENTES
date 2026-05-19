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

    const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { from_usuario: usuario_id },
    })

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    await supabaseAny.from("usuarios").update({ auth_uid: authUser.user.id }).eq("id", usuario_id)

    return NextResponse.json({ success: true, uid: authUser.user.id })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
