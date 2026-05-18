"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { FileText, Download } from "lucide-react"

export default function ReportesSupervisorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">Visualiza y exporta reportes operativos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Reportes del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0/13</div>
            <p className="text-xs text-muted-foreground">Reportes completados hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Con Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0/7</div>
            <p className="text-xs text-muted-foreground">Reportes con evidencia fotográfica</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sin Novedades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Reportes sin novedades registradas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="Sin reportes"
            description="No hay reportes registrados hoy"
          />
        </CardContent>
      </Card>
    </div>
  )
}
