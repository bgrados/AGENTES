import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/providers/theme-provider"
import { OfflineProvider } from "@/providers/offline-provider"
import { SupabaseProvider } from "@/providers/supabase-provider"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Seguridad Control",
  description: "Sistema de control de asistencia y monitoreo operativo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seguridad Control",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider>
          <SupabaseProvider>
            <OfflineProvider>
              {children}
              <OfflineBanner />
              <Toaster />
            </OfflineProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
