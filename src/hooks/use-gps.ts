"use client"

import { useEffect, useRef, useCallback } from "react"
import { useGPSStore } from "@/stores/gps-store"
import { GPS_CONFIG } from "@/lib/constants"

export function useGPS() {
  const { ubicacionActual, tracking, gpsActivo, setUbicacionActual, setTracking, setGpsActivo } = useGPSStore()
  const watchIdRef = useRef<number | null>(null)

  const iniciarTracking = useCallback(() => {
    if (!navigator.geolocation) return

    if (watchIdRef.current !== null) return

    setTracking(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUbicacionActual({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          precision: position.coords.accuracy,
        })
        setGpsActivo(true)
      },
      () => {
        setGpsActivo(false)
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_CONFIG.TIMEOUT,
        maximumAge: 0,
      },
    )
  }, [setUbicacionActual, setTracking, setGpsActivo])

  const detenerTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setTracking(false)
  }, [setTracking])

  const obtenerPosicion = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no disponible"))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (_err) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => reject(new Error("No se pudo obtener la ubicación")),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
          )
        },
        { enableHighAccuracy: true, timeout: GPS_CONFIG.TIMEOUT, maximumAge: 0 },
      )
    })
  }, [])

  const validarDistancia = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  return {
    ubicacionActual,
    tracking,
    gpsActivo,
    iniciarTracking,
    detenerTracking,
    obtenerPosicion,
    validarDistancia,
  }
}
