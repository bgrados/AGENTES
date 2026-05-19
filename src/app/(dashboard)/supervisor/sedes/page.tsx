"use client"

import { useEffect, useState, useRef } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useAuthStore } from "@/stores/auth-store"
import { useJefeSedes } from "@/hooks/use-jefe-sedes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { MapPin, Upload, Download, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface Sede {
  id: string
  nombre: string
  codigo: string
  direccion: string | null
  latitud: number | null
  longitud: number | null
  radio_gps: number
  activo: boolean
}

interface CsvRow {
  nombre: string
  codigo: string
  direccion: string
  latitud: string
  longitud: string
  radio_gps: string
}

export default function SupervisorSedesPage() {
  const { supabase } = useSupabase()
  const { usuario } = useAuthStore()
  const { sedeIds, esJefe, cargando: cargandoJefe } = useJefeSedes()
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; err: number; errores: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (usuario && !cargandoJefe) cargarSedes()
  }, [usuario, cargandoJefe, sedeIds])

  async function cargarSedes() {
    const supabaseAny = supabase as any
    let query = supabaseAny.from("sedes").select("*").eq("empresa_id", usuario!.empresa_id)

    if (esJefe && sedeIds.length > 0) {
      query = query.in("id", sedeIds)
    }

    const { data } = await query.order("nombre")
    if (data) setSedes(data)
    setLoading(false)
  }

  function parseCsv(text: string): CsvRow[] {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""))
    const rows: CsvRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""))
      const row: any = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] ?? "" })
      if (row.nombre && row.codigo) rows.push(row as CsvRow)
    }
    return rows
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setResultado(null)
    const text = await file.text()
    const rows = parseCsv(text)
    let ok = 0
    let err = 0
    const errores: string[] = []
    const supabaseAny = supabase as any

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      try {
        const payload: any = {
          empresa_id: usuario!.empresa_id,
          nombre: r.nombre,
          codigo: r.codigo.toUpperCase(),
          direccion: r.direccion || null,
          latitud: r.latitud ? parseFloat(r.latitud) : null,
          longitud: r.longitud ? parseFloat(r.longitud) : null,
          radio_gps: parseInt(r.radio_gps) || 100,
          activo: true,
        }

        const { data: existente } = await supabaseAny.from("sedes").select("id").eq("codigo", payload.codigo).eq("empresa_id", usuario!.empresa_id).maybeSingle()

        if (existente) {
          await supabaseAny.from("sedes").update(payload).eq("id", existente.id)
        } else {
          await supabaseAny.from("sedes").insert(payload)
        }
        ok++
      } catch {
        err++
        errores.push(`Fila ${i + 2}: ${r.codigo || r.nombre}`)
      }
    }

    setResultado({ ok, err, errores })
    setImportando(false)
    cargarSedes()
    if (fileRef.current) fileRef.current.value = ""
  }

  function descargarPlantilla() {
    const csv = "nombre,codigo,direccion,latitud,longitud,radio_gps\nSede Central,SEDE-001,Av Principal 123,-12.0464,-77.0428,100\n"
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "plantilla_sedes.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Sedes</h1>
          <p className="text-muted-foreground">Visualiza e importa sedes desde CSV</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={descargarPlantilla}>
            <Download className="mr-2 h-4 w-4" /> Plantilla CSV
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={importando}>
            {importando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {resultado && (
        <Card className={resultado.err > 0 ? "border-yellow-500" : "border-green-500"}>
          <CardContent className="pt-4 flex items-center gap-3">
            {resultado.err > 0 ? <XCircle className="h-5 w-5 text-yellow-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
            <div className="text-sm">
              <span className="font-medium">{resultado.ok} importadas</span>
              {resultado.err > 0 && <span className="text-muted-foreground">, {resultado.err} con errores</span>}
              {resultado.errores.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">{resultado.errores.join("; ")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {sedes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState icon={MapPin} title="Sin sedes registradas" description="Importa un archivo CSV para comenzar" />
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
                  {sede.direccion && <p className="text-muted-foreground">📍 {sede.direccion}</p>}
                  {sede.latitud && sede.longitud && <p className="text-muted-foreground">🗺 {sede.latitud}, {sede.longitud}</p>}
                  <p className="text-muted-foreground">Radio GPS: {sede.radio_gps}m</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
