"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  PackageSearch,
  History,
  Menu,
  LogOut,
  PackagePlus,
  TriangleAlert,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface DashboardLayoutProps {
  children: React.ReactNode
  userEmail: string
  userName?: string
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/dashboard/inventory", icon: PackageSearch },
  { name: "Add Item", href: "/dashboard/add-item", icon: PackagePlus },
  { name: "Reservations", href: "/dashboard/reservations", icon: Calendar },
  { name: "Low Stock Items", href: "/dashboard/low-stock", icon: TriangleAlert },
  { name: "History", href: "/dashboard/history", icon: History },
]

export function DashboardLayout({ children, userEmail, userName }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex h-full flex-col", mobile ? "w-full" : "w-64")}>
      <div className="flex h-16 items-center justify-center border-b px-6 w-full">
        <Image src="/logo.png" alt="Our Own Marble House" width={120} height={32} className="h-12 w-auto" />
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              onClick={() => mobile && setSidebarOpen(false)}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
			{(() => {
				const primaryText = userName && userName !== userEmail ? userName : (userEmail || "User")
				const showSecondary = Boolean(userEmail && userName && userName !== userEmail)
				return (
					<div className="flex items-center space-x-3 mb-3">
						<div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
							<span className="text-sm font-medium text-primary-foreground">
								{primaryText.charAt(0).toUpperCase()}
							</span>
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-foreground truncate">{primaryText}</p>
							{showSecondary && (
								<p className="text-xs text-muted-foreground truncate">{userEmail}</p>
							)}
						</div>
					</div>
				)
			})()}
        <form action="/auth/signout" method="post">
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" type="submit">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b md:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex items-center justify-center">
            <Image src="/logo.png" alt="Our Own Marble House" width={100} height={24} className="h-12 w-auto" />
          </div>
          <div className="w-10" /> {/* Spacer to balance the hamburger menu */}
        </div>
      </div>

      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-64 flex-col border-r bg-card">
          <Sidebar />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0">{children}</main>
      </div>
    </div>
  )
}
