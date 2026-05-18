"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { Users, Plus, UserPlus, UserCheck, ClipboardList } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PersonalPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personal</h1>
          <p className="text-muted-foreground">Gestiona la programación de agentes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/supervisor/personal/marcar-manual")}>
            <UserCheck className="mr-2 h-4 w-4" /> Marcar Manual
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Programar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agentes Asignados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={UserPlus}
            title="Sin agentes asignados"
            description="No hay agentes asignados a tus sedes"
          />
        </CardContent>
      </Card>
    </div>
  )
}
