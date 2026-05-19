"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Printer, Building2 } from "lucide-react"

interface AgenteQR {
  codigo: string
  nombre: string
  email: string
  sede: string
  turno: string
}

export default function QrAgentesPage() {
  const { supabase } = useSupabase()
  const [agentes, setAgentes] = useState<AgenteQR[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const supabaseAny = supabase as any

    const [{ data: agentes }, { data: asignaciones }] = await Promise.all([
      supabaseAny.from("agentes").select("codigo, turno_asignado, usuarios!inner(nombre, apellido, email)").eq("activo", true).order("codigo"),
      supabaseAny.from("agentes_sedes").select("agente_id, tipo, activo, sedes!inner(nombre)").eq("tipo", "principal").eq("activo", true),
    ])

    if (agentes) {
      const sedeMap: Record<string, string> = {}
      if (asignaciones) {
        for (const a of asignaciones) {
          sedeMap[a.agente_id] = a.sedes.nombre
        }
      }

      const items: AgenteQR[] = agentes.map((a: any) => ({
        codigo: a.codigo,
        nombre: `${a.usuarios.nombre} ${a.usuarios.apellido}`,
        email: a.usuarios.email,
        sede: sedeMap[a.id] || "Sin sede",
        turno: a.turno_asignado === "dia" ? "Día" : "Noche",
      }))
      setAgentes(items)
    }
    setLoading(false)
  }

  const filtrados = agentes.filter(a =>
    !search ||
    a.codigo.toLowerCase().includes(search.toLowerCase()) ||
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.sede.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Códigos QR de Agentes</h1>
          <p className="text-muted-foreground">Visualiza e imprime los QR para colocar en cada sede</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar agente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4 print:gap-3">
        {filtrados.map(agente => (
          <Card key={agente.codigo} className="print:border print:break-inside-avoid">
            <CardContent className="flex flex-col items-center p-4 print:p-3">
              <img
                src={`/qr/${agente.codigo}.png`}
                alt={agente.codigo}
                className="w-36 h-36 print:w-32 print:h-32"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
              <div className="mt-2 text-center space-y-0.5">
                <p className="text-sm font-bold leading-tight">{agente.nombre}</p>
                <p className="text-xs text-muted-foreground">{agente.codigo}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-full">{agente.email}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {agente.sede !== "Sin sede" ? (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                      <Building2 className="h-2.5 w-2.5" /> {agente.sede}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Sin sede</Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                    {agente.turno}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtrados.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No hay agentes que coincidan con la búsqueda" : "No hay agentes registrados"}
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, header, aside { display: none !important; }
        }
      `}</style>
    </div>
  )
}
