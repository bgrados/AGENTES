"use client"

import { useAuthStore } from "@/stores/auth-store"
import { useOffline } from "@/hooks/use-offline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Clock, ClipboardCheck, FileText, MapPin, Wifi, WifiOff } from "lucide-react"
import { LoadingScreen } from "@/components/shared/loading-screen"

export default function AgenteDashboard() {
  const { usuario, isLoading } = useAuthStore()
  const { online } = useOffline()
  const router = useRouter()

  if (isLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hola, {usuario?.nombre}
          </h1>
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
          title="Próxima Marcación"
          value="Entrada 07:00"
          icon={Clock}
        />
        <StatCard
          title="Turno"
          value={usuario?.rol === "jefe_grupo" ? "Jefe Grupo" : "Agente"}
          icon={MapPin}
        />
        <StatCard
          title="Estado"
          value="Pendiente"
          description="No has marcado hoy"
          icon={ClipboardCheck}
          variant="warning"
        />
        <StatCard
          title="Reportes Hoy"
          value="0/13"
          description="13 reportes requeridos"
          icon={FileText}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acción Rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              size="lg"
              onClick={() => router.push("/agente/asistencia")}
            >
              <ClipboardCheck className="mr-2 h-5 w-5" />
              Marcar Asistencia
            </Button>
            <Button
              className="w-full justify-start"
              variant="secondary"
              size="lg"
              onClick={() => router.push("/agente/reportes")}
            >
              <FileText className="mr-2 h-5 w-5" />
              Nuevo Reporte
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
              <span className="font-medium">Día (07:00 - 19:00)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sede:</span>
              <span className="font-medium">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Puesto:</span>
              <span className="font-medium">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descanso:</span>
              <span className="font-medium">Domingo</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
