import { createClient } from "@/lib/supabase/client"
import { syncEngine } from "@/lib/offline/sync-engine"

interface GpsPoint {
  agente_id: string
  latitud: number
  longitud: number
  precision: number | null
  velocidad: number | null
  bateria: number | null
  fecha_hora: string
}

export class GpsBatchSender {
  private buffer: GpsPoint[] = []
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(private agenteId: string, private intervalMs = 60000) {}

  addPoint(lat: number, lng: number, precision?: number, velocidad?: number) {
    this.buffer.push({
      agente_id: this.agenteId,
      latitud: lat,
      longitud: lng,
      precision: precision ?? null,
      velocidad: velocidad ?? null,
      bateria: null,
      fecha_hora: new Date().toISOString(),
    })
  }

  start() {
    this.intervalId = setInterval(() => this.flush(), this.intervalMs)
  }

  async flush() {
    if (this.buffer.length === 0) return

    const batch = [...this.buffer]
    this.buffer = []

    try {
      const supabase = createClient()
      await (supabase as any).from("historial_ubicaciones").insert(batch)
    } catch {
      for (const point of batch) {
        await syncEngine.queueOperation("historial_ubicaciones", "INSERT", point)
      }
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.flush()
  }
}
