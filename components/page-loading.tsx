"use client"

import { Loader2 } from "lucide-react"

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

export function FullPageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        </div>
        <p className="text-muted-foreground text-lg font-medium">{message}</p>
      </div>
    </div>
  )
}
