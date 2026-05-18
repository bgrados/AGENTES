"use client"

import { useAuthStore } from "@/stores/auth-store"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Users, MapPin, AlertTriangle, UserCheck, ClipboardCheck, FileText } from "lucide-react"

export default function SupervisorDashboard() {
  const { isLoading } = useAuthStore()
  const router = useRouter()

  if (isLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Supervisor</h1>
        <p className="text-muted-foreground">Monitoreo operativo en tiempo real</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Agentes Activos" value="0" description="De 12 programados" icon={Users} />
        <StatCard title="Puestos Cubiertos" value="0/0" description="0 puestos sin cobertura" icon={UserCheck} variant="warning" />
        <StatCard title="Incidencias Hoy" value="0" description="0 pendientes" icon={AlertTriangle} />
        <StatCard title="Tardanzas" value="0" description="Hoy" icon={ClipboardCheck} variant="destructive" />
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
            </Button>
            <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/supervisor/personal")}>
              <Users className="mr-2 h-5 w-5" /> Personal
            </Button>
            <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/supervisor/reportes")}>
              <FileText className="mr-2 h-5 w-5" /> Reportes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No hay alertas activas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
