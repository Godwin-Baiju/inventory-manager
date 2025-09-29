import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { LowStockTable } from "@/components/low-stock-table"

export default async function LowStockPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const user = data.user
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  // Fetch low stock items using a SQL view
  const { data: lowStockItems, error: itemsError } = await supabase
    .from("low_stock_items")
    .select("*")
    .order("stock_qty", { ascending: true })

  if (itemsError) {
    console.error("Error fetching low stock items:", itemsError)
  }

  return (
    <DashboardLayout userEmail={user.email!} userName={profile?.full_name || user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Low Stock Items</h1>
          <p className="text-muted-foreground">Items that are running low and need restocking</p>
        </div>
        <LowStockTable items={lowStockItems || []} />
      </div>
    </DashboardLayout>
  )
}
