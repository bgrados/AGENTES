"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { Building2, Plus, Pencil, Trash2 } from "lucide-react"

interface Empresa {
  id: string
  nombre: string
  ruc: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  activo: boolean
}

export default function EmpresasPage() {
  const { supabase } = useSupabase()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [form, setForm] = useState({ nombre: "", ruc: "", direccion: "", telefono: "", email: "", activo: true })

  useEffect(() => {
    cargarEmpresas()
  }, [])

  async function cargarEmpresas() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("empresas").select("*").order("nombre")
    if (data) setEmpresas(data)
    setLoading(false)
  }

  function abrirNueva() {
    setEditando(null)
    setForm({ nombre: "", ruc: "", direccion: "", telefono: "", email: "", activo: true })
    setDialogOpen(true)
  }

  function abrirEditar(e: Empresa) {
    setEditando(e)
    setForm({ nombre: e.nombre, ruc: e.ruc || "", direccion: e.direccion || "", telefono: e.telefono || "", email: e.email || "", activo: e.activo })
    setDialogOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    const supabaseAny = supabase as any
    const payload = { ...form, ruc: form.ruc || null, direccion: form.direccion || null, telefono: form.telefono || null, email: form.email || null }

    if (editando) {
      await supabaseAny.from("empresas").update(payload).eq("id", editando.id)
    } else {
      await supabaseAny.from("empresas").insert(payload)
    }

    setDialogOpen(false)
    cargarEmpresas()
  }

  async function toggleActivo(e: Empresa) {
    const supabaseAny = supabase as any
    await supabaseAny.from("empresas").update({ activo: !e.activo }).eq("id", e.id)
    cargarEmpresas()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gestiona las empresas registradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirNueva}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div>
                <Label>RUC</Label>
                <Input value={form.ruc} onChange={e => setForm(p => ({ ...p, ruc: e.target.value }))} />
              </div>
              <div>
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
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

      {empresas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState icon={Building2} title="Sin empresas registradas" description="Crea la primera empresa para comenzar" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empresas.map(empresa => (
            <Card key={empresa.id} className={!empresa.activo ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{empresa.nombre}</CardTitle>
                  <Badge variant={empresa.activo ? "success" : "secondary"}>{empresa.activo ? "Activo" : "Inactivo"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {empresa.ruc && <p className="text-muted-foreground">RUC: {empresa.ruc}</p>}
                  {empresa.direccion && <p className="text-muted-foreground">📍 {empresa.direccion}</p>}
                  {empresa.telefono && <p className="text-muted-foreground">📞 {empresa.telefono}</p>}
                  {empresa.email && <p className="text-muted-foreground">✉ {empresa.email}</p>}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => abrirEditar(empresa)}>
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button variant={empresa.activo ? "outline" : "secondary"} size="sm" onClick={() => toggleActivo(empresa)}>
                    {empresa.activo ? "Desactivar" : "Activar"}
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
