import { createClient } from "@/lib/supabase/client"

export async function subscribeToPush() {
  if (!("Notification" in window)) {
    console.warn("Push not supported")
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    console.warn("Push permission denied")
    return null
  }

  if (!("serviceWorker" in navigator)) {
    console.warn("ServiceWorker not supported")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await (registration.pushManager as any).subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      ),
    })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await (supabase as any).from("notificaciones_push").upsert({
        usuario_id: user.id,
        subscription: subscription.toJSON(),
        dispositivo: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      })
    }

    return subscription
  } catch (err) {
    console.error("Push subscription failed:", err)
    return null
  }
}

export function programarNotificacion(titulo: string, mensaje: string, tiempoMs: number) {
  setTimeout(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, {
        body: mensaje,
        icon: "/icons/icon-192x192.png",
      })
    }
  }, tiempoMs)
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
