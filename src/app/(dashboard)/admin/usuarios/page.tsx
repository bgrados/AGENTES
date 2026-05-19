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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/shared/empty-state"
import { Users, Plus, Pencil, Trash2, Camera, Shield, ShieldCheck, UserCog, User, AlertTriangle, QrCode, Download, Loader2, MoreHorizontal } from "lucide-react"
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
  dni: string | null
  ruc: string | null
  activo: boolean
  roles?: { nombre: string }
  empresas?: { nombre: string }
  agentes?: { codigo: string; sede_principal: string | null; sedes?: { nombre: string } | null } | null
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
  const [form, setForm] = useState({ empresa_id: "", rol_id: "", codigo: "", nombre: "", apellido: "", email: "", telefono: "", dni: "", foto_url: "", activo: true })
  const rucCalculado = form.dni.length === 8 ? `10${form.dni}` : ""
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrInfo, setQrInfo] = useState<{ codigo: string; nombre: string; email: string } | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [generando, setGenerando] = useState(false)
  const [creandoAcceso, setCreandoAcceso] = useState(false)
  const [accesoMsg, setAccesoMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([cargarUsuarios(), cargarRoles(), cargarEmpresas()])
  }, [])

  async function cargarUsuarios() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("usuarios").select("*, roles(nombre), empresas(nombre), agentes(codigo, sede_principal, sedes!sede_principal(nombre))").order("apellido")
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
    setForm({ empresa_id: "", rol_id: "", codigo: "", nombre: "", apellido: "", email: "", telefono: "", dni: "", foto_url: "", activo: true })
    setFotoFile(null)
    setDialogOpen(true)
  }

  function sugerirCodigo(rolId: string) {
    const rol = roles.find(r => r.id === rolId)
    const prefix = rol?.nombre === "jefe_grupo" ? "JEF" : "AGT"
    const count = usuarios.filter(u => {
      const r = u.roles?.nombre
      if (rol?.nombre === "jefe_grupo") return r === "jefe_grupo"
      return r === "agente"
    }).length + 1
    setForm(p => ({ ...p, codigo: `${prefix}-${String(count).padStart(3, "0")}` }))
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
      dni: u.dni || "",
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

    const payload = { ...form, foto_url: fotoUrl || null, codigo: form.codigo || null, telefono: form.telefono || null, dni: form.dni || null, ruc: rucCalculado || null }

    if (editando) {
      await supabaseAny.from("usuarios").update(payload).eq("id", editando.id)
    } else {
      const { data: nuevoUsuario } = await supabaseAny.from("usuarios").insert(payload).select().single()
      if (nuevoUsuario) {
        const rol = roles.find(r => r.id === form.rol_id)
        if (rol?.nombre === "agente" || rol?.nombre === "jefe_grupo") {
          const prefix = rol?.nombre === "jefe_grupo" ? "JEF" : "AGT"
          const codigo = form.codigo || nuevoUsuario.codigo || `${prefix}-${String(usuarios.length + 1).padStart(3, "0")}`
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

  async function crearAcceso(u: Usuario) {
    if (!u.dni || u.dni.length !== 8) {
      setAccesoMsg("El usuario debe tener DNI de 8 dígitos")
      return
    }
    setCreandoAcceso(true)
    setAccesoMsg(null)
    try {
      const res = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: u.id, email: u.email, password: u.dni }),
      })
      const data = await res.json()
      if (data.success) {
        setAccesoMsg("Acceso creado: usuario=" + u.email + " clave=" + u.dni)
        cargarUsuarios()
      } else {
        setAccesoMsg("Error: " + data.error)
      }
    } catch {
      setAccesoMsg("Error de conexión")
    } finally {
      setCreandoAcceso(false)
    }
  }

  const abrirQR = useCallback((u: Usuario) => {
    const codigo = u.agentes?.codigo || u.codigo
    if (!codigo) return
    setQrInfo({ codigo, nombre: `${u.nombre} ${u.apellido}`, email: u.email })
    setQrDialogOpen(true)
  }, [])

  const qrCanvasRefCallback = useCallback((node: HTMLCanvasElement | null) => {
    qrCanvasRef.current = node
    if (node && qrInfo && qrDialogOpen) {
      setGenerando(true)
      QRCode.toCanvas(node, qrInfo.codigo, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .catch(() => {})
        .finally(() => setGenerando(false))
    }
  }, [qrInfo, qrDialogOpen])

  function descargarQR() {
    const canvas = qrCanvasRef.current
    if (!canvas || !qrInfo) return
    const link = document.createElement("a")
    link.download = `QR-${qrInfo.codigo}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const rolNombre = (r: string | undefined) => {
    if (!r) return "sin rol"
    const mapa: Record<string, string> = { jefe_grupo: "Jefe de Grupo", admin: "Admin", supervisor: "Supervisor", agente: "Agente" }
    return mapa[r] || r
  }

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
                    if (!editando) sugerirCodigo(v)
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>DNI</Label>
                  <Input value={form.dni} onChange={e => setForm(p => ({ ...p, dni: e.target.value }))} placeholder="12345678" maxLength={8} />
                </div>
                <div>
                  <Label>RUC</Label>
                  <Input value={rucCalculado || "---"} readOnly className="bg-muted text-muted-foreground" />
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
              {(eliminando?.roles?.nombre === "agente" || eliminando?.roles?.nombre === "jefe_grupo") && (
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

        <Dialog open={qrDialogOpen} onOpenChange={(open) => {
              if (!open) {
                const ctx = qrCanvasRef.current?.getContext("2d")
                if (ctx) ctx.clearRect(0, 0, 280, 280)
              }
              setQrDialogOpen(open)
            }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Código QR — {qrInfo?.codigo}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="relative">
                {generando && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className={`rounded-xl border bg-white p-3 shadow-sm ${generando ? "opacity-30" : ""}`}>
                  <canvas ref={qrCanvasRefCallback} className="h-[280px] w-[280px] max-w-full" />
                </div>
              </div>
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
              {usuarios.map(u => {
                const codigoQR = u.agentes?.codigo || u.codigo || u.email
                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-2 p-4 cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent ${!u.activo ? "opacity-50" : ""}`}
                    onClick={() => abrirEditar(u)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {roleIcons[u.roles?.nombre || ""] || <User className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{u.apellido}, {u.nombre}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="truncate max-w-[100px] sm:max-w-none">{u.email}</span>
                        <span className="hidden sm:inline">•</span>
                        <Badge variant="outline" className="text-xs shrink-0">{rolNombre(u.roles?.nombre)}</Badge>
                        {u.agentes?.sedes?.nombre && <><span className="hidden sm:inline">•</span><span className="shrink-0">{u.agentes.sedes.nombre}</span></>}
                        {u.dni && <><span className="hidden sm:inline">•</span><span className="shrink-0">DNI: {u.dni}</span></>}
                        {u.dni?.length === 8 && <><span className="hidden sm:inline">•</span><span className="shrink-0">RUC: 10{u.dni}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={u.activo ? "success" : "secondary"} className="hidden sm:inline-flex">{u.activo ? "Activo" : "Inactivo"}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-accent active:bg-accent transition-colors"
                            title="Acciones"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => abrirQR({ ...u, codigo: codigoQR })}>
                            <QrCode className="h-4 w-4 mr-2" /> Ver QR
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => crearAcceso(u)} disabled={creandoAcceso || !u.dni || u.dni.length !== 8}>
                            {creandoAcceso ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                            Crear acceso
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => abrirEliminar(u)} className="text-red-500 focus:text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                        {accesoMsg && (
                          <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-popover px-4 py-3 text-sm shadow-lg border max-w-sm" onClick={() => setAccesoMsg(null)}>
                            {accesoMsg}
                          </div>
                        )}
                      </DropdownMenu>
                    </div>
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
