"use client"

import { useEffect, useState, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { FileText, Download, Camera, Clock, MapPin, Search, Loader2, Eye, X } from "lucide-react"

interface ReporteData {
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
  turno: string
}

export default function AdminReportesPage() {
  const { supabase } = useSupabase()
  const [reportes, setReportes] = useState<ReporteData[]>([])
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([])
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)

  const [filtroSede, setFiltroSede] = useState("todas")
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split("T")[0])
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [busqueda, setBusqueda] = useState("")

  const [fotoDialog, setFotoDialog] = useState<string | null>(null)

  const cargarSedes = useCallback(async () => {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("sedes").select("id, nombre").eq("activo", true).order("nombre")
    if (data) setSedes(data)
  }, [supabase])

  const cargarReportes = useCallback(async () => {
    const supabaseAny = supabase as any
    const desde = `${filtroFecha}T00:00:00`
    const hasta = `${filtroFecha}T23:59:59`

    let query = supabaseAny
      .from("reportes")
      .select("id, hora_programada, tipo_reporte, novedades, foto_url, latitud, longitud, turno, created_at, agentes!inner(usuarios!inner(nombre, apellido)), sedes!inner(nombre)")
      .gte("created_at", desde)
      .lte("created_at", hasta)
      .order("created_at", { ascending: false })

    if (filtroSede !== "todas") query = query.eq("sede_id", filtroSede)
    if (filtroTipo !== "todos") query = query.eq("tipo_reporte", filtroTipo)

    const { data } = await query

    if (data) {
      let mapped: ReporteData[] = data.map((r: any) => ({
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
        turno: r.turno || "—",
      }))

      if (busqueda) {
        const q = busqueda.toLowerCase()
        mapped = mapped.filter(r =>
          r.agente_nombre.toLowerCase().includes(q) ||
          r.agente_apellido.toLowerCase().includes(q) ||
          r.sede_nombre.toLowerCase().includes(q)
        )
      }

      setReportes(mapped)
    }
    setCargando(false)
  }, [supabase, filtroFecha, filtroSede, filtroTipo, busqueda])

  useEffect(() => {
    cargarSedes()
  }, [cargarSedes])

  useEffect(() => {
    setCargando(true)
    cargarReportes()
  }, [cargarReportes])

  const stats = {
    total: reportes.length,
    conFoto: reportes.filter(r => r.tipo_reporte === "con_foto" || r.foto_url).length,
    sinNovedades: reportes.filter(r => !r.novedades || r.novedades === "Sin novedades relevantes.").length,
  }

  const exportarCSV = useCallback(async () => {
    setExportando(true)
    try {
      const params = new URLSearchParams({
        tipo: "reportes",
        desde: `${filtroFecha}T00:00:00`,
        hasta: `${filtroFecha}T23:59:59`,
      })
      if (filtroSede !== "todas") params.set("sede_id", filtroSede)

      const response = await fetch(`/api/export?${params}`)
      const { data } = await response.json()
      if (!data?.length) { setExportando(false); return }

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
      a.download = `reportes_${filtroFecha}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error exportando:", err)
    } finally {
      setExportando(false)
    }
  }, [filtroFecha, filtroSede])

  if (cargando) return <LoadingScreen />

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reportes Detallados</h1>
          <p className="text-muted-foreground">Panel de administración de reportes operativos</p>
        </div>
        <Button variant="outline" onClick={exportarCSV} disabled={exportando}>
          {exportando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reportes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{filtroFecha}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Con Evidencia Fotográfica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.conFoto}</div>
            <p className="text-xs text-muted-foreground">{((stats.conFoto / stats.total) * 100 || 0).toFixed(0)}% del total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Novedades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.sinNovedades}</div>
            <p className="text-xs text-muted-foreground">Reportes sin incidentes reportados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
              <Input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Sede</label>
              <Select value={filtroSede} onValueChange={setFiltroSede}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  {sedes.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="con_foto">Con Foto</SelectItem>
                  <SelectItem value="sin_foto">Sin Foto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Buscar agente</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre o sede..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reportes ({reportes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin reportes para esta fecha</p>
              <p className="text-xs">Cambia los filtros para ver más resultados</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {reportes.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/30 transition-colors">
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
                        <Badge variant="outline" className="text-[10px]">
                          {r.turno}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.hora_programada}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.sede_nombre}
                        </span>
                        <span>{new Date(r.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {r.novedades && r.novedades !== "Sin novedades relevantes." && (
                        <p className="mt-1 text-xs text-foreground/80 line-clamp-2">{r.novedades}</p>
                      )}

                      <div className="flex gap-2 mt-2">
                        {r.foto_url && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFotoDialog(r.foto_url)}>
                            <Eye className="mr-1 h-3 w-3" /> Ver foto
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!fotoDialog} onOpenChange={() => setFotoDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evidencia Fotográfica</DialogTitle>
          </DialogHeader>
          {fotoDialog && (
            <div className="relative">
              <img src={fotoDialog} alt="Evidencia" className="w-full h-auto rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
