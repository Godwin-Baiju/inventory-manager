import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Plus, Package } from "lucide-react"
import Link from "next/link"
import { InventoryList } from "@/components/inventory-list"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  console.log("[v0] Fetching inventory for user:", data.user.id)

  // Get user info from auth.users and profiles
  const user = data.user
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  console.log("[v0] User:", user.email)

  // Pagination
  const page = Number.parseInt(params.page || "1")
  const itemsPerPage = 20
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  // Try to get data from the view with user information first
  let count, inventoryItems, inventoryError, countError

  try {
    // First, get total count with search filter
    let countQuery = supabase
      .from("inventory_items_with_users")
      .select("*", { count: 'exact', head: true })

    if (params.search) {
      const searchTerm = params.search.toLowerCase()
      countQuery = countQuery.or(`item_name.ilike.%${searchTerm}%,item_brand.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%,remark.ilike.%${searchTerm}%`)
    }

    const countResult = await countQuery
    count = countResult.count
    countError = countResult.error

    if (countError) {
      console.log("[v0] Error fetching count from view:", countError)
      throw new Error("View not available")
    } else {
      console.log("[v0] Total inventory count:", count)
    }

    // Get paginated inventory items with user information and search filter
    let itemsQuery = supabase
      .from("inventory_items_with_users")
      .select("*, reserved_quantity")
      .order("created_at", { ascending: false })

    if (params.search) {
      const searchTerm = params.search.toLowerCase()
      itemsQuery = itemsQuery.or(`item_name.ilike.%${searchTerm}%,item_brand.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%,remark.ilike.%${searchTerm}%`)
    }

    const itemsResult = await itemsQuery.range(from, to)
    inventoryItems = itemsResult.data
    inventoryError = itemsResult.error

  } catch (error) {
    console.log("[v0] View not available, falling back to regular table")
    
    // Fallback to regular table if view doesn't exist
    let countQuery = supabase
      .from("inventory_items")
      .select("*", { count: 'exact', head: true })

    if (params.search) {
      const searchTerm = params.search.toLowerCase()
      countQuery = countQuery.or(`item_name.ilike.%${searchTerm}%,item_brand.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%,remark.ilike.%${searchTerm}%`)
    }

    const countResult = await countQuery
    count = countResult.count
    countError = countResult.error

    if (countError) {
      console.log("[v0] Error fetching count:", countError)
    } else {
      console.log("[v0] Total inventory count:", count)
    }

    // Get paginated inventory items with search filter
    let itemsQuery = supabase
      .from("inventory_items")
      .select("*, reserved_quantity")
      .order("created_at", { ascending: false })

    if (params.search) {
      const searchTerm = params.search.toLowerCase()
      itemsQuery = itemsQuery.or(`item_name.ilike.%${searchTerm}%,item_brand.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%,remark.ilike.%${searchTerm}%`)
    }

    const itemsResult = await itemsQuery.range(from, to)
    inventoryItems = itemsResult.data
    inventoryError = itemsResult.error
  }

  console.log("[v0] Inventory query result:", { inventoryItems, inventoryError })
  console.log("[v0] Number of items found:", inventoryItems?.length || 0)

  const totalPages = Math.ceil((count || 0) / itemsPerPage)

  return (
    <DashboardLayout userEmail={data.user.email!} userName={profile?.full_name || user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory Items</h1>
            <p className="text-muted-foreground">Manage your inventory items and stock levels</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/add-item">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Link>
          </Button>
        </div>

        <InventoryList 
          items={inventoryItems || []} 
          currentPage={page}
          totalPages={totalPages}
          totalCount={count || 0}
          searchQuery={params.search}
        />
      </div>
    </DashboardLayout>
  )
}
