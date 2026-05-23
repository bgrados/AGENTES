"use client"

import { useEffect, useState, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useJefeSedes } from "@/hooks/use-jefe-sedes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { FileText, Download, Camera, Clock, MapPin, User, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface ReporteRegistrado {
  id: string
  agente_nombre: string
  agente_apellido: string
  sede_nombre: string
  hora_programada: string
  tipo_reporte: string
  novedades: string
  foto_url: string | null
  latitud: number | null
  longitud: number | null
  created_at: string
}

export default function ReportesSupervisorPage() {
  const { supabase } = useSupabase()
  const { sedeIds, esJefe, cargando: cargandoJefe } = useJefeSedes()
  const [reportes, setReportes] = useState<ReporteRegistrado[]>([])
  const [stats, setStats] = useState({ total: 0, conFoto: 0, sinNovedades: 0 })
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)

  const cargarReportes = useCallback(async () => {
    const supabaseAny = supabase as any
    const hoy = new Date().toISOString().split("T")[0]

    let query = supabaseAny
      .from("reportes")
      .select("id, hora_programada, tipo_reporte, novedades, foto_url, latitud, longitud, created_at, agentes(usuarios(nombre, apellido)), sedes(nombre)")
      .gte("created_at", `${hoy}T00:00:00`)
      .lte("created_at", `${hoy}T23:59:59`)
      .order("created_at", { ascending: false })

    if (esJefe && sedeIds.length > 0) {
      query = query.in("sede_id", sedeIds)
    }

    const { data } = await query

    if (data) {
      const mapped: ReporteRegistrado[] = data.map((r: any) => ({
        id: r.id,
        agente_nombre: r.agentes?.usuarios?.nombre || "—",
        agente_apellido: r.agentes?.usuarios?.apellido || "",
        sede_nombre: r.sedes?.nombre || "—",
        hora_programada: r.hora_programada || "—",
        tipo_reporte: r.tipo_reporte || "sin_foto",
        novedades: r.novedades || "",
        foto_url: r.foto_url,
        latitud: r.latitud,
        longitud: r.longitud,
        created_at: r.created_at,
      }))

      setReportes(mapped)
      setStats({
        total: mapped.length,
        conFoto: mapped.filter(r => r.tipo_reporte === "con_foto" || r.foto_url).length,
        sinNovedades: mapped.filter(r => !r.novedades || r.novedades === "Sin novedades relevantes.").length,
      })
    }

    setCargando(false)
  }, [supabase, esJefe, sedeIds])

  useEffect(() => {
    if (!cargandoJefe) cargarReportes()
  }, [cargandoJefe, cargarReportes])

  const exportarCSV = useCallback(async () => {
    setExportando(true)
    try {
      const hoy = new Date().toISOString().split("T")[0]
      const params = new URLSearchParams({ tipo: "reportes", desde: `${hoy}T00:00:00`, hasta: `${hoy}T23:59:59` })
      if (esJefe && sedeIds.length > 0) params.set("sede_id", sedeIds[0])

      const response = await fetch(`/api/export?${params}`)
      const { data } = await response.json()

      if (!data?.length) return

      // Build CSV
      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(","),
        ...data.map((row: Record<string, any>) =>
          headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ]

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reportes_${hoy}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error al exportar:", err)
    } finally {
      setExportando(false)
    }
  }, [esJefe, sedeIds])

  if (cargando || cargandoJefe) return <LoadingScreen />

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes Operativos</h1>
          <p className="text-muted-foreground">Visualiza y exporta reportes del turno actual</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCSV} disabled={exportando}>
            {exportando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reportes del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Reportes recibidos hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Con Evidencia Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.conFoto}</div>
            <p className="text-xs text-muted-foreground">Reportes con foto WebP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Novedades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.sinNovedades}</div>
            <p className="text-xs text-muted-foreground">Sin incidentes reportados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reportes Recibidos Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin reportes registrados hoy</p>
              <p className="text-xs">Los reportes aparecerán aquí cuando los agentes los envíen</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {reportes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {r.tipo_reporte === "con_foto" ? (
                        <Camera className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {r.agente_nombre} {r.agente_apellido}
                        </span>
                        <Badge variant={r.tipo_reporte === "con_foto" ? "default" : "secondary"} className="text-[10px]">
                          {r.tipo_reporte === "con_foto" ? "FOTO" : "TEXTO"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.hora_programada}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.sede_nombre}
                        </span>
                        <span>
                          {format(parseISO(r.created_at), "HH:mm", { locale: es })}
                        </span>
                      </div>

                      {r.novedades && r.novedades !== "Sin novedades relevantes." && (
                        <p className="mt-1 text-xs text-foreground/80 line-clamp-2">{r.novedades}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
