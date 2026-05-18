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
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/shared/empty-state"
import { Users, Plus, Pencil, Shield, ShieldCheck, UserCog, User } from "lucide-react"

interface Usuario {
  id: string
  auth_uid: string | null
  empresa_id: string
  rol_id: string
  codigo: string | null
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  activo: boolean
  roles?: { nombre: string }
  empresas?: { nombre: string }
}

interface Rol { id: string; nombre: string }
interface Empresa { id: string; nombre: string }

const roleIcons: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4 text-red-500" />,
  supervisor: <Shield className="h-4 w-4 text-blue-500" />,
  jefe_grupo: <UserCog className="h-4 w-4 text-yellow-500" />,
  agente: <User className="h-4 w-4 text-green-500" />,
}

export default function UsuariosPage() {
  const { supabase } = useSupabase()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ empresa_id: "", rol_id: "", codigo: "", nombre: "", apellido: "", email: "", telefono: "", activo: true })

  useEffect(() => {
    Promise.all([cargarUsuarios(), cargarRoles(), cargarEmpresas()])
  }, [])

  async function cargarUsuarios() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("usuarios").select("*, roles(nombre), empresas(nombre)").order("nombre")
    if (data) setUsuarios(data)
    setLoading(false)
  }

  async function cargarRoles() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("roles").select("id, nombre")
    if (data) setRoles(data)
  }

  async function cargarEmpresas() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("empresas").select("id, nombre").eq("activo", true)
    if (data) setEmpresas(data)
  }

  function abrirNueva() {
    setEditando(null)
    setForm({ empresa_id: "", rol_id: "", codigo: "", nombre: "", apellido: "", email: "", telefono: "", activo: true })
    setDialogOpen(true)
  }

  function abrirEditar(u: Usuario) {
    setEditando(u)
    setForm({
      empresa_id: u.empresa_id,
      rol_id: u.rol_id,
      codigo: u.codigo || "",
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: u.telefono || "",
      activo: u.activo,
    })
    setDialogOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim() || !form.empresa_id || !form.rol_id) return
    const supabaseAny = supabase as any
    const payload = { ...form, codigo: form.codigo || null, telefono: form.telefono || null }

    if (editando) {
      await supabaseAny.from("usuarios").update(payload).eq("id", editando.id)
    } else {
      await supabaseAny.from("usuarios").insert(payload)
    }

    setDialogOpen(false)
    cargarUsuarios()
  }

  const rolNombre = (r: string | undefined) => r || "sin rol"

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Administra usuarios y roles del sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirNueva}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <Label>Apellido</Label>
                  <Input value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Empresa</Label>
                  <Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={form.rol_id} onValueChange={v => setForm(p => ({ ...p, rol_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Código</Label>
                <Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="USR-001" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={guardar}>{editando ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {usuarios.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState icon={Users} title="Sin usuarios registrados" description="Agrega usuarios al sistema" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {usuarios.map(u => (
                <div key={u.id} className={`flex items-center justify-between p-4 ${!u.activo ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {roleIcons[u.roles?.nombre || ""] || <User className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{u.nombre} {u.apellido}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{u.email}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">{rolNombre(u.roles?.nombre)}</Badge>
                        {u.codigo && <><span>•</span><span>{u.codigo}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.activo ? "success" : "secondary"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
