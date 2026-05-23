export interface SedeData {
  id: string
  nombre: string
  direccion: string | null
  latitud: number | null
  longitud: number | null
  radio_gps: number
  tiene_almacen: boolean
  whatsapp: string | null
}

export async function obtenerSedeAgente(
  supabase: any,
  agenteId: string,
): Promise<SedeData | null> {
  const { data: agente } = await supabase
    .from("agentes")
    .select("sede_principal")
    .eq("id", agenteId)
    .maybeSingle()

  const cols = "id, nombre, direccion, latitud, longitud, radio_gps, tiene_almacen, whatsapp"

  if (agente?.sede_principal) {
    const { data: sede } = await supabase
      .from("sedes")
      .select(cols)
      .eq("id", agente.sede_principal)
      .maybeSingle()
    if (sede) return sede
  }

  const { data: asignaciones } = await supabase
    .from("agentes_sedes")
    .select("sede_id, tipo, es_jefe_grupo")
    .eq("agente_id", agenteId)
    .eq("activo", true)

  if (!asignaciones || asignaciones.length === 0) return null

  const mejor =
    asignaciones.find((a: any) => a.tipo === "principal") ??
    asignaciones.find((a: any) => a.es_jefe_grupo) ??
    asignaciones[0]

  const { data: sede } = await supabase
    .from("sedes")
    .select(cols)
    .eq("id", mejor.sede_id)
    .maybeSingle()

  return sede ?? null
}
