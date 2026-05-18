"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Save, Clock, MapPin, Camera } from "lucide-react"

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Parámetros generales del sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Tolerancias y Horarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tolerancia">Tolerancia de tardanza (minutos)</Label>
              <Input id="tolerancia" type="number" defaultValue={15} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limite-falta">Límite para falta (minutos)</Label>
              <Input id="limite-falta" type="number" defaultValue={60} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Validación GPS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="radio-gps">Radio GPS por defecto (metros)</Label>
              <Input id="radio-gps" type="number" defaultValue={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precision">Precisión mínima requerida (metros)</Label>
              <Input id="precision" type="number" defaultValue={50} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Configuración de Fotos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-foto">Tamaño máximo de foto (MB)</Label>
              <Input id="max-foto" type="number" defaultValue={10} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" /> Guardar Configuración
        </Button>
      </div>
    </div>
  )
}
