"use client"

import { useEffect, useState, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Building2, Users, MapPin, Settings, Shield, Activity, ClipboardCheck, AlertTriangle, Download, RefreshCw, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface UltimaAsistencia {
  id: string
  agente_nombre: string
  sede_nombre: string
  tipo: string
  fecha_hora: string
}

export default function AdminDashboard() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState({
    empresas: 0, sedes: 0, usuarios: 0, agentes: 0,
    asistenciasHoy: 0, reportesHoy: 0, incidenciasPendientes: 0,
  })
  const [ultimasAsistencias, setUltimasAsistencias] = useState<UltimaAsistencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [exportando, setExportando] = useState(false)

  const cargarDatos = useCallback(async () => {
    const supabaseAny = supabase as any

    const [{ count: empresas }, { count: sedes }, { count: usuarios }, { count: agentes }] = await Promise.all([
      supabaseAny.from("empresas").select("*", { count: "exact", head: true }),
      supabaseAny.from("sedes").select("*", { count: "exact", head: true }).eq("activo", true),
      supabaseAny.from("usuarios").select("*", { count: "exact", head: true }).eq("activo", true),
      supabaseAny.from("agentes").select("*", { count: "exact", head: true }).eq("activo", true),
    ])

    const hoy = new Date().toISOString().split("T")[0]

    const [{ count: asistenciasHoy }, { count: reportesHoy }, { count: incidenciasPendientes }] = await Promise.all([
      supabaseAny.from("asistencia").select("*", { count: "exact", head: true }).gte("fecha_hora", `${hoy}T00:00:00`).lte("fecha_hora", `${hoy}T23:59:59`),
      supabaseAny.from("reportes").select("*", { count: "exact", head: true }).gte("created_at", `${hoy}T00:00:00`).lte("created_at", `${hoy}T23:59:59`),
      supabaseAny.from("incidencias").select("*", { count: "exact", head: true }).in("estado", ["pendiente", "investigacion"]),
    ])

    // Last 8 attendance records
    const { data: ultimas } = await supabaseAny
      .from("asistencia")
      .select("id, tipo, fecha_hora, agentes(usuarios(nombre, apellido)), sedes(nombre)")
      .gte("fecha_hora", `${hoy}T00:00:00`)
      .order("fecha_hora", { ascending: false })
      .limit(8)

    if (ultimas) {
      setUltimasAsistencias(
        ultimas.map((a: any) => ({
          id: a.id,
          agente_nombre: `${a.agentes?.usuarios?.nombre || ""} ${a.agentes?.usuarios?.apellido || ""}`.trim() || "Agente",
          sede_nombre: a.sedes?.nombre || "—",
          tipo: a.tipo || "entrada",
          fecha_hora: a.fecha_hora,
        }))
      )
    }

    setStats({
      empresas: empresas || 0, sedes: sedes || 0,
      usuarios: usuarios || 0, agentes: agentes || 0,
      asistenciasHoy: asistenciasHoy || 0,
      reportesHoy: reportesHoy || 0,
      incidenciasPendientes: incidenciasPendientes || 0,
    })
    setCargando(false)
  }, [supabase])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const handleRefresh = async () => {
    setRefrescando(true)
    await cargarDatos()
    setRefrescando(false)
  }

  const handleExport = async (tipo: string) => {
    setExportando(true)
    try {
      const hoy = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/export?tipo=${tipo}&desde=${hoy}T00:00:00&hasta=${hoy}T23:59:59`)
      const { data } = await response.json()
      if (!data?.length) return

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
      a.download = `${tipo}_${hoy}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      console.error("Error exporting")
    } finally {
      setExportando(false)
    }
  }

  if (cargando) return <LoadingScreen />

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Configuración y gestión del sistema</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refrescando}>
          <RefreshCw className={`h-4 w-4 ${refrescando ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Empresas" value={stats.empresas} icon={Building2} />
        <StatCard title="Sedes" value={stats.sedes} icon={MapPin} />
        <StatCard title="Usuarios" value={stats.usuarios} icon={Users} />
        <StatCard title="Agentes" value={stats.agentes} icon={Shield} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push("/admin/empresas")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.empresas}</div>
            <p className="text-sm text-muted-foreground">Gestiona las empresas del sistema</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push("/admin/sedes")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Sedes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sedes}</div>
            <p className="text-sm text-muted-foreground">Configura sedes y puestos de trabajo</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push("/admin/usuarios")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usuarios}</div>
            <p className="text-sm text-muted-foreground">Administra usuarios y roles</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push("/admin/configuracion")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Parámetros generales del sistema</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Auditoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Logs de actividad del sistema</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Asistencias Hoy
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => handleExport("asistencia")} disabled={exportando}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">{stats.asistenciasHoy}</div>
            <p className="text-sm text-muted-foreground">Marcaciones registradas hoy</p>

            {ultimasAsistencias.length > 0 && (
              <ScrollArea className="max-h-[200px] mt-2">
                <div className="space-y-2">
                  {ultimasAsistencias.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.agente_nombre}</span>
                        <Badge variant={a.tipo === "entrada" ? "default" : "secondary"} className="text-[10px]">
                          {a.tipo}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(a.fecha_hora), "HH:mm", { locale: es })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Operativo del Día
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => handleExport("reportes")} disabled={exportando}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <div className="text-2xl font-bold">{stats.reportesHoy}</div>
                <p className="text-xs text-muted-foreground">Reportes Hoy</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <div className={`text-2xl font-bold ${stats.incidenciasPendientes > 0 ? "text-red-500" : "text-green-500"}`}>
                  {stats.incidenciasPendientes}
                </div>
                <p className="text-xs text-muted-foreground">Incidencias Pend.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
