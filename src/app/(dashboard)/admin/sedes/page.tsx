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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/shared/empty-state"
import { MapPin, Plus, Pencil, Search, Loader2, Users, UserPlus, Trash2, User, Moon } from "lucide-react"

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
  const [buscandoCoords, setBuscandoCoords] = useState(false)
  const [guardarError, setGuardarError] = useState("")

  useEffect(() => {
    if (!editando && form.nombre.trim()) {
      setForm(p => ({ ...p, codigo: `SEDE-${form.nombre.trim()}` }))
    }
  }, [form.nombre, editando])

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
    setGuardarError("")
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
    setGuardarError("")
    setDialogOpen(true)
  }

  async function guardar() {
    setGuardarError("")
    if (!form.nombre.trim()) { setGuardarError("El nombre es obligatorio"); return }
    if (!form.empresa_id) { setGuardarError("Selecciona una empresa"); return }

    const supabaseAny = supabase as any
    const payload = {
      empresa_id: form.empresa_id,
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim().toUpperCase(),
      direccion: form.direccion.trim() || null,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      radio_gps: parseInt(form.radio_gps) || 100,
      activo: form.activo,
    }

    try {
      let error
      if (editando) {
        const res = await supabaseAny.from("sedes").update(payload).eq("id", editando.id)
        error = res.error
      } else {
        const res = await supabaseAny.from("sedes").insert(payload)
        error = res.error
      }

      if (error) {
        setGuardarError(error.message || "Error al guardar la sede")
        return
      }

      setDialogOpen(false)
      cargarSedes()
    } catch (e: any) {
      setGuardarError(e?.message || "Error inesperado")
    }
  }

  async function buscarCoordenadas() {
    if (!form.direccion.trim()) return
    setBuscandoCoords(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.direccion)}&format=json&limit=1&countrycodes=pe`, { headers: { "Accept-Language": "es" } })
      const data = await res.json()
      if (data?.[0]) {
        setForm(p => ({ ...p, latitud: data[0].lat, longitud: data[0].lon }))
      }
    } catch {
      // ignore
    } finally {
      setBuscandoCoords(false)
    }
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
                  <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Lince1" />
                </div>
                <div>
                  <Label>Código (auto)</Label>
                  <Input value={form.codigo} readOnly className="bg-muted text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <div className="flex gap-2">
                  <Input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} className="flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={buscarCoordenadas} disabled={buscandoCoords || !form.direccion.trim()} title="Buscar coordenadas">
                    {buscandoCoords ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
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
            {guardarError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{guardarError}</div>}
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
