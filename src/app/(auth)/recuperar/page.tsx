"use client"

import { useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShieldCheck, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function RecuperarPage() {
  const [email, setEmail] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { supabase } = useSupabase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      setEnviado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar recuperación")
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="mb-2 text-xl font-semibold">Correo enviado</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Revisa tu bandeja de entrada para restablecer tu contraseña.
          </p>
          <Link href="/login">
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <ShieldCheck className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
        <CardDescription>
          Te enviaremos un enlace para restablecer tu contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar enlace"
            )}
          </Button>
          <div className="text-center text-sm">
            <Link href="/login" className="inline-flex items-center text-primary hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
