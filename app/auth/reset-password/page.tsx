"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import Image from "next/image"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Helper: extract code from query or hash
  const extractRecoveryCode = (): string | undefined => {
    let code = searchParams.get("code") || searchParams.get("token") || undefined
    if (!code && typeof window !== "undefined") {
      const hash = new URL(window.location.href).hash
      if (hash && hash.startsWith("#")) {
        const params = new URLSearchParams(hash.substring(1))
        code = params.get("code") || params.get("token") || undefined
      }
    }
    return code ?? undefined
  }

  useEffect(() => {
    // Handle the auth callback by exchanging the recovery code for a session
    const handleAuthCallback = async () => {
      const supabase = createClient()

      const code = extractRecoveryCode()

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError("Invalid or expired reset link")
          setIsSessionReady(false)
          return
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !data.session) {
        setError("Invalid or expired reset link")
        setIsSessionReady(false)
        return
      }

      setIsSessionReady(true)
    }
    handleAuthCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Ensure we have a valid session (recovery) before updating password
    const { data: sessionCheck } = await supabase.auth.getSession()
    if (!sessionCheck.session) {
      const code = extractRecoveryCode()
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError("Invalid or expired reset link")
          setIsLoading(false)
          setIsSessionReady(false)
          return
        }
        setIsSessionReady(true)
      } else {
        setError("Invalid or expired reset link")
        setIsLoading(false)
        setIsSessionReady(false)
        return
      }
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })
      if (error) throw error
      router.push("/auth/login?message=Password updated successfully")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image src="/logo.png" alt="Our Own Marble House" width={120} height={32} className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Set New Password</CardTitle>
            <CardDescription className="text-muted-foreground">Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full"
                />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading || !isSessionReady}>
                {isLoading ? "Updating..." : !isSessionReady ? "Verifying link..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
