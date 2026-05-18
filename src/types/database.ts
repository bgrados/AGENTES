export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          nombre: string
          ruc: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          logo_url: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          ruc?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          ruc?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          activo?: boolean
          created_at?: string
        }
      }
      sedes: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          direccion: string | null
          latitud: number | null
          longitud: number | null
          radio_gps: number
          codigo: string
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          direccion?: string | null
          latitud?: number | null
          longitud?: number | null
          radio_gps?: number
          codigo: string
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          direccion?: string | null
          latitud?: number | null
          longitud?: number | null
          radio_gps?: number
          codigo?: string
          activo?: boolean
          created_at?: string
        }
      }
      puestos: {
        Row: {
          id: string
          sede_id: string
          nombre: string
          codigo: string
          qr_code: string | null
          qr_activo: boolean
          qr_expiracion: string | null
          latitud: number | null
          longitud: number | null
          radio_gps: number
          requiere_gps: boolean
          requiere_qr: boolean
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sede_id: string
          nombre: string
          codigo: string
          qr_code?: string | null
          qr_activo?: boolean
          qr_expiracion?: string | null
          latitud?: number | null
          longitud?: number | null
          radio_gps?: number
          requiere_gps?: boolean
          requiere_qr?: boolean
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sede_id?: string
          nombre?: string
          codigo?: string
          qr_code?: string | null
          qr_activo?: boolean
          qr_expiracion?: string | null
          latitud?: number | null
          longitud?: number | null
          radio_gps?: number
          requiere_gps?: boolean
          requiere_qr?: boolean
          activo?: boolean
          created_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          created_at?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          auth_uid: string | null
          empresa_id: string
          rol_id: string
          codigo: string | null
          nombre: string
          apellido: string
          email: string
          telefono: string | null
          foto_url: string | null
          activo: boolean
          ultimo_acceso: string | null
          created_at: string
        }
        Insert: {
          id?: string
          auth_uid?: string | null
          empresa_id: string
          rol_id: string
          codigo?: string | null
          nombre: string
          apellido: string
          email: string
          telefono?: string | null
          foto_url?: string | null
          activo?: boolean
          ultimo_acceso?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          auth_uid?: string | null
          empresa_id?: string
          rol_id?: string
          codigo?: string | null
          nombre?: string
          apellido?: string
          email?: string
          telefono?: string | null
          foto_url?: string | null
          activo?: boolean
          ultimo_acceso?: string | null
          created_at?: string
        }
      }
      agentes: {
        Row: {
          id: string
          usuario_id: string
          codigo: string
          turno_asignado: "dia" | "noche"
          dia_descanso: number | null
          fecha_ingreso: string
          sede_principal: string | null
          foto_url: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          codigo: string
          turno_asignado: "dia" | "noche"
          dia_descanso?: number | null
          fecha_ingreso?: string
          sede_principal?: string | null
          foto_url?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          codigo?: string
          turno_asignado?: "dia" | "noche"
          dia_descanso?: number | null
          fecha_ingreso?: string
          sede_principal?: string | null
          foto_url?: string | null
          activo?: boolean
          created_at?: string
        }
      }
      supervisores: {
        Row: {
          id: string
          usuario_id: string
          sedes_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          sedes_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          sedes_ids?: string[]
          created_at?: string
        }
      }
      asistencia: {
        Row: {
          id: string
          agente_id: string
          sede_id: string
          puesto_id: string | null
          tipo: "entrada" | "salida" | "relevo_entrada" | "relevo_salida"
          fecha_hora: string
          latitud: number | null
          longitud: number | null
          gps_valido: boolean | null
          gps_precision: number | null
          qr_valido: boolean | null
          qr_escanado: string | null
          foto_url: string | null
          es_manual: boolean
          validado_por: string | null
          observaciones: string | null
          dispositivo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agente_id: string
          sede_id: string
          puesto_id?: string | null
          tipo: "entrada" | "salida" | "relevo_entrada" | "relevo_salida"
          fecha_hora?: string
          latitud?: number | null
          longitud?: number | null
          gps_valido?: boolean | null
          gps_precision?: number | null
          qr_valido?: boolean | null
          qr_escanado?: string | null
          foto_url?: string | null
          es_manual?: boolean
          validado_por?: string | null
          observaciones?: string | null
          dispositivo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agente_id?: string
          sede_id?: string
          puesto_id?: string | null
          tipo?: "entrada" | "salida" | "relevo_entrada" | "relevo_salida"
          fecha_hora?: string
          latitud?: number | null
          longitud?: number | null
          gps_valido?: boolean | null
          gps_precision?: number | null
          qr_valido?: boolean | null
          qr_escanado?: string | null
          foto_url?: string | null
          es_manual?: boolean
          validado_por?: string | null
          observaciones?: string | null
          dispositivo?: string | null
          created_at?: string
        }
      }
      relevos: {
        Row: {
          id: string
          sede_id: string
          puesto_id: string | null
          agente_saliente_id: string | null
          agente_entrante_id: string
          turno_saliente: string | null
          turno_entrante: string | null
          fecha_hora: string
          foto_conjunta_url: string | null
          latitud: number | null
          longitud: number | null
          observaciones: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sede_id: string
          puesto_id?: string | null
          agente_saliente_id?: string | null
          agente_entrante_id: string
          turno_saliente?: string | null
          turno_entrante?: string | null
          fecha_hora?: string
          foto_conjunta_url?: string | null
          latitud?: number | null
          longitud?: number | null
          observaciones?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sede_id?: string
          puesto_id?: string | null
          agente_saliente_id?: string | null
          agente_entrante_id?: string
          turno_saliente?: string | null
          turno_entrante?: string | null
          fecha_hora?: string
          foto_conjunta_url?: string | null
          latitud?: number | null
          longitud?: number | null
          observaciones?: string | null
          created_at?: string
        }
      }
      reportes: {
        Row: {
          id: string
          agente_id: string
          sede_id: string
          puesto_id: string | null
          turno: "dia" | "noche"
          hora_programada: string
          fecha_reporte: string
          fecha_hora: string
          tipo_reporte: "con_foto" | "sin_foto"
          foto_url: string | null
          latitud: number | null
          longitud: number | null
          gps_valido: boolean | null
          novedades: string | null
          agentes_presentes: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          agente_id: string
          sede_id: string
          puesto_id?: string | null
          turno: "dia" | "noche"
          hora_programada: string
          fecha_reporte?: string
          fecha_hora?: string
          tipo_reporte: "con_foto" | "sin_foto"
          foto_url?: string | null
          latitud?: number | null
          longitud?: number | null
          gps_valido?: boolean | null
          novedades?: string | null
          agentes_presentes?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          agente_id?: string
          sede_id?: string
          puesto_id?: string | null
          turno?: "dia" | "noche"
          hora_programada?: string
          fecha_reporte?: string
          fecha_hora?: string
          tipo_reporte?: "con_foto" | "sin_foto"
          foto_url?: string | null
          latitud?: number | null
          longitud?: number | null
          gps_valido?: boolean | null
          novedades?: string | null
          agentes_presentes?: string[] | null
          created_at?: string
        }
      }
      incidencias: {
        Row: {
          id: string
          agente_id: string | null
          sede_id: string
          tipo: "tardanza" | "falta" | "gps_invalido" | "qr_invalido" | "reporte_faltante" | "cobertura" | "otro"
          fecha: string
          hora: string | null
          descripcion: string
          estado: "pendiente" | "aprobada" | "rechazada" | "investigacion"
          evidencia_url: string | null
          validado_por: string | null
          validado_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agente_id?: string | null
          sede_id: string
          tipo: "tardanza" | "falta" | "gps_invalido" | "qr_invalido" | "reporte_faltante" | "cobertura" | "otro"
          fecha: string
          hora?: string | null
          descripcion: string
          estado?: "pendiente" | "aprobada" | "rechazada" | "investigacion"
          evidencia_url?: string | null
          validado_por?: string | null
          validado_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agente_id?: string | null
          sede_id?: string
          tipo?: "tardanza" | "falta" | "gps_invalido" | "qr_invalido" | "reporte_faltante" | "cobertura" | "otro"
          fecha?: string
          hora?: string | null
          descripcion?: string
          estado?: "pendiente" | "aprobada" | "rechazada" | "investigacion"
          evidencia_url?: string | null
          validado_por?: string | null
          validado_at?: string | null
          created_at?: string
        }
      }
      historial_ubicaciones: {
        Row: {
          id: string
          agente_id: string
          latitud: number
          longitud: number
          precision: number | null
          velocidad: number | null
          altitud: number | null
          bateria: number | null
          fecha_hora: string
        }
        Insert: {
          id?: string
          agente_id: string
          latitud: number
          longitud: number
          precision?: number | null
          velocidad?: number | null
          altitud?: number | null
          bateria?: number | null
          fecha_hora?: string
        }
        Update: {
          id?: string
          agente_id?: string
          latitud?: number
          longitud?: number
          precision?: number | null
          velocidad?: number | null
          altitud?: number | null
          bateria?: number | null
          fecha_hora?: string
        }
      }
      notificaciones_push: {
        Row: {
          id: string
          usuario_id: string
          subscription: Json
          dispositivo: string | null
          activo: boolean
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          usuario_id: string
          subscription: Json
          dispositivo?: string | null
          activo?: boolean
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          id?: string
          usuario_id?: string
          subscription?: Json
          dispositivo?: string | null
          activo?: boolean
          created_at?: string
          last_used_at?: string | null
        }
      }
      auditoria_logs: {
        Row: {
          id: string
          usuario_id: string | null
          accion: string
          tabla: string | null
          registro_id: string | null
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          direccion_ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id?: string | null
          accion: string
          tabla?: string | null
          registro_id?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          direccion_ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string | null
          accion?: string
          tabla?: string | null
          registro_id?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          direccion_ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      grupos_whatsapp: {
        Row: {
          id: string
          sede_id: string
          turno: "dia" | "noche"
          numero_grupo: string
          nombre_grupo: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sede_id: string
          turno: "dia" | "noche"
          numero_grupo: string
          nombre_grupo?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sede_id?: string
          turno?: "dia" | "noche"
          numero_grupo?: string
          nombre_grupo?: string | null
          activo?: boolean
          created_at?: string
        }
      }
      configuracion: {
        Row: {
          id: string
          empresa_id: string
          clave: string
          valor: Json
          descripcion: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          clave: string
          valor: Json
          descripcion?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          clave?: string
          valor?: Json
          descripcion?: string | null
          updated_at?: string
        }
      }
      programacion_personal: {
        Row: {
          id: string
          agente_id: string
          sede_id: string
          puesto_id: string | null
          fecha: string
          turno: "dia" | "noche"
          es_descanso: boolean
          es_reemplazo: boolean
          creado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agente_id: string
          sede_id: string
          puesto_id?: string | null
          fecha: string
          turno: "dia" | "noche"
          es_descanso?: boolean
          es_reemplazo?: boolean
          creado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agente_id?: string
          sede_id?: string
          puesto_id?: string | null
          fecha?: string
          turno?: "dia" | "noche"
          es_descanso?: boolean
          es_reemplazo?: boolean
          creado_por?: string | null
          created_at?: string
        }
      }
      sync_queue: {
        Row: {
          id: string
          usuario_id: string
          operacion: string
          tabla: string
          registro_id: string | null
          datos: Json
          dispositivo_id: string | null
          estado: string
          error_mensaje: string | null
          intentos: number
          created_at: string
          procesado_at: string | null
        }
        Insert: {
          id?: string
          usuario_id: string
          operacion: string
          tabla: string
          registro_id?: string | null
          datos: Json
          dispositivo_id?: string | null
          estado?: string
          error_mensaje?: string | null
          intentos?: number
          created_at?: string
          procesado_at?: string | null
        }
        Update: {
          id?: string
          usuario_id?: string
          operacion?: string
          tabla?: string
          registro_id?: string | null
          datos?: Json
          dispositivo_id?: string | null
          estado?: string
          error_mensaje?: string | null
          intentos?: number
          created_at?: string
          procesado_at?: string | null
        }
      }
      archivos_fotos: {
        Row: {
          id: string
          bucket: string
          ruta: string
          nombre: string | null
          tipo: string | null
          tamano: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          bucket: string
          ruta: string
          nombre?: string | null
          tipo?: string | null
          tamano?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          bucket?: string
          ruta?: string
          nombre?: string | null
          tipo?: string | null
          tamano?: number | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
