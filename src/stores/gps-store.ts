import { create } from "zustand"

interface GPSState {
  tracking: boolean
  ubicacionActual: { lat: number; lng: number; precision: number } | null
  gpsActivo: boolean
  setTracking: (tracking: boolean) => void
  setUbicacionActual: (ubicacion: GPSState["ubicacionActual"]) => void
  setGpsActivo: (activo: boolean) => void
}

export const useGPSStore = create<GPSState>((set) => ({
  tracking: false,
  ubicacionActual: null,
  gpsActivo: false,
  setTracking: (tracking) => set({ tracking }),
  setUbicacionActual: (ubicacionActual) => set({ ubicacionActual }),
  setGpsActivo: (gpsActivo) => set({ gpsActivo }),
}))
