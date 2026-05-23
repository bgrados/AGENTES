import { useState, useCallback } from "react"

export interface GpsLocation {
  latitud: number
  longitud: number
  precision: number // Accuracy in meters
}

interface UseSecureGpsReturn {
  location: GpsLocation | null
  error: string | null
  loading: boolean
  requestLocation: () => Promise<GpsLocation>
  validarDistancia: (lat1: number, lng1: number, lat2: number, lng2: number) => number
}

// Límite de precisión aceptado en metros (100m)
const MAX_ACCURACY_METERS = 100

export function useSecureGps(): UseSecureGpsReturn {
  const [location, setLocation] = useState<GpsLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requestLocation = useCallback((): Promise<GpsLocation> => {
    return new Promise((resolve, reject) => {
      setLoading(true)
      setError(null)

      if (!("geolocation" in navigator)) {
        const msg = "Geolocalización no soportada en este dispositivo."
        setError(msg)
        setLoading(false)
        reject(new Error(msg))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords

          if (accuracy > MAX_ACCURACY_METERS) {
            const msg = `Precisión GPS muy baja (${Math.round(accuracy)}m). Límite: ${MAX_ACCURACY_METERS}m. Sal a cielo abierto.`
            setError(msg)
            setLoading(false)
            reject(new Error(msg))
            return
          }

          const validLocation = {
            latitud: latitude,
            longitud: longitude,
            precision: accuracy,
          }

          setLocation(validLocation)
          setLoading(false)
          resolve(validLocation)
        },
        (err) => {
          let msg = "Error desconocido de GPS."
          if (err.code === err.PERMISSION_DENIED) msg = "Permiso de GPS denegado. Actívelo."
          else if (err.code === err.POSITION_UNAVAILABLE) msg = "Ubicación no disponible."
          else if (err.code === err.TIMEOUT) msg = "Tiempo de espera de GPS agotado."

          setError(msg)
          setLoading(false)
          reject(new Error(msg))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // No usar caché de ubicación
        }
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

  return { location, error, loading, requestLocation, validarDistancia }
}
