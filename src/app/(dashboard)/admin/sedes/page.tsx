"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { MapPin, Plus, Pencil } from "lucide-react"

interface Sede {
  id: string
  empresa_id: string
  nombre: string
  direccion: string | null
  latitud: number | null
  longitud: number | null
  radio_gps: number
  codigo: string
  activo: boolean
  empresas?: { nombre: string }
}

interface Empresa { id: string; nombre: string }

export default function SedesPage() {
  const { supabase } = useSupabase()
  const [sedes, setSedes] = useState<Sede[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Sede | null>(null)
  const [form, setForm] = useState({
    empresa_id: "", nombre: "", codigo: "", direccion: "", latitud: "", longitud: "", radio_gps: "100", activo: true,
  })

  useEffect(() => {
    Promise.all([cargarSedes(), cargarEmpresas()])
  }, [])

  async function cargarSedes() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("sedes").select("*, empresas(nombre)").order("nombre")
    if (data) setSedes(data)
    setLoading(false)
  }

  async function cargarEmpresas() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("empresas").select("id, nombre").eq("activo", true)
    if (data) setEmpresas(data)
  }

  function abrirNueva() {
    setEditando(null)
    setForm({ empresa_id: "", nombre: "", codigo: "", direccion: "", latitud: "", longitud: "", radio_gps: "100", activo: true })
    setDialogOpen(true)
  }

  function abrirEditar(s: Sede) {
    setEditando(s)
    setForm({
      empresa_id: s.empresa_id,
      nombre: s.nombre,
      codigo: s.codigo,
      direccion: s.direccion || "",
      latitud: s.latitud?.toString() || "",
      longitud: s.longitud?.toString() || "",
      radio_gps: s.radio_gps.toString(),
      activo: s.activo,
    })
    setDialogOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.codigo.trim() || !form.empresa_id) return
    const supabaseAny = supabase as any
    const payload = {
      empresa_id: form.empresa_id,
      nombre: form.nombre,
      codigo: form.codigo.toUpperCase(),
      direccion: form.direccion || null,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      radio_gps: parseInt(form.radio_gps) || 100,
      activo: form.activo,
    }

    if (editando) {
      await supabaseAny.from("sedes").update(payload).eq("id", editando.id)
    } else {
      await supabaseAny.from("sedes").insert(payload)
    }

    setDialogOpen(false)
    cargarSedes()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sedes</h1>
          <p className="text-muted-foreground">Configura las sedes y puestos de trabajo</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirNueva}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Sede
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Sede" : "Nueva Sede"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Empresa</Label>
                <Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <Label>Código</Label>
                  <Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="SEDE-001" />
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Latitud</Label>
                  <Input value={form.latitud} onChange={e => setForm(p => ({ ...p, latitud: e.target.value }))} placeholder="-12.0464" />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input value={form.longitud} onChange={e => setForm(p => ({ ...p, longitud: e.target.value }))} placeholder="-77.0428" />
                </div>
                <div>
                  <Label>Radio GPS (m)</Label>
                  <Input type="number" value={form.radio_gps} onChange={e => setForm(p => ({ ...p, radio_gps: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={guardar}>{editando ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sedes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState icon={MapPin} title="Sin sedes registradas" description="Crea una sede para comenzar" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sedes.map(sede => (
            <Card key={sede.id} className={!sede.activo ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{sede.nombre}</CardTitle>
                    <p className="text-xs text-muted-foreground">{sede.codigo}</p>
                  </div>
                  <Badge variant={sede.activo ? "success" : "secondary"}>{sede.activo ? "Activo" : "Inactivo"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Empresa: {sede.empresas?.nombre || "-"}</p>
                  {sede.direccion && <p className="text-muted-foreground">📍 {sede.direccion}</p>}
                  {sede.latitud && sede.longitud && <p className="text-muted-foreground">🗺 {sede.latitud}, {sede.longitud}</p>}
                  <p className="text-muted-foreground">Radio GPS: {sede.radio_gps}m</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => abrirEditar(sede)}>
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
