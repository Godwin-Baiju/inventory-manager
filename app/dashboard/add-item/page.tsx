import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AddItemForm } from "@/components/add-item-form"

export default async function AddItemPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user info from auth.users
  const user = data.user

  return (
    <DashboardLayout userEmail={data.user.email!} userName={user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Add New Item</h1>
          <p className="text-muted-foreground">Create a new inventory item with initial stock</p>
        </div>
        <AddItemForm />
      </div>
    </DashboardLayout>
  )
}
