"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { MapPin, Plus } from "lucide-react"

export default function SedesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sedes</h1>
          <p className="text-muted-foreground">Configura las sedes y puestos de trabajo</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nueva Sede
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Sedes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={MapPin}
            title="Sin sedes registradas"
            description="Crea una sede para comenzar"
          />
        </CardContent>
      </Card>
    </div>
  )
}
