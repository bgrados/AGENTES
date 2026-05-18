"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/shared/empty-state"
import { AlertTriangle, CheckCircle, XCircle, Eye, Clock, MapPin, User } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface Incidencia {
  id: string
  tipo: string
  fecha: string
  hora: string | null
  descripcion: string
  estado: string
  sede_id: string
  agente_id: string | null
  evidencia_url: string | null
  created_at: string
}

const tipoBadge: Record<string, { label: string; variant: "destructive" | "warning" | "secondary" }> = {
  tardanza: { label: "Tardanza", variant: "warning" },
  falta: { label: "Falta", variant: "destructive" },
  gps_invalido: { label: "GPS Inválido", variant: "warning" },
  qr_invalido: { label: "QR Inválido", variant: "warning" },
  reporte_faltante: { label: "Reporte Faltante", variant: "destructive" },
  cobertura: { label: "Cobertura", variant: "secondary" },
  otro: { label: "Otro", variant: "secondary" },
}

export default function IncidenciasPage() {
  const { supabase } = useSupabase()
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Incidencia | null>(null)
  const [tab, setTab] = useState("pendientes")

  useEffect(() => {
    cargarIncidencias()
  }, [])

  async function cargarIncidencias() {
    const supabaseAny = supabase as any
    const { data } = await supabaseAny.from("incidencias").select("*").order("created_at", { ascending: false })
    if (data) setIncidencias(data)
    setLoading(false)
  }

  async function cambiarEstado(id: string, estado: string) {
    const supabaseAny = supabase as any
    await supabaseAny.from("incidencias").update({ estado, validado_at: new Date().toISOString() }).eq("id", id)
    setSelected(null)
    cargarIncidencias()
  }

  const filtradas = incidencias.filter(i => {
    if (tab === "pendientes") return i.estado === "pendiente" || i.estado === "investigacion"
    if (tab === "aprobadas") return i.estado === "aprobada"
    if (tab === "rechazadas") return i.estado === "rechazada"
    return true
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  const pendientesCount = incidencias.filter(i => i.estado === "pendiente" || i.estado === "investigacion").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Incidencias</h1>
        <p className="text-muted-foreground">Gestiona tardanzas, faltas y otras incidencias</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendientes">
            Pendientes
            {pendientesCount > 0 && <Badge className="ml-2" variant="destructive">{pendientesCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="aprobadas">Aprobadas</TabsTrigger>
          <TabsTrigger value="rechazadas">Rechazadas</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardContent className="pt-6">
              {filtradas.length === 0 ? (
                <EmptyState
                  icon={tab === "pendientes" ? AlertTriangle : tab === "aprobadas" ? CheckCircle : XCircle}
                  title={`Sin incidencias ${tab === "pendientes" ? "pendientes" : tab === "aprobadas" ? "aprobadas" : "rechazadas"}`}
                  description="No hay incidencias en esta categoría"
                />
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {filtradas.map(inc => {
                      const tb = tipoBadge[inc.tipo] || { label: inc.tipo, variant: "secondary" as const }
                      return (
                        <div key={inc.id} className="flex items-start justify-between rounded-lg border p-4 cursor-pointer hover:bg-accent/50" onClick={() => setSelected(inc)}>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${inc.estado === "pendiente" ? "text-yellow-500" : inc.estado === "aprobada" ? "text-green-500" : "text-red-500"}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{tb.label}</p>
                                <Badge variant={tb.variant}>{inc.tipo}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{inc.descripcion}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(inc.fecha), "PPP", { locale: es })}
                                {inc.hora && ` - ${inc.hora}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant={inc.estado === "pendiente" ? "warning" : inc.estado === "aprobada" ? "success" : "destructive"}>
                            {inc.estado}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        {selected && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(tipoBadge[selected.tipo]?.label || selected.tipo)}
                <Badge variant={selected.estado === "pendiente" ? "warning" : selected.estado === "aprobada" ? "success" : "destructive"}>{selected.estado}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p>{selected.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p>{format(parseISO(selected.fecha), "PPP", { locale: es })}</p>
                </div>
                {selected.hora && <div>
                  <p className="text-muted-foreground">Hora</p>
                  <p>{selected.hora}</p>
                </div>}
              </div>
              {selected.evidencia_url && (
                <div>
                  <p className="text-sm text-muted-foreground">Evidencia</p>
                  <a href={selected.evidencia_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">Ver evidencia</a>
                </div>
              )}
              {selected.estado === "pendiente" || selected.estado === "investigacion" ? (
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => cambiarEstado(selected.id, "aprobada")}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Aprobar
                  </Button>
                  <Button variant="destructive" onClick={() => cambiarEstado(selected.id, "rechazada")}>
                    <XCircle className="h-4 w-4 mr-2" /> Rechazar
                  </Button>
                </DialogFooter>
              ) : (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
                </DialogFooter>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
