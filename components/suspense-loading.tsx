import { Suspense } from "react"
import { PageLoading } from "./page-loading"

interface SuspenseLoadingProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  message?: string
}

export function SuspenseLoading({ 
  children, 
  fallback, 
  message = "Loading..." 
}: SuspenseLoadingProps) {
  return (
    <Suspense fallback={fallback || <PageLoading message={message} />}>
      {children}
    </Suspense>
  )
}
