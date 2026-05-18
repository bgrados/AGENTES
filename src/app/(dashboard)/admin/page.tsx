"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Building2, Users, MapPin, Settings, Shield, Activity, ClipboardCheck, AlertTriangle } from "lucide-react"

export default function AdminDashboard() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState({ empresas: 0, sedes: 0, usuarios: 0, agentes: 0, asistenciasHoy: 0, incidenciasPendientes: 0 })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const supabaseAny = supabase as any

    const [{ count: empresas }, { count: sedes }, { count: usuarios }, { count: agentes }] = await Promise.all([
      supabaseAny.from("empresas").select("*", { count: "exact", head: true }),
      supabaseAny.from("sedes").select("*", { count: "exact", head: true }).eq("activo", true),
      supabaseAny.from("usuarios").select("*", { count: "exact", head: true }).eq("activo", true),
      supabaseAny.from("agentes").select("*", { count: "exact", head: true }).eq("activo", true),
    ])

    const hoy = new Date().toISOString().split("T")[0]
    const { count: asistenciasHoy } = await supabaseAny.from("asistencia").select("*", { count: "exact", head: true }).gte("fecha_hora", `${hoy}T00:00:00`).lte("fecha_hora", `${hoy}T23:59:59`)

    const { count: incidenciasPendientes } = await supabaseAny.from("incidencias").select("*", { count: "exact", head: true }).in("estado", ["pendiente", "investigacion"])

    setStats({
      empresas: empresas || 0,
      sedes: sedes || 0,
      usuarios: usuarios || 0,
      agentes: agentes || 0,
      asistenciasHoy: asistenciasHoy || 0,
      incidenciasPendientes: incidenciasPendientes || 0,
    })
    setCargando(false)
  }

  if (cargando) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">Configuración y gestión del sistema</p>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Asistencias Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.asistenciasHoy}</div>
            <p className="text-sm text-muted-foreground">Marcaciones registradas hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incidencias Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.incidenciasPendientes > 0 ? "text-red-500" : "text-green-500"}`}>{stats.incidenciasPendientes}</div>
            <p className="text-sm text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
