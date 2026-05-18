import { GPS_CONFIG } from "@/lib/constants"

export type GpsCallback = (coords: { lat: number; lng: number; precision: number; velocidad?: number; bateria?: number }) => void

export class GPSTracker {
  private watchId: number | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private onPosition: GpsCallback
  private onStatus: (activo: boolean) => void
  private ultimaPosicion: GeolocationPosition | null = null

  constructor(onPosition: GpsCallback, onStatus: (activo: boolean) => void) {
    this.onPosition = onPosition
    this.onStatus = onStatus
  }

  start() {
    if (!navigator.geolocation) {
      this.onStatus(false)
      return
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.ultimaPosicion = pos
        this.onStatus(true)
        this.reportPosition(pos)
      },
      () => {
        this.onStatus(false)
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_CONFIG.TIMEOUT,
        maximumAge: 0,
      },
    )

    this.intervalId = setInterval(() => {
      if (this.ultimaPosicion) {
        this.reportPosition(this.ultimaPosicion)
      }
    }, GPS_CONFIG.INTERVALO_TRACKING)
  }

  private reportPosition(pos: GeolocationPosition) {
    this.onPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      precision: pos.coords.accuracy,
      velocidad: pos.coords.speed ?? undefined,
    })
  }

  async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: GPS_CONFIG.TIMEOUT,
        maximumAge: 0,
      })
    })
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.ultimaPosicion = null
  }
}
