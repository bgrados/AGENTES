import { db } from "./db"
import { createClient } from "@/lib/supabase/client"

export class SyncEngine {
  private syncing = false

  async queueOperation(tabla: string, operacion: string, datos: unknown) {
    await db.syncQueue.add({
      tabla,
      operacion,
      datos: JSON.stringify(datos),
      created_at: new Date().toISOString(),
      intentos: 0,
    })
  }

  async syncAll() {
    if (this.syncing) return
    this.syncing = true

    try {
      const pendientes = await db.syncQueue
        .orderBy("created_at")
        .toArray()

      if (pendientes.length === 0) {
        this.syncing = false
        return
      }

      const supabase = createClient()
      const supabaseAny = supabase as any

      for (const item of pendientes) {
        try {
          const datos = JSON.parse(item.datos)

          if (item.tabla === "asistencia") {
            await supabaseAny.from("asistencia").insert(datos)
          } else if (item.tabla === "reportes") {
            await supabaseAny.from("reportes").insert(datos)
          } else if (item.tabla === "historial_ubicaciones") {
            await supabaseAny.from("historial_ubicaciones").insert(datos)
          }

          await db.syncQueue.delete(item.id!)
        } catch (err) {
          console.error(`Sync error for ${item.tabla}:`, err)
          await db.syncQueue.update(item.id!, { intentos: item.intentos + 1 })
        }
      }
    } finally {
      this.syncing = false
    }
  }

  getPendingCount(): Promise<number> {
    return db.syncQueue.count()
  }
}

export const syncEngine = new SyncEngine()
