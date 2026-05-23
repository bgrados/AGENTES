"use client"

import { useEffect, useState, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/shared/empty-state"
import { Search, UserCheck, Building2, Plus, X, MapPin, Star, Users, Loader2 } from "lucide-react"

interface AgenteInfo {
  id: string
  codigo: string
  usuario_id: string
  turno_asignado: string
  activo: boolean
  usuarios: {
    nombre: string
    apellido: string
    email: string
  }
}

interface Asignacion {
  id: string
  sede_id: string
  tipo: "principal" | "apoyo"
  activo: boolean
  es_jefe_grupo: boolean
  sedes: {
    nombre: string
    codigo: string
  }
}

interface Sede {
  id: string
  nombre: string
  codigo: string
}

export default function AsignarSedesPage() {
  const { supabase } = useSupabase()
  const [agentes, setAgentes] = useState<AgenteInfo[]>([])
  const [asignaciones, setAsignaciones] = useState<Record<string, Asignacion[]>>({})
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<AgenteInfo | null>(null)
  const [form, setForm] = useState({ sede_id: "", tipo: "apoyo", es_jefe_grupo: false })
  const [guardando, setGuardando] = useState(false)
  const [guardarError, setGuardarError] = useState("")

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const supabaseAny = supabase as any

    const [{ data: agentes }, { data: sedes }, { data: asignaciones }] = await Promise.all([
      supabaseAny.from("agentes").select("*, usuarios!inner(nombre, apellido, email)").eq("activo", true).order("codigo"),
      supabaseAny.from("sedes").select("id, nombre, codigo").eq("activo", true).order("nombre"),
      supabaseAny.from("agentes_sedes").select("id, agente_id, sede_id, tipo, activo, es_jefe_grupo, sedes!inner(nombre, codigo)").eq("activo", true),
    ])

    if (agentes) setAgentes(agentes)
    if (sedes) setSedes(sedes)

    const map: Record<string, Asignacion[]> = {}
    if (asignaciones) {
      for (const a of asignaciones) {
        if (!map[a.agente_id]) map[a.agente_id] = []
        map[a.agente_id].push(a)
      }
    }
    setAsignaciones(map)
    setLoading(false)
  }

  const agentesFiltrados = agentes.filter(a =>
    !search || a.codigo.toLowerCase().includes(search.toLowerCase()) ||
    a.usuarios.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.usuarios.apellido.toLowerCase().includes(search.toLowerCase())
  )

  function abrirAsignar(agente: AgenteInfo) {
    setAgenteSeleccionado(agente)
    setForm({ sede_id: "", tipo: "apoyo", es_jefe_grupo: false })
    setGuardarError("")
    setDialogOpen(true)
  }

  async function guardarAsignacion() {
    if (!agenteSeleccionado || !form.sede_id) return
    setGuardando(true)
    setGuardarError("")

    const supabaseAny = supabase as any

    if (form.tipo === "principal") {
      const existente = (asignaciones[agenteSeleccionado.id] || []).find(a => a.tipo === "principal" && a.activo)
      if (existente) {
        await supabaseAny.from("agentes_sedes").update({ activo: false }).eq("id", existente.id)
      }
    }

    // Determinar es_jefe_grupo
    let esJefe = form.es_jefe_grupo

    // Si se marcó como jefe, verificar que no haya otro jefe en la misma sede
    if (form.es_jefe_grupo) {
      const { data: jefeExistente } = await supabaseAny
        .from("agentes_sedes")
        .select("id, agente_id")
        .eq("sede_id", form.sede_id)
        .eq("es_jefe_grupo", true)
        .eq("activo", true)
        .maybeSingle()

      if (jefeExistente) {
        if (jefeExistente.agente_id !== agenteSeleccionado.id) {
          setGuardarError("Ya existe un jefe de grupo asignado a esta sede. Desmarca al actual primero.")
          setGuardando(false)
          return
        }
        esJefe = true
      }
    }

    // Auto-asignar como jefe si es el primer/único agente en esta sede
    if (!esJefe) {
      const { count } = await supabaseAny
        .from("agentes_sedes")
        .select("*", { count: "exact", head: true })
        .eq("sede_id", form.sede_id)
        .eq("activo", true)

      if (count === 0) {
        esJefe = true
      }
    }

    const { error } = await supabaseAny.from("agentes_sedes").insert({
      agente_id: agenteSeleccionado.id,
      sede_id: form.sede_id,
      tipo: form.tipo,
      activo: true,
      es_jefe_grupo: esJefe,
    })

    if (error) {
      if (error.code === "23505") {
        setGuardarError("El agente ya tiene asignada esta sede")
      } else {
        setGuardarError(error.message || "Error al guardar")
      }
      setGuardando(false)
      return
    }

    if (esJefe) {
      const { data: rolJefe } = await supabaseAny.from("roles").select("id").eq("nombre", "jefe_grupo").maybeSingle()
      if (rolJefe) {
        await supabaseAny.from("usuarios").update({ rol_id: rolJefe.id }).eq("id", agenteSeleccionado.usuario_id)
      }
    }

    setDialogOpen(false)
    setGuardando(false)

    const { data: nuevas } = await supabaseAny.from("agentes_sedes").select("id, agente_id, sede_id, tipo, activo, es_jefe_grupo, sedes!inner(nombre, codigo)").eq("agente_id", agenteSeleccionado.id).eq("activo", true)
    setAsignaciones(prev => ({ ...prev, [agenteSeleccionado.id]: nuevas || [] }))
  }

  async function eliminarAsignacion(agenteId: string, asignacionId: string) {
    const supabaseAny = supabase as any
    await supabaseAny.from("agentes_sedes").update({ activo: false }).eq("id", asignacionId)

    setAsignaciones(prev => ({
      ...prev,
      [agenteId]: (prev[agenteId] || []).filter(a => a.id !== asignacionId),
    }))
  }

  const sedesDisponibles = sedes.filter(s =>
    !(asignaciones[agenteSeleccionado?.id || ""] || []).some(a => a.sede_id === s.id)
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asignar Sedes a Agentes</h1>
        <p className="text-muted-foreground">Asigna una sede principal y sedes de apoyo a cada agente</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar agente por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {agentesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Users}
              title={search ? "Sin resultados" : "Sin agentes registrados"}
              description={search ? "Intenta con otro término de búsqueda" : "Primero debes importar agentes"}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agentesFiltrados.map(agente => {
            const asignacionesAgente = asignaciones[agente.id] || []
            const principal = asignacionesAgente.find(a => a.tipo === "principal")
            const apoyo = asignacionesAgente.filter(a => a.tipo === "apoyo")

            return (
              <Card key={agente.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {agente.usuarios.nombre} {agente.usuarios.apellido}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {agente.codigo} · {agente.usuarios.email}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Turno: {agente.turno_asignado === "dia" ? "Día" : "Noche"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Sedes asignadas:</div>
                    {asignacionesAgente.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Sin sedes asignadas</p>
                    ) : (
                      <div className="space-y-1">
                        {principal && (
                          <div className="flex items-center justify-between rounded-md bg-primary/10 px-2 py-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Star className="h-3 w-3 text-primary" />
                              <span className="font-medium">{principal.sedes.nombre}</span>
                              <Badge variant="default" className="text-[9px] px-1 py-0 h-4">Principal</Badge>
                              {principal.es_jefe_grupo && (
                                <Badge variant="default" className="bg-yellow-500 text-[9px] px-1 py-0 h-4 text-white hover:bg-yellow-600">Jefe</Badge>
                              )}
                            </div>
                            <button
                              onClick={() => eliminarAsignacion(agente.id, principal.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {apoyo.map(a => (
                          <div key={a.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{a.sedes.nombre}</span>
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Apoyo</Badge>
                              {a.es_jefe_grupo && (
                                <Badge variant="default" className="bg-yellow-500 text-[9px] px-1 py-0 h-4 text-white hover:bg-yellow-600">Jefe</Badge>
                              )}
                            </div>
                            <button
                              onClick={() => eliminarAsignacion(agente.id, a.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Dialog open={dialogOpen && agenteSeleccionado?.id === agente.id} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => abrirAsignar(agente)}>
                          <Plus className="h-3 w-3 mr-1" /> Asignar Sede
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Asignar sede a {agente.usuarios.nombre} {agente.usuarios.apellido}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Sede</Label>
                            <Select value={form.sede_id} onValueChange={v => setForm(p => ({ ...p, sede_id: v }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar sede" />
                              </SelectTrigger>
                              <SelectContent>
                                {sedesDisponibles.length === 0 ? (
                                  <SelectItem value="__none__" disabled>Todas las sedes ya están asignadas</SelectItem>
                                ) : (
                                  sedesDisponibles.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.nombre} ({s.codigo})</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Tipo de asignación</Label>
                            <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="principal">
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-primary" /> Principal
                                  </div>
                                </SelectItem>
                                <SelectItem value="apoyo">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" /> Apoyo
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 rounded-md border p-3">
                            <input
                              type="checkbox"
                              id="es-jefe"
                              checked={form.es_jefe_grupo}
                              onChange={e => setForm(p => ({ ...p, es_jefe_grupo: e.target.checked }))}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="es-jefe" className="text-sm cursor-pointer">
                              Marcar como jefe de grupo
                              <p className="text-xs text-muted-foreground font-normal">
                                Solo un jefe de grupo por sede
                              </p>
                            </Label>
                          </div>
                        </div>
                        {guardarError && (
                          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{guardarError}</div>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                          <Button onClick={guardarAsignacion} disabled={guardando || !form.sede_id}>
                            {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Asignar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
