"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSupabase } from "@/providers/supabase-provider"
import { useOffline } from "@/hooks/use-offline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Clock, ClipboardCheck, FileText, MapPin, Wifi, WifiOff, Sun, Moon } from "lucide-react"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { obtenerSedeAgente } from "@/lib/supabase/agente-sede"

export default function AgenteDashboard() {
  const { usuario, isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const { online } = useOffline()
  const router = useRouter()
  const [agenteId, setAgenteId] = useState<string | null>(null)
  const [stats, setStats] = useState({ marcacionHoy: false, reportesHoy: 0, totalReportes: 13, turno: "dia" as const, sede: "", puesto: "" })
  const [cargando, setCargando] = useState(true)

  const cargarDatos = useCallback(async () => {
    if (!usuario) return
    const supabaseAny = supabase as any

    const { data: agente } = await supabaseAny.from("agentes").select("*").eq("usuario_id", usuario.id).maybeSingle()
    if (!agente || !agente.id) { setCargando(false); return }

    setAgenteId(agente.id)

    const sede = await obtenerSedeAgente(supabaseAny, agente.id)

    const hoy = new Date().toISOString().split("T")[0]

    const { data: asistenciasHoy } = await supabaseAny.from("asistencia").select("id").eq("agente_id", agente.id).gte("fecha_hora", `${hoy}T00:00:00`).lte("fecha_hora", `${hoy}T23:59:59`)

    const { data: reportesHoy } = await supabaseAny.from("reportes").select("id").eq("agente_id", agente.id).eq("fecha_reporte", hoy)

    const esNoche = agente.turno_asignado === "noche"
    const totalRpt = esNoche ? 13 : 2

    setStats({
      marcacionHoy: (asistenciasHoy?.length || 0) > 0,
      reportesHoy: reportesHoy?.length || 0,
      totalReportes: totalRpt,
      turno: agente.turno_asignado,
      sede: sede?.nombre || "-",
      puesto: "-",
    })
    setCargando(false)
  }, [supabase, usuario])

  useEffect(() => {
    if (usuario) cargarDatos()
  }, [usuario, cargarDatos])

  if (isLoading || cargando) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {usuario?.nombre}</h1>
          <p className="text-muted-foreground">
            {online ? (
              <span className="inline-flex items-center gap-1 text-green-500">
                <Wifi className="h-3 w-3" /> Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-yellow-500">
                <WifiOff className="h-3 w-3" /> Modo offline
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Marcación Hoy"
          value={stats.marcacionHoy ? "Completada" : "Pendiente"}
          icon={Clock}
          variant={stats.marcacionHoy ? "success" : "warning"}
        />
        <StatCard
          title="Turno"
          value={stats.turno === "dia" ? "Día" : "Noche"}
          icon={stats.turno === "dia" ? Sun : Moon}
          description={stats.turno === "dia" ? "07:00 - 19:00" : "19:00 - 07:00"}
        />
        <StatCard
          title="Reportes Hoy"
          value={`${stats.reportesHoy}/${stats.totalReportes}`}
          description={`${stats.totalReportes} reportes requeridos`}
          icon={FileText}
          variant={stats.reportesHoy >= stats.totalReportes ? "success" : "warning"}
        />
        <StatCard
          title="Sede"
          value={stats.sede}
          icon={MapPin}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acción Rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" size="lg" onClick={() => router.push("/agente/asistencia")}>
              <ClipboardCheck className="mr-2 h-5 w-5" />
              Marcar Asistencia
            </Button>
            <Button className="w-full justify-start" variant="secondary" size="lg" onClick={() => router.push("/agente/reportes")}>
              <FileText className="mr-2 h-5 w-5" />
              Nuevo Reporte
            </Button>
            <Button className="w-full justify-start" variant="outline" size="lg" onClick={() => router.push("/agente/historial")}>
              <Clock className="mr-2 h-5 w-5" />
              Ver Historial
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen del Día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turno:</span>
              <span className="font-medium">{stats.turno === "dia" ? "Día (07:00 - 19:00)" : "Noche (19:00 - 07:00)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sede:</span>
              <span className="font-medium">{stats.sede}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Puesto:</span>
              <span className="font-medium">{stats.puesto}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant={stats.marcacionHoy ? "success" : "warning"}>{stats.marcacionHoy ? "Marcó entrada" : "No ha marcado"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
