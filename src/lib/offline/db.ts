import Dexie, { type Table } from "dexie"

export interface OfflineAsistencia {
  id?: string
  agente_id: string
  sede_id: string
  tipo: string
  latitud?: number | null
  longitud?: number | null
  foto_data?: string
  observaciones?: string
  created_at: string
  synced: number
}

export interface OfflineReporte {
  id?: string
  agente_id: string
  sede_id: string
  turno: string
  hora_programada: string
  tipo_reporte: string
  foto_data?: string
  novedades?: string
  created_at: string
  synced: number
}

export interface OfflineSyncQueue {
  id?: number
  tabla: string
  operacion: string
  datos: string
  created_at: string
  intentos: number
}

export class SeguridadDB extends Dexie {
  asistencia!: Table<OfflineAsistencia>
  reportes!: Table<OfflineReporte>
  syncQueue!: Table<OfflineSyncQueue>

  constructor() {
    super("SeguridadDB")
    this.version(1).stores({
      asistencia: "++id, agente_id, created_at, synced",
      reportes: "++id, agente_id, created_at, synced",
      syncQueue: "++id, created_at",
    })
  }
}

export const db = new SeguridadDB()
