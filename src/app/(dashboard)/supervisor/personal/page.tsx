"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { useJefeSedes } from "@/hooks/use-jefe-sedes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmptyState } from "@/components/shared/empty-state"
import { Users, Plus, UserPlus, UserCheck, Search, Phone, MapPin, Sun, Moon, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

interface AgenteInfo {
  id: string
  codigo: string
  turno_asignado: string
  dia_descanso: number | null
  sede_principal: string | null
  activo: boolean
  usuarios: {
    nombre: string
    apellido: string
    email: string
    telefono: string | null
    foto_url: string | null
  }
  sedes?: { nombre: string }
}

const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default function PersonalPage() {
  const { supabase } = useSupabase()
  const { usuario } = useAuthStore()
  const { sedeIds, esJefe, cargando: cargandoJefe } = useJefeSedes()
  const router = useRouter()
  const [agentes, setAgentes] = useState<AgenteInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    if (!cargandoJefe) cargarAgentes()
  }, [cargandoJefe, sedeIds, esJefe])

  async function cargarAgentes() {
    const supabaseAny = supabase as any

    if (esJefe && sedeIds.length > 0) {
      const { data: rel } = await supabaseAny
        .from("agentes_sedes")
        .select("agente_id, agentes!inner(*, usuarios(nombre, apellido, email, telefono, foto_url), sedes!sede_principal(nombre))")
        .in("sede_id", sedeIds)
        .eq("activo", true)

      const unique = new Map<string, any>()
      if (rel) {
        for (const r of rel) {
          if (r.agentes && !unique.has(r.agente_id)) {
            unique.set(r.agente_id, r.agentes)
          }
        }
      }
      setAgentes(Array.from(unique.values()))
    } else {
      const { data } = await supabaseAny
        .from("agentes")
        .select("*, usuarios(nombre, apellido, email, telefono, foto_url), sedes!sede_principal(nombre)")
        .order("codigo")

      if (data) setAgentes(data)
    }

    setLoading(false)
  }

  const filtrados = agentes.filter(a => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return a.usuarios.nombre.toLowerCase().includes(q) ||
      a.usuarios.apellido.toLowerCase().includes(q) ||
      a.codigo.toLowerCase().includes(q) ||
      a.usuarios.email.toLowerCase().includes(q)
  })

  if (loading || cargandoJefe) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

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
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar agente por nombre, código o email..."
          className="pl-9"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {agentes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agentes Asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState icon={UserPlus} title="Sin agentes asignados" description="No hay agentes asignados a tus sedes" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agentes ({filtrados.length})
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {filtrados.map(a => {
                const iniciales = `${a.usuarios.nombre[0]}${a.usuarios.apellido[0]}`
                return (
                  <div key={a.id} className={`flex items-center justify-between p-4 ${!a.activo ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={a.activo ? "bg-primary/10" : "bg-muted"}>{iniciales}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{a.usuarios.nombre} {a.usuarios.apellido}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{a.codigo}</span>
                          <span>•</span>
                          {a.turno_asignado === "dia" ? (
                            <span className="inline-flex items-center gap-1"><Sun className="h-3 w-3" /> Día</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Moon className="h-3 w-3" /> Noche</span>
                          )}
                          {a.dia_descanso !== null && (
                            <><span>•</span><span>Descanso: {diasSemana[a.dia_descanso]}</span></>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {a.usuarios.telefono && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {a.usuarios.telefono}</span>}
                          {a.sedes?.nombre && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.sedes.nombre}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge variant={a.activo ? "success" : "secondary"}>{a.activo ? "Activo" : "Inactivo"}</Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
