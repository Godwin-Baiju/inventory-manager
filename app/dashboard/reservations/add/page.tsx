import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AddReservationForm } from "@/components/add-reservation-form"

export default async function AddReservationPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user info from auth.users
  const user = data.user

  // Get all inventory items for the form
  console.log("[v0] Fetching inventory items...")
  const { data: inventoryItems, error: itemsError } = await supabase
    .from("inventory_items")
    .select("id, item_name, item_brand, size, stock_qty, reserved_quantity")
    .order("item_name")

  if (itemsError) {
    console.log("[v0] Error fetching inventory items:", itemsError)
  } else {
    console.log("[v0] Fetched inventory items:", inventoryItems?.length || 0)
  }

  return (
    <DashboardLayout userEmail={data.user.email!} userName={user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Add Stock Reservation</h1>
          <p className="text-muted-foreground">Reserve stock for a specific party</p>
        </div>
        <AddReservationForm inventoryItems={inventoryItems || []} userId={data.user.id} />
      </div>
    </DashboardLayout>
  )
}
