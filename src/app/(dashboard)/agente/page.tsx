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
import { Clock, ClipboardCheck, FileText, MapPin, Wifi, WifiOff, Sun, Moon, Bell, BellOff } from "lucide-react"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { obtenerSedeAgente } from "@/lib/supabase/agente-sede"
import { subscribeToPush } from "@/lib/notifications/push"

export default function AgenteDashboard() {
  const { usuario, isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const { online } = useOffline()
  const router = useRouter()
  const [agenteId, setAgenteId] = useState<string | null>(null)
  const [stats, setStats] = useState({ marcacionHoy: false, reportesHoy: 0, totalReportes: 13, turno: "dia" as const, sede: "", puesto: "" })
  const [cargando, setCargando] = useState(true)
  const [pushSuscrito, setPushSuscrito] = useState(false)
  const [cargandoPush, setCargandoPush] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushSuscrito(Notification.permission === "granted")
    }
  }, [])

  const activarNotificaciones = async () => {
    setCargandoPush(true)
    try {
      const sub = await subscribeToPush()
      if (sub) {
        setPushSuscrito(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoPush(false)
    }
  }

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
        <Card className="glass-panel border-white/10 shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-400" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Button className="w-full justify-start premium-btn-hover bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200" size="lg" onClick={() => router.push("/agente/asistencia")}>
              <ClipboardCheck className="mr-2 h-5 w-5 text-white" />
              Marcar Asistencia
            </Button>
            <Button className="w-full justify-start premium-btn-hover bg-slate-800 text-white hover:bg-slate-700 border border-white/5 transition-all duration-200" size="lg" onClick={() => router.push("/agente/reportes")}>
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Nuevo Reporte Horario
            </Button>
            <Button className="w-full justify-start premium-btn-hover border border-white/10 text-gray-300 hover:bg-slate-800/80 transition-all duration-200" variant="outline" size="lg" onClick={() => router.push("/agente/historial")}>
              <Clock className="mr-2 h-5 w-5 text-blue-400" />
              Ver Mi Historial
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10 shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-3">
            <CardTitle className="text-white">Resumen del Día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm text-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Turno:</span>
              <span className="font-medium text-white">{stats.turno === "dia" ? "Día (07:00 - 19:00)" : "Noche (19:00 - 07:00)"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Sede Principal:</span>
              <span className="font-medium text-white">{stats.sede}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Puesto:</span>
              <span className="font-medium text-white">{stats.puesto}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Estado de Guardia:</span>
              <Badge variant={stats.marcacionHoy ? "success" : "warning"} className="font-semibold">
                {stats.marcacionHoy ? "Marcó Entrada" : "No ha Marcado"}
              </Badge>
            </div>
            <div className="border-t border-white/5 pt-3 mt-1 flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1.5">
                {pushSuscrito ? <Bell className="h-4 w-4 text-green-400 animate-pulse" /> : <BellOff className="h-4 w-4 text-gray-500" />}
                Notificaciones Push:
              </span>
              <Button
                variant={pushSuscrito ? "ghost" : "outline"}
                size="sm"
                onClick={activarNotificaciones}
                disabled={pushSuscrito || cargandoPush}
                className={`h-7 px-2.5 text-xs rounded-md transition-all duration-200 ${
                  pushSuscrito ? "text-green-400 hover:bg-transparent" : "premium-btn-hover border-white/10 hover:bg-slate-800"
                }`}
              >
                {cargandoPush ? "Activando..." : pushSuscrito ? "Activadas" : "Activar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
