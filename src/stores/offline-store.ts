import { create } from "zustand"

interface OfflineState {
  online: boolean
  pendientes: number
  setOnline: (online: boolean) => void
  setPendientes: (pendientes: number) => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendientes: 0,
  setOnline: (online) => set({ online }),
  setPendientes: (pendientes) => set({ pendientes }),
}))
