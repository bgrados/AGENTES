"use client"

import { useOffline } from "@/hooks/use-offline"
import { WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

export function OfflineBanner() {
  const { offline, pendientes } = useOffline()

  if (!offline) return null

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-950",
    )}>
      <WifiOff className="h-4 w-4" />
      <span>Modo offline</span>
      {pendientes > 0 && (
        <span className="ml-2 rounded-full bg-yellow-600 px-2 py-0.5 text-xs text-white">
          {pendientes} pendientes
        </span>
      )}
    </div>
  )
}
