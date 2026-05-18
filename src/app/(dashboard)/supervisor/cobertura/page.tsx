"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { UserCheck } from "lucide-react"

export default function CoberturaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cobertura de Puestos</h1>
        <p className="text-muted-foreground">Monitorea la cobertura de puestos por sede</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sedes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Sedes asignadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Puestos Cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">De 0 totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sin Cobertura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">0</div>
            <p className="text-xs text-muted-foreground">Puestos críticos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado por Sede</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={UserCheck}
            title="Sin sedes configuradas"
            description="No hay sedes asignadas a tu supervisión"
          />
        </CardContent>
      </Card>
    </div>
  )
}
