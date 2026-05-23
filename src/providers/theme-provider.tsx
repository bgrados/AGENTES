"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useUIStore } from "@/stores/ui-store"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useUIStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle("dark", theme === "dark")
      document.documentElement.classList.toggle("light", theme === "light")
    }
  }, [theme, mounted])

  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}
