"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { Clock, History, LogIn, LogOut, Repeat, FileText, CalendarDays } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface Asistencia {
  id: string
  tipo: string
  fecha_hora: string
  sede_id: string
  gps_valido: boolean | null
  qr_valido: boolean | null
  es_manual: boolean
  sedes?: { nombre: string }
}

interface Reporte {
  id: string
  hora_programada: string
  fecha_reporte: string
  tipo_reporte: string
  novedades: string | null
}

const tipoIcon: Record<string, React.ReactNode> = {
  entrada: <LogIn className="h-4 w-4 text-green-500" />,
  salida: <LogOut className="h-4 w-4 text-red-500" />,
  relevo_entrada: <Repeat className="h-4 w-4 text-blue-500" />,
  relevo_salida: <Repeat className="h-4 w-4 text-orange-500" />,
}

const tipoLabel: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  relevo_entrada: "Relevo (entrada)",
  relevo_salida: "Relevo (salida)",
}

export default function HistorialPage() {
  const { supabase } = useSupabase()
  const { usuario, isLoading } = useAuthStore()
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [tab, setTab] = useState<"asistencia" | "reportes">("asistencia")
  const [dias, setDias] = useState("7")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (usuario) {
      setLoading(true)
      Promise.all([cargarAsistencias(), cargarReportes()]).finally(() => setLoading(false))
    }
  }, [usuario, dias])

  async function cargarAsistencias() {
    const supabaseAny = supabase as any
    const { data: agente } = await supabaseAny.from("agentes").select("id").eq("usuario_id", usuario!.id).maybeSingle()
    if (!agente) return

    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias))

    const { data } = await supabaseAny
      .from("asistencia")
      .select("*, sedes(nombre)")
      .eq("agente_id", agente.id)
      .gte("fecha_hora", fechaLimite.toISOString())
      .order("fecha_hora", { ascending: false })

    if (data) setAsistencias(data)
  }

  async function cargarReportes() {
    const supabaseAny = supabase as any
    const { data: agente } = await supabaseAny.from("agentes").select("id").eq("usuario_id", usuario!.id).maybeSingle()
    if (!agente) return

    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias))

    const { data } = await supabaseAny
      .from("reportes")
      .select("*")
      .eq("agente_id", agente.id)
      .gte("created_at", fechaLimite.toISOString())
      .order("created_at", { ascending: false })

    if (data) setReportes(data)
  }

  if (isLoading || loading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-muted-foreground">Tu historial de asistencias y reportes</p>
        </div>
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-[140px]">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="15">Últimos 15 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "asistencia" ? "default" : "outline"} onClick={() => setTab("asistencia")}>
          <Clock className="h-4 w-4 mr-2" /> Asistencias
        </Button>
        <Button variant={tab === "reportes" ? "default" : "outline"} onClick={() => setTab("reportes")}>
          <FileText className="h-4 w-4 mr-2" /> Reportes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tab === "asistencia" ? <History className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {tab === "asistencia" ? "Asistencias" : "Reportes"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tab === "asistencia" ? (
            asistencias.length === 0 ? (
              <EmptyState icon={Clock} title="Sin registros" description="No hay asistencias registradas en este período" />
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {asistencias.map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        {tipoIcon[a.tipo]}
                        <div>
                          <p className="font-medium">{tipoLabel[a.tipo] || a.tipo}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(a.fecha_hora), "PPP p", { locale: es })} • {a.sedes?.nombre || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.gps_valido !== null && (
                          <Badge variant={a.gps_valido ? "success" : "destructive"}>{a.gps_valido ? "GPS OK" : "GPS inválido"}</Badge>
                        )}
                        {a.es_manual && <Badge variant="warning">Manual</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )
          ) : (
            reportes.length === 0 ? (
              <EmptyState icon={FileText} title="Sin reportes" description="No hay reportes en este período" />
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {reportes.map(r => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Reporte {r.hora_programada}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(r.fecha_reporte), "PPP", { locale: es })} •{" "}
                          <Badge variant="outline" className="text-xs">{r.tipo_reporte === "con_foto" ? "Con foto" : "Sin foto"}</Badge>
                        </p>
                        {r.novedades && <p className="text-xs text-muted-foreground mt-1">{r.novedades}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
