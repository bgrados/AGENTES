"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Filter } from "lucide-react"
import { REPORTES_DIA, REPORTES_NOCHE } from "@/lib/constants"
import { LoadingScreen } from "@/components/shared/loading-screen"

interface AgenteConReportes {
  id: string
  codigo: string
  nombre: string
  sede: string
  turno: "dia" | "noche"
  reportados: Set<string>
}

export default function ReportesHorariosPage() {
  const { supabase } = useSupabase()
  const [agentes, setAgentes] = useState<AgenteConReportes[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroTurno, setFiltroTurno] = useState<"dia" | "noche" | "todos">("todos")
  const [filtroSede, setFiltroSede] = useState("")

  useEffect(() => {
    ;(async () => {
      const sb = supabase as any
      const hoy = new Date().toISOString().slice(0, 10)

      const { data: agentesRaw } = await sb
        .from("agentes")
        .select("id, codigo, turno_asignado, sede_principal, usuarios!inner(nombre, apellido)")
        .eq("activo", true)
        .order("codigo")

      if (!agentesRaw) { setCargando(false); return }

      const { data: sedes } = await sb.from("sedes").select("id, nombre")
      const sedeMap = new Map(sedes?.map((s: any) => [s.id, s.nombre]) || [])

      const ids = agentesRaw.map((a: any) => a.id)
      const { data: reportesHoy } = ids.length
        ? await sb.from("reportes").select("agente_id, hora_programada").eq("fecha_reporte", hoy).in("agente_id", ids)
        : { data: null }

      const reporteMap = new Map<string, Set<string>>()
      if (reportesHoy) {
        for (const r of reportesHoy) {
          if (!reporteMap.has(r.agente_id)) reporteMap.set(r.agente_id, new Set())
          reporteMap.get(r.agente_id)!.add(r.hora_programada)
        }
      }

      setAgentes(agentesRaw.map((a: any) => ({
        id: a.id,
        codigo: a.codigo,
        nombre: `${a.usuarios.nombre} ${a.usuarios.apellido}`,
        sede: sedeMap.get(a.sede_principal) || "Sin sede",
        turno: (a.turno_asignado || "noche") as "dia" | "noche",
        reportados: reporteMap.get(a.id) || new Set(),
      })))
      setCargando(false)
    })()
  }, [supabase])

  if (cargando) return <LoadingScreen />

  const horasFiltradas = [...new Set([
    ...Object.keys(REPORTES_DIA),
    ...Object.keys(REPORTES_NOCHE),
  ])].sort((a, b) => {
    const [ah, am] = a.split(":").map(Number)
    const [bh, bm] = b.split(":").map(Number)
    const va = ah < 12 ? ah + 24 : ah
    const vb = bh < 12 ? bh + 24 : bh
    return va * 60 + am - (vb * 60 + bm)
  })

  const agentesFiltrados = agentes.filter(a => {
    if (filtroTurno !== "todos" && a.turno !== filtroTurno) return false
    if (filtroSede && !a.sede.toLowerCase().includes(filtroSede.toLowerCase())) return false
    return true
  })

  function horaEnTurno(hora: string, turno: "dia" | "noche"): boolean {
    return turno === "dia" ? hora in REPORTES_DIA : hora in REPORTES_NOCHE
  }

  const sedesUnicas = [...new Set(agentes.map(a => a.sede))].sort()

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Reportes Horarios</h1>
        <p className="text-muted-foreground">Monitoreo de reportes por agente y hora</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {(["todos", "dia", "noche"] as const).map(t => (
              <Button key={t} variant={filtroTurno === t ? "default" : "outline"} size="sm" onClick={() => setFiltroTurno(t)}>
                {t === "todos" ? "Todos" : t === "dia" ? "Turno Día" : "Turno Noche"}
              </Button>
            ))}
          </div>
          <select
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
          >
            <option value="">Todas las sedes</option>
            {sedesUnicas.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium min-w-[180px]">Agente</th>
              <th className="px-2 py-2 text-left font-medium">Sede</th>
              <th className="px-2 py-2 text-center font-medium">Turno</th>
              {horasFiltradas.map(h => (
                <th key={h} className="px-2 py-2 text-center font-medium text-xs min-w-[40px]">{h}</th>
              ))}
              <th className="px-3 py-2 text-center font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {agentesFiltrados.map(a => {
              const horasAgente = horasFiltradas.filter(h => horaEnTurno(h, a.turno))
              const reportados = horasAgente.filter(h => a.reportados.has(h)).length
              const total = horasAgente.length
              const pct = total > 0 ? Math.round(reportados / total * 100) : 0
              return (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium whitespace-nowrap">{a.nombre}</td>
                  <td className="px-2 py-2 text-muted-foreground text-xs">{a.sede}</td>
                  <td className="px-2 py-2 text-center">
                    <Badge variant={a.turno === "noche" ? "default" : "secondary"} className="text-[10px]">
                      {a.turno === "noche" ? "NOC" : "DÍA"}
                    </Badge>
                  </td>
                  {horasFiltradas.map(h => {
                    const aplica = horaEnTurno(h, a.turno)
                    const reportado = a.reportados.has(h)
                    return (
                      <td key={h} className="px-2 py-2 text-center">
                        {aplica ? (
                          reportado
                            ? <CheckCircle className="inline h-4 w-4 text-green-500" />
                            : <XCircle className="inline h-4 w-4 text-red-400" />
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center">
                    <span className={`font-mono text-xs font-bold ${pct === 100 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                      {reportados}/{total}
                    </span>
                  </td>
                </tr>
              )
            })}
            {agentesFiltrados.length === 0 && (
              <tr>
                <td colSpan={horasFiltradas.length + 4} className="px-3 py-8 text-center text-muted-foreground">
                  No se encontraron agentes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
