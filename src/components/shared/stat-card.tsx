import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  variant?: "default" | "success" | "warning" | "destructive"
}

export function StatCard({ title, value, description, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <Card className="glass-panel border-white/10 shadow-lg premium-card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        {Icon && (
          <Icon className={cn(
            "h-4 w-4",
            variant === "success" && "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]",
            variant === "warning" && "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]",
            variant === "destructive" && "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]",
            variant === "default" && "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.2)]",
          )} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
