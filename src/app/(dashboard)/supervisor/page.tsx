"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useSupabase } from "@/providers/supabase-provider"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Users, MapPin, AlertTriangle, UserCheck, ClipboardCheck, FileText, Clock, Sun, Moon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface Alertas {
  id: string
  tipo: string
  descripcion: string
  fecha: string
  estado: string
}

export default function SupervisorDashboard() {
  const { isLoading } = useAuthStore()
  const { supabase } = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState({ agentesActivos: 0, totalAgentes: 0, puestosCubiertos: 0, totalPuestos: 0, incidenciasHoy: 0, incidenciasPendientes: 0, tardanzas: 0 })
  const [alertas, setAlertas] = useState<Alertas[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const supabaseAny = supabase as any

    const { data: agentes } = await supabaseAny.from("agentes").select("id").eq("activo", true)
    const totalAgentes = agentes?.length || 0

    const hoy = new Date().toISOString().split("T")[0]
    const { data: asistenciasHoy } = await supabaseAny.from("asistencia").select("agente_id, sede_id").gte("fecha_hora", `${hoy}T00:00:00`).lte("fecha_hora", `${hoy}T23:59:59`)
    const agentesActivos = new Set(asistenciasHoy?.map((a: any) => a.agente_id) || []).size

    const { data: puestos } = await supabaseAny.from("puestos").select("id").eq("activo", true)
    const totalPuestos = puestos?.length || 0

    const { data: incidencias } = await supabaseAny.from("incidencias").select("id, tipo, descripcion, fecha, estado").gte("fecha", hoy).order("created_at", { ascending: false })
    const incidenciasHoy = incidencias?.length || 0
    const incidenciasPendientes = incidencias?.filter((i: any) => i.estado === "pendiente").length || 0
    const tardanzas = incidencias?.filter((i: any) => i.tipo === "tardanza").length || 0

    setStats({ agentesActivos, totalAgentes, puestosCubiertos: Math.min(agentesActivos, totalPuestos), totalPuestos, incidenciasHoy, incidenciasPendientes, tardanzas })

    if (incidencias && incidencias.length > 0) {
      setAlertas(incidencias.filter((i: any) => i.estado === "pendiente").slice(0, 5))
    }
    setCargando(false)
  }

  if (isLoading || cargando) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Supervisor</h1>
        <p className="text-muted-foreground">Monitoreo operativo en tiempo real</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Agentes Activos" value={`${stats.agentesActivos}`} description={`De ${stats.totalAgentes} programados`} icon={Users} variant={stats.agentesActivos > 0 ? "success" : "warning"} />
        <StatCard title="Puestos Cubiertos" value={`${stats.puestosCubiertos}/${stats.totalPuestos}`} description={stats.totalPuestos - stats.puestosCubiertos > 0 ? `${stats.totalPuestos - stats.puestosCubiertos} puestos sin cobertura` : "Todos cubiertos"} icon={UserCheck} variant={stats.puestosCubiertos >= stats.totalPuestos ? "success" : "warning"} />
        <StatCard title="Incidencias Hoy" value={`${stats.incidenciasHoy}`} description={`${stats.incidenciasPendientes} pendientes`} icon={AlertTriangle} variant={stats.incidenciasPendientes > 0 ? "destructive" : "default"} />
        <StatCard title="Tardanzas" value={`${stats.tardanzas}`} description="Hoy" icon={ClipboardCheck} variant={stats.tardanzas > 0 ? "destructive" : "default"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button className="w-full justify-start" onClick={() => router.push("/supervisor/mapa")}>
              <MapPin className="mr-2 h-5 w-5" /> Mapa en Vivo
            </Button>
            <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/supervisor/incidencias")}>
              <AlertTriangle className="mr-2 h-5 w-5" /> Incidencias
              {stats.incidenciasPendientes > 0 && <Badge className="ml-auto">{stats.incidenciasPendientes}</Badge>}
            </Button>
            <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/supervisor/personal")}>
              <Users className="mr-2 h-5 w-5" /> Personal
            </Button>
            <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/supervisor/reportes")}>
              <FileText className="mr-2 h-5 w-5" /> Reportes
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/supervisor/cobertura")}>
              <MapPin className="mr-2 h-5 w-5" /> Cobertura
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay alertas activas</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {alertas.map(a => (
                    <div key={a.id} className="flex items-start gap-2 rounded-lg border p-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{a.tipo}</p>
                        <p className="text-xs text-muted-foreground">{a.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
