"use client"

import { useOfflineStore } from "@/stores/offline-store"

export function useOffline() {
  const { online, pendientes } = useOfflineStore()

  return {
    online,
    offline: !online,
    pendientes,
  }
}
