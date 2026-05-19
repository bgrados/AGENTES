export const APP_NAME = "Seguridad Control"
export const APP_DESCRIPTION = "Sistema de control de asistencia y monitoreo operativo"

export const TURNOS = {
  DIA: { inicio: "07:00", fin: "19:00", label: "Día" },
  NOCHE: { inicio: "19:00", fin: "07:00", label: "Noche" },
} as const

export const TOLERANCIA_TARDANZA_MINUTOS = 15

export const REPORTES_NOCHE: Record<string, { requiere_foto: boolean; label: string }> = {
  "19:00": { requiere_foto: true, label: "Ingreso" },
  "20:00": { requiere_foto: false, label: "Reporte 20:00" },
  "21:00": { requiere_foto: false, label: "Reporte 21:00" },
  "22:00": { requiere_foto: false, label: "Reporte 22:00" },
  "23:00": { requiere_foto: false, label: "Reporte 23:00" },
  "00:00": { requiere_foto: false, label: "Reporte 00:00" },
  "01:00": { requiere_foto: true, label: "Reporte 01:00" },
  "02:00": { requiere_foto: true, label: "Reporte 02:00" },
  "03:00": { requiere_foto: true, label: "Reporte 03:00" },
  "04:00": { requiere_foto: true, label: "Reporte 04:00" },
  "05:00": { requiere_foto: true, label: "Reporte 05:00" },
  "07:00": { requiere_foto: true, label: "Relevo" },
}

export const REPORTES_DIA: Record<string, { requiere_foto: boolean; label: string }> = {
  "07:00": { requiere_foto: true, label: "Ingreso" },
  "19:00": { requiere_foto: true, label: "Relevo" },
}

export const GPS_CONFIG = {
  RADIO_DEFAULT: 50,
  PRECISION_MINIMA: 50,
  VELOCIDAD_MAXIMA: 30,
  INTERVALO_TRACKING: 120000,
  TIMEOUT: 8000,
} as const

export const FOTO_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024,
  FORMATOS: ["image/jpeg", "image/png", "image/webp"],
  RESOLUCION_MINIMA: { width: 640, height: 480 },
} as const

export const ROLES = {
  ADMIN: "admin" as const,
  SUPERVISOR: "supervisor" as const,
  JEFE_GRUPO: "jefe_grupo" as const,
  AGENTE: "agente" as const,
}

export const RUTAS_POR_ROL: Record<string, string> = {
  admin: "/admin",
  supervisor: "/supervisor",
  jefe_grupo: "/supervisor",
  agente: "/agente",
}
