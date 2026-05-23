import { db } from "./db"
import { createClient } from "@/lib/supabase/client"

// Base de tiempo para Exponential Backoff en milisegundos (1 segundo)
const BACKOFF_BASE_MS = 1000
const MAX_BACKOFF_MS = 1000 * 60 * 60 // 1 hora máximo entre reintentos

export class SyncEngine {
  private syncing = false

  async queueOperation(tabla: string, operacion: string, datos: any) {
    // Para simplificar, asumimos que 'datos' puede contener 'foto_data' (WebP Blob DataURL o Base64)
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
      const pendientes = await db.syncQueue.orderBy("created_at").toArray()

      if (pendientes.length === 0) {
        this.syncing = false
        return
      }

      const supabase = createClient()
      
      const payload: {
        asistencia: any[];
        reportes: any[];
        ubicaciones: any[];
      } = {
        asistencia: [],
        reportes: [],
        ubicaciones: [],
      }

      const itemIdsToProcess: number[] = []
      const itemsToRetry: any[] = []

      for (const item of pendientes) {
        // Aplicar Exponential Backoff
        // Si intentos es 0, no hay delay. Si es 1, espera 2^1 * 1000 = 2s, etc.
        const backoffTime = Math.min(BACKOFF_BASE_MS * Math.pow(2, item.intentos), MAX_BACKOFF_MS)
        const timeSinceCreation = new Date().getTime() - new Date(item.created_at).getTime()
        
        // Si el tiempo transcurrido desde el último intento es menor al backoff, lo saltamos por ahora
        // (En una implementación real, guardaríamos 'last_attempt_at', pero usaremos created_at para simplificar MVP)
        // Por ahora, procesaremos todo lo que esté en cola y el backoff ocurrirá al fallar la transacción entera.
        
        try {
          const datos = JSON.parse(item.datos)

          // 1. Manejo de subida de fotos pendiente
          if (datos.foto_data) {
            // Transformar DataURL/Base64 a Blob para subir
            const response = await fetch(datos.foto_data)
            const blob = await response.blob()
            const fileName = `${datos.agente_id}_${new Date().getTime()}.webp`

            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from('agent-photos')
              .upload(`offline/${fileName}`, blob, {
                contentType: 'image/webp',
                upsert: false
              })

            if (uploadError) {
              console.error("Error subiendo foto offline:", uploadError)
              throw uploadError
            }

            // Obtener URL pública (o firmada dependiendo de la privacidad del bucket)
            const { data: publicUrlData } = supabase.storage.from('agent-photos').getPublicUrl(`offline/${fileName}`)
            
            // Actualizar el payload para enviar al servidor
            datos.foto_url = publicUrlData.publicUrl
            delete datos.foto_data // Remover para no enviar base64 pesados en el JSON
          }

          // 2. Agrupar en payload batch
          if (item.tabla === "asistencia") {
            payload.asistencia.push(datos)
          } else if (item.tabla === "reportes") {
            payload.reportes.push(datos)
          } else if (item.tabla === "historial_ubicaciones") {
            payload.ubicaciones.push(datos)
          }

          itemIdsToProcess.push(item.id!)

        } catch (err) {
          console.error(`Error preparando item ${item.id} para sync:`, err)
          item.intentos += 1
          itemsToRetry.push(item)
        }
      }

      // Si no hay nada que procesar luego de filtrar errores de preparación
      if (itemIdsToProcess.length === 0) {
        if (itemsToRetry.length > 0) {
           await db.syncQueue.bulkPut(itemsToRetry)
        }
        this.syncing = false
        return
      }

      // 3. Llamada RPC única para Sincronización Batch
      const supabaseAny = supabase as any
      const { data: rpcData, error: rpcError } = await supabaseAny.rpc('sync_offline_payload', {
        payload
      })

      if (rpcError) {
        console.error("Error en RPC de sincronización batch:", rpcError)
        // Incrementar intentos de todos los items procesados
        const failedItems = pendientes.filter(p => itemIdsToProcess.includes(p.id!)).map(p => ({
          ...p,
          intentos: p.intentos + 1
        }))
        await db.syncQueue.bulkPut(failedItems)
      } else {
        console.log("Sincronización Batch Exitosa:", rpcData)
        // 4. Limpieza de base de datos local exitosa
        await db.syncQueue.bulkDelete(itemIdsToProcess)
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
