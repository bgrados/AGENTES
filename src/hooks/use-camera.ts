"use client"

import { useCallback, useRef } from "react"

export function useCamera() {
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      mediaStreamRef.current = stream
      return true
    } catch {
      return false
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [])

  return { requestPermission, stopCamera }
}
