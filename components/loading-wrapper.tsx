"use client"

import { useEffect, useState } from "react"
import { PageLoading } from "./page-loading"

interface LoadingWrapperProps {
  children: React.ReactNode
  loading?: boolean
  message?: string
  delay?: number
}

export function LoadingWrapper({ 
  children, 
  loading = false, 
  message = "Loading...", 
  delay = 0 
}: LoadingWrapperProps) {
  const [showLoading, setShowLoading] = useState(loading)

  useEffect(() => {
    if (loading) {
      if (delay > 0) {
        const timer = setTimeout(() => setShowLoading(true), delay)
        return () => clearTimeout(timer)
      } else {
        setShowLoading(true)
      }
    } else {
      setShowLoading(false)
    }
  }, [loading, delay])

  if (showLoading) {
    return <PageLoading message={message} />
  }

  return <>{children}</>
}
