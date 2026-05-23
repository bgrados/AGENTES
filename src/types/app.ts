export type UserRole = "admin" | "supervisor" | "agente" | "jefe_grupo"

export type Turno = "dia" | "noche"

export type TipoAsistencia = "entrada" | "salida" | "relevo_entrada" | "relevo_salida"

export type TipoReporte = "con_foto" | "sin_foto"

export type TipoIncidencia = "tardanza" | "falta" | "gps_invalido" | "qr_invalido" | "reporte_faltante" | "cobertura" | "otro"

export type EstadoIncidencia = "pendiente" | "aprobada" | "rechazada" | "investigacion"

export interface UsuarioSession {
  id: string
  auth_uid: string
  empresa_id: string
  rol: UserRole
  codigo: string | null
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  foto_url: string | null
  dni: string | null
}

export interface Coordenadas {
  lat: number
  lng: number
  precision?: number
  altitud?: number
  velocidad?: number
}

export interface ValidacionGPS {
  valido: boolean
  distancia: number
  dentro_radio: boolean
  precision_aceptable: boolean
}

export interface MarcarAsistenciaPayload {
  tipo: TipoAsistencia
  agente_id: string
  sede_id: string
  puesto_id?: string
  latitud?: number
  longitud?: number
  gps_precision?: number
  qr_escanado?: string
  foto_url?: string
  foto_data?: string
  observaciones?: string
}

export interface ReportePayload {
  agente_id: string
  sede_id: string
  puesto_id?: string
  turno: Turno
  hora_programada: string
  tipo_reporte: TipoReporte
  foto_url?: string
  foto_data?: string
  latitud?: number
  longitud?: number
  novedades?: string
  agentes_presentes?: string[]
}

export interface RelevoPayload {
  sede_id: string
  puesto_id?: string
  agente_saliente_id?: string
  agente_entrante_id: string
  turno_saliente?: Turno
  turno_entrante: Turno
  foto_conjunta_url?: string
  foto_data?: string
  latitud?: number
  longitud?: number
  observaciones?: string
}

export interface WhatsAppMessage {
  sede: string
  turno: string
  hora: string
  agentes: string[]
  novedades?: string
  ubicacion?: string
  foto_url?: string
}
