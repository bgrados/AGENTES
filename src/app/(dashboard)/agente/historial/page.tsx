"use client"

import { useAuthStore } from "@/stores/auth-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { Clock, History } from "lucide-react"

export default function HistorialPage() {
  const { isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-muted-foreground">Tu historial de asistencias y reportes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Asistencias Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Clock}
            title="Sin registros"
            description="No hay asistencias registradas en los últimos días"
          />
        </CardContent>
      </Card>
    </div>
  )
}
