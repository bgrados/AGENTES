"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { Users, Plus } from "lucide-react"

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Administra usuarios y roles del sistema</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="Sin usuarios registrados"
            description="Agrega usuarios al sistema"
          />
        </CardContent>
      </Card>
    </div>
  )
}
