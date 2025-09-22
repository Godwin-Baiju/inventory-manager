import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If exchange failed or no code, redirect to login with error
  const errorUrl = new URL("/auth/login", request.url)
  errorUrl.searchParams.set("message", "Invalid or expired reset link")
  return NextResponse.redirect(errorUrl)
}

