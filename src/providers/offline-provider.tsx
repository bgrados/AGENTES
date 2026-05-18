"use client"

import { useEffect, type ReactNode } from "react"
import { useOfflineStore } from "@/stores/offline-store"

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { setOnline } = useOfflineStore()

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [setOnline])

  return <>{children}</>
}
