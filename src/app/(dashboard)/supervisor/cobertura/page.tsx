"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useJefeSedes } from "@/hooks/use-jefe-sedes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/shared/empty-state"
import { UserCheck, Users, AlertTriangle, Building2 } from "lucide-react"

interface CoberturaSede {
  sede_id: string
  sede_nombre: string
  total_puestos: number
  cubiertos: number
  agentes_activos: number
}

export default function CoberturaPage() {
  const { supabase } = useSupabase()
  const { sedeIds, esJefe, cargando: cargandoJefe } = useJefeSedes()
  const [sedes, setSedes] = useState<CoberturaSede[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalSedes: 0, totalPuestos: 0, cubiertos: 0, agentes: 0 })

  useEffect(() => {
    if (!cargandoJefe) cargarDatos()
  }, [cargandoJefe, sedeIds])

  async function cargarDatos() {
    const supabaseAny = supabase as any

    let querySedes = supabaseAny.from("sedes").select("id, nombre").eq("activo", true)
    if (esJefe && sedeIds.length > 0) {
      querySedes = querySedes.in("id", sedeIds)
    }
    const { data: sedesData } = await querySedes
    if (!sedesData || sedesData.length === 0) { setLoading(false); return }

    let queryPuestos = supabaseAny.from("puestos").select("id, sede_id, activo").eq("activo", true)
    queryPuestos = queryPuestos.in("sede_id", sedesData.map((s: any) => s.id))
    const { data: puestosData } = await queryPuestos

    const ahora = new Date().toISOString().split("T")[0]
    let queryAsistencia = supabaseAny
      .from("asistencia")
      .select("agente_id, sede_id")
      .gte("fecha_hora", `${ahora}T00:00:00`)
      .lte("fecha_hora", `${ahora}T23:59:59`)
    queryAsistencia = queryAsistencia.in("sede_id", sedesData.map((s: any) => s.id))
    const { data: asistenciasHoy } = await queryAsistencia

    let queryAgentes = supabaseAny.from("agentes").select("id, sede_principal").eq("activo", true)
    queryAgentes = queryAgentes.in("sede_principal", sedesData.map((s: any) => s.id))
    const { data: agentes } = await queryAgentes

    const asistenciasHoySet = new Set(asistenciasHoy?.map((a: any) => a.agente_id) || [])

    const cobertura = sedesData.map((s: { id: string; nombre: string }) => {
      const puestosSede = puestosData?.filter((p: { sede_id: string }) => p.sede_id === s.id) || []
      const agentesSede = agentes?.filter((a: { sede_principal: string }) => a.sede_principal === s.id) || []
      const agentesActivos = agentesSede.filter((a: { id: string }) => asistenciasHoySet.has(a.id)).length

      return {
        sede_id: s.id,
        sede_nombre: s.nombre,
        total_puestos: puestosSede.length,
        cubiertos: Math.min(agentesActivos, puestosSede.length),
        agentes_activos: agentesSede.length,
      }
    })

    setSedes(cobertura)
    setStats({
      totalSedes: sedesData.length,
      totalPuestos: puestosData?.length || 0,
      cubiertos: cobertura.reduce((a: number, s: CoberturaSede) => a + s.cubiertos, 0),
      agentes: agentes?.length || 0,
    })
    setLoading(false)
  }

  if (loading || cargandoJefe) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  const sinCobertura = stats.totalPuestos - stats.cubiertos

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cobertura de Puestos</h1>
        <p className="text-muted-foreground">Monitorea la cobertura de puestos por sede</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sedes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSedes}</div>
            <p className="text-xs text-muted-foreground">Sedes activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Puestos Cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.cubiertos}</div>
            <p className="text-xs text-muted-foreground">De {stats.totalPuestos} totales</p>
            <Progress value={stats.totalPuestos > 0 ? (stats.cubiertos / stats.totalPuestos) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sin Cobertura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${sinCobertura > 0 ? "text-red-500" : "text-green-500"}`}>{sinCobertura}</div>
            <p className="text-xs text-muted-foreground">Puestos críticos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.agentes}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
      </div>

      {sedes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState icon={Building2} title="Sin sedes configuradas" description="No hay sedes activas en el sistema" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Estado por Sede</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 px-6 pb-6">
              {sedes.map(s => {
                const pct = s.total_puestos > 0 ? Math.round((s.cubiertos / s.total_puestos) * 100) : 0
                return (
                  <div key={s.sede_id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{s.sede_nombre}</p>
                          <p className="text-xs text-muted-foreground">{s.agentes_activos} agentes • {s.total_puestos} puestos</p>
                        </div>
                        <Badge variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : "destructive"}>
                          {pct}% cubierto
                        </Badge>
                      </div>
                      <Progress value={pct} />
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
