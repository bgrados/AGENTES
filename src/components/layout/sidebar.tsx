"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MapPin,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  Shield,
  Building2,
  Settings,
  FileText,
  UserCheck,
  QrCode,
  type LucideIcon,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: string[]
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/agente",
    icon: LayoutDashboard,
    roles: ["agente", "jefe_grupo"],
  },
  {
    label: "Marcar Asistencia",
    href: "/agente/asistencia",
    icon: ClipboardCheck,
    roles: ["agente", "jefe_grupo"],
  },
  {
    label: "Reportes",
    href: "/agente/reportes",
    icon: FileText,
    roles: ["agente", "jefe_grupo"],
  },
  {
    label: "Historial",
    href: "/agente/historial",
    icon: Clock,
    roles: ["agente", "jefe_grupo"],
  },
  {
    label: "Mi QR",
    href: "/agente/mi-qr",
    icon: QrCode,
    roles: ["agente", "jefe_grupo"],
  },
  {
    label: "Dashboard",
    href: "/supervisor",
    icon: LayoutDashboard,
    roles: ["supervisor", "jefe_grupo"],
  },
  {
    label: "Mapa en Vivo",
    href: "/supervisor/mapa",
    icon: MapPin,
    roles: ["supervisor", "jefe_grupo"],
  },
  {
    label: "Personal",
    href: "/supervisor/personal",
    icon: Users,
    roles: ["supervisor", "jefe_grupo"],
  },
  {
    label: "Incidencias",
    href: "/supervisor/incidencias",
    icon: AlertTriangle,
    roles: ["supervisor", "jefe_grupo"],
  },
  {
    label: "Reportes",
    href: "/supervisor/reportes",
    icon: FileText,
    roles: ["supervisor", "jefe_grupo"],
  },
  {
    label: "Sedes",
    href: "/supervisor/sedes",
    icon: Building2,
    roles: ["supervisor", "jefe_grupo"],
  },
  {
    label: "Cobertura",
    href: "/supervisor/cobertura",
    icon: UserCheck,
    roles: ["supervisor", "jefe_grupo"],
  },
  {
    label: "Dashboard",
    href: "/admin",
    icon: Shield,
    roles: ["admin"],
  },
  {
    label: "Empresas",
    href: "/admin/empresas",
    icon: Building2,
    roles: ["admin"],
  },
  {
    label: "Sedes",
    href: "/admin/sedes",
    icon: Building2,
    roles: ["admin"],
  },
  {
    label: "Asignar Sedes",
    href: "/admin/asignar-sedes",
    icon: UserCheck,
    roles: ["admin"],
  },
  {
    label: "QR Agentes",
    href: "/admin/qr-agentes",
    icon: QrCode,
    roles: ["admin"],
  },
  {
    label: "Reportes",
    href: "/admin/reportes",
    icon: FileText,
    roles: ["admin"],
  },
  {
    label: "Usuarios",
    href: "/admin/usuarios",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Configuración",
    href: "/admin/configuracion",
    icon: Settings,
    roles: ["admin"],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const rol = usuario?.rol || "agente"

  const itemsFiltrados = navItems.filter((item) => item.roles.includes(rol))

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-30 flex h-[calc(100vh-4rem)] flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden",
      )}
    >
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {itemsFiltrados.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
