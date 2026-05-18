import { GPS_CONFIG } from "@/lib/constants"

export interface GpsValidationResult {
  valido: boolean
  distancia: number
  dentroRadio: boolean
  precisionAceptable: boolean
  velocidadSospechosa: boolean
}

export function validarGPS(
  latAgente: number,
  lngAgente: number,
  latPuesto: number,
  lngPuesto: number,
  radioGPS: number = GPS_CONFIG.RADIO_DEFAULT,
  precision: number = 0,
  velocidad?: number,
): GpsValidationResult {
  const distancia = calcularDistancia(latAgente, lngAgente, latPuesto, lngPuesto)
  const dentroRadio = distancia <= radioGPS
  const precisionAceptable = precision <= GPS_CONFIG.PRECISION_MINIMA
  const velocidadSospechosa = velocidad !== undefined && velocidad > GPS_CONFIG.VELOCIDAD_MAXIMA

  return {
    valido: dentroRadio && precisionAceptable && !velocidadSospechosa,
    distancia: Math.round(distancia),
    dentroRadio,
    precisionAceptable,
    velocidadSospechosa,
  }
}

function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
}
