import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StockUpdateFormWrapper } from "@/components/stock-update-form-wrapper"

export default async function StockUpdatesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user info from auth.users
  const user = data.user
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  return (
    <DashboardLayout userEmail={data.user.email!} userName={profile?.full_name || user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Update Stock</h1>
          <p className="text-muted-foreground">Adjust inventory levels and track stock movements</p>
        </div>
        <StockUpdateFormWrapper />
      </div>
    </DashboardLayout>
  )
}
