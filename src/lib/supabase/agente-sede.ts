interface SedeData {
  id: string
  nombre: string
  latitud: number | null
  longitud: number | null
  radio_gps: number
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

  if (agente?.sede_principal) {
    const { data: sede } = await supabase
      .from("sedes")
      .select("id, nombre, latitud, longitud, radio_gps")
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
    .select("id, nombre, latitud, longitud, radio_gps")
    .eq("id", mejor.sede_id)
    .maybeSingle()

  return sede ?? null
}
