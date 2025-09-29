import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ItemHistoryView } from "@/components/item-history-view"

export default async function ItemHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

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

  // Get item details
  const { data: item } = await supabase.from("inventory_items").select("*").eq("id", id).single()

  if (!item) {
    redirect("/dashboard/inventory")
  }

  // Get all transactions for this item
  const { data: transactions } = await supabase
    .from("stock_transactions_with_users")
    .select("*")
    .eq("item_id", id)
    .order("created_at", { ascending: false })

  return (
    <DashboardLayout userEmail={data.user.email!} userName={profile?.full_name || user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <ItemHistoryView item={item} transactions={transactions || []} />
      </div>
    </DashboardLayout>
  )
}
