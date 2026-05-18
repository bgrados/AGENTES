import { create } from "zustand"
import type { UsuarioSession } from "@/types/app"

interface AuthState {
  usuario: UsuarioSession | null
  isLoading: boolean
  setUsuario: (usuario: UsuarioSession | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  isLoading: true,
  setUsuario: (usuario) => set({ usuario, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ usuario: null, isLoading: false }),
}))
