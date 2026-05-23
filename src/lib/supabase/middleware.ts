import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"


const RUTAS_PROTEGIDAS: Record<string, string[]> = {
  "/admin": ["admin"],
  "/supervisor": ["supervisor", "jefe_grupo", "admin"],
  "/agente": ["agente", "jefe_grupo"],
}

async function obtenerRolUsuario(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const supabaseAny = supabase as any
  const { data: userData } = await supabaseAny
    .from("usuarios")
    .select("rol_id")
    .eq("auth_uid", user.id)
    .maybeSingle()

  if (!userData || !userData.rol_id) return null

  const { data: rolData } = await supabaseAny
    .from("roles")
    .select("nombre")
    .eq("id", userData.rol_id)
    .maybeSingle()

  return rolData?.nombre as string | null
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/recuperar")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const rol = await obtenerRolUsuario(request);
    const url = request.nextUrl.clone();
    url.pathname =
      rol === "admin"
        ? "/admin"
        : rol === "supervisor" || rol === "jefe_grupo"
        ? "/supervisor"
        : "/agente";
    return NextResponse.redirect(url);
  }

  if (user) {
    try {
      const rol = await obtenerRolUsuario(request)
      if (rol) {
        for (const [ruta, rolesPermitidos] of Object.entries(RUTAS_PROTEGIDAS)) {
          if (request.nextUrl.pathname.startsWith(ruta) && !rolesPermitidos.includes(rol)) {
            const url = request.nextUrl.clone()
            url.pathname = rol === "admin" ? "/admin" : rol === "supervisor" || rol === "jefe_grupo" ? "/supervisor" : "/agente"
            return NextResponse.redirect(url)
          }
        }
      }
    } catch {
      // If role check fails, allow access
    }
  }

  return supabaseResponse
}