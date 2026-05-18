"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { Building2, Plus } from "lucide-react"

export default function EmpresasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gestiona las empresas registradas</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nueva Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Building2}
            title="Sin empresas registradas"
            description="Crea la primera empresa para comenzar"
          />
        </CardContent>
      </Card>
    </div>
  )
}
