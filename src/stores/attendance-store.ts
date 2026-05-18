import { create } from "zustand"

interface AttendanceState {
  ultimaMarcacion: {
    tipo: string
    fecha_hora: string
    sede_nombre: string
  } | null
  marcando: boolean
  setUltimaMarcacion: (marcacion: AttendanceState["ultimaMarcacion"]) => void
  setMarcando: (marcando: boolean) => void
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  ultimaMarcacion: null,
  marcando: false,
  setUltimaMarcacion: (ultimaMarcacion) => set({ ultimaMarcacion }),
  setMarcando: (marcando) => set({ marcando }),
}))
