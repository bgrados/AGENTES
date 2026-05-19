"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/shared/empty-state"
import { Users, Plus, Pencil, Trash2, Camera, Shield, ShieldCheck, UserCog, User, AlertTriangle, QrCode, Download, Loader2 } from "lucide-react"
import QRCode from "qrcode"

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
  foto_url: string | null
  activo: boolean
  roles?: { nombre: string }
  empresas?: { nombre: string }
  agentes?: { codigo: string } | null
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eliminando, setEliminando] = useState<Usuario | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ empresa_id: "", rol_id: "", codigo: "", nombre: "", apellido: "", email: "", telefono: "", foto_url: "", activo: true })
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrInfo, setQrInfo] = useState<{ codigo: string; nombre: string; email: string } | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    Promise.all([cargarUsuarios(), cargarRoles(), cargarEmpresas()])
  }, [])

  async function cargarUsuarios() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("usuarios").select("*, roles(nombre), empresas(nombre), agentes(codigo)").order("nombre")
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
    const nextNum = usuarios.filter(u => u.roles?.nombre === "agente").length + 1
    const codigoSugerido = `AGT-${String(nextNum).padStart(3, "0")}`
    setForm({ empresa_id: "", rol_id: "", codigo: codigoSugerido, nombre: "", apellido: "", email: "", telefono: "", foto_url: "", activo: true })
    setFotoFile(null)
    setDialogOpen(true)
  }

  function abrirEditar(u: Usuario) {
    setEditando(u)
    setForm({
      empresa_id: u.empresa_id,
      rol_id: u.rol_id,
      codigo: u.codigo || u.agentes?.codigo || "",
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: u.telefono || "",
      foto_url: u.foto_url || "",
      activo: u.activo,
    })
    setFotoFile(null)
    setDialogOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim() || !form.empresa_id || !form.rol_id) return
    const supabaseAny = supabase as any
    let fotoUrl = form.foto_url

    if (fotoFile) {
      setSubiendo(true)
      const fileName = `${Date.now()}-${fotoFile.name}`
      const { data: uploadData, error: uploadErr } = await supabaseAny.storage
        .from("agent-photos")
        .upload(fileName, fotoFile, { upsert: true })
      if (uploadErr) {
        alert("Error al subir foto: " + uploadErr.message)
        setSubiendo(false)
        return
      }
      const { data: { publicUrl } } = supabaseAny.storage
        .from("agent-photos")
        .getPublicUrl(fileName)
      fotoUrl = publicUrl
      setSubiendo(false)
    }

    const payload = { ...form, foto_url: fotoUrl || null, codigo: form.codigo || null, telefono: form.telefono || null }

    if (editando) {
      await supabaseAny.from("usuarios").update(payload).eq("id", editando.id)
    } else {
      const { data: nuevoUsuario } = await supabaseAny.from("usuarios").insert(payload).select().single()
      if (nuevoUsuario) {
        const rol = roles.find(r => r.id === form.rol_id)
        if (rol?.nombre === "agente") {
          const codigo = form.codigo || nuevoUsuario.codigo || `AGT-${String(usuarios.length + 1).padStart(3, "0")}`
          await supabaseAny.from("agentes").insert({
            usuario_id: nuevoUsuario.id,
            codigo,
            turno_asignado: "dia",
            activo: true,
          })
        }
      }
    }

    setFotoFile(null)
    setDialogOpen(false)
    await cargarUsuarios()
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    setDeleting(true)
    const supabaseAny = supabase as any
    await supabaseAny.from("agentes").delete().eq("usuario_id", eliminando.id)
    await supabaseAny.from("usuarios").delete().eq("id", eliminando.id)
    setDeleteDialogOpen(false)
    setEliminando(null)
    setDeleting(false)
    cargarUsuarios()
  }

  function abrirEliminar(u: Usuario) {
    setEliminando(u)
    setDeleteDialogOpen(true)
  }

  const abrirQR = useCallback(async (u: Usuario) => {
    const codigo = u.agentes?.codigo || u.codigo
    if (!codigo) return
    setQrInfo({ codigo, nombre: `${u.nombre} ${u.apellido}`, email: u.email })
    setQrDialogOpen(true)
    setGenerando(true)
    await new Promise(r => setTimeout(r, 50))
    if (qrCanvasRef.current) {
      try {
        await QRCode.toCanvas(qrCanvasRef.current, codigo, {
          width: 280,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        })
      } catch {}
    }
    setGenerando(false)
  }, [])

  function descargarQR() {
    const canvas = qrCanvasRef.current
    if (!canvas || !qrInfo) return
    const link = document.createElement("a")
    link.download = `QR-${qrInfo.codigo}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
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
              {editando && (
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={fotoFile ? URL.createObjectURL(fotoFile) : form.foto_url || undefined} />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={subiendo}>
                      <Camera className="mr-2 h-4 w-4" />
                      {form.foto_url ? "Cambiar Foto" : "Subir Foto"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) setFotoFile(file)
                      }}
                    />
                    {fotoFile && (
                      <p className="text-xs text-muted-foreground mt-1">{fotoFile.name}</p>
                    )}
                  </div>
                </div>
              )}
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
                  <Select value={form.rol_id} onValueChange={v => {
                    setForm(p => ({ ...p, rol_id: v }))
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Código</Label>
                <Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="AGT-001" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={guardar}>{editando ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Confirmar Eliminación
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de eliminar a <strong>{eliminando?.nombre} {eliminando?.apellido}</strong>?
              {eliminando?.roles?.nombre === "agente" && (
                <> También se eliminará su registro de agente.</>
              )}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmarEliminar} disabled={deleting}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Código QR — {qrInfo?.codigo}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4 space-y-3">
              {generando ? (
                <Loader2 className="h-20 w-20 animate-spin text-muted-foreground" />
              ) : (
                <div className="rounded-xl border bg-white p-3 shadow-sm">
                  <canvas ref={qrCanvasRef} className="h-[280px] w-[280px]" />
                </div>
              )}
              <div className="text-center">
                <p className="font-bold">{qrInfo?.nombre}</p>
                <p className="text-sm text-muted-foreground">{qrInfo?.codigo}</p>
                <p className="text-xs text-muted-foreground">{qrInfo?.email}</p>
              </div>
              <Button className="w-full" onClick={descargarQR}>
                <Download className="mr-2 h-4 w-4" /> Descargar QR
              </Button>
            </div>
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
                        {u.agentes?.codigo && <><span>•</span><span>{u.agentes.codigo}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.agentes?.codigo && (
                      <Button variant="ghost" size="sm" onClick={() => abrirQR(u)} title="Ver QR">
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Badge variant={u.activo ? "success" : "secondary"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => abrirEliminar(u)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
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
