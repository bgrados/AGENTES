"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export default function IncidenciasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Incidencias</h1>
        <p className="text-muted-foreground">Gestiona tardanzas, faltas y otras incidencias</p>
      </div>

      <Tabs defaultValue="pendientes">
        <TabsList>
          <TabsTrigger value="pendientes">
            Pendientes
            <Badge className="ml-2" variant="destructive">0</Badge>
          </TabsTrigger>
          <TabsTrigger value="aprobadas">Aprobadas</TabsTrigger>
          <TabsTrigger value="rechazadas">Rechazadas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendientes">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={AlertTriangle}
                title="Sin incidencias pendientes"
                description="No hay incidencias pendientes de revisión"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="aprobadas">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CheckCircle}
                title="Sin incidencias aprobadas"
                description="No hay incidencias aprobadas"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rechazadas">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={XCircle}
                title="Sin incidencias rechazadas"
                description="No hay incidencias rechazadas"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
