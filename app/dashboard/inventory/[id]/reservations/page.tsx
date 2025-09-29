import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ItemReservationsView } from "@/components/item-reservations-view"

export default async function ItemReservationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

  // Get the inventory item details
  const { data: item, error: itemError } = await supabase
    .from("inventory_items")
    .select("id, item_name, item_brand, size, stock_qty, reserved_quantity")
    .eq("id", id)
    .single()

  if (itemError || !item) {
    redirect("/dashboard/inventory")
  }

  return (
    <DashboardLayout userEmail={data.user.email!} userName={profile?.full_name || user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <ItemReservationsView item={item} />
      </div>
    </DashboardLayout>
  )
}
