"use client"

import { useState, useCallback } from "react"
import type { ToastProps } from "@/components/ui/toast"

interface Toast extends ToastProps {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
}

let count = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ title, description, ...props }: Omit<Toast, "id">) => {
    const id = String(++count)
    setToasts((prev) => [...prev, { id, title, description, ...props }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
