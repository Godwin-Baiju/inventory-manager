import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ReservationsTable } from "@/components/reservations-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; status?: string; page?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user info from auth.users
  const user = data.user

  // Get all inventory items for filtering
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("id, item_name, item_brand, size")
    .order("item_name")

  // Pagination
  const page = Number.parseInt(params.page || "1")
  const itemsPerPage = 20
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  // Build query for reservations with filters - try view with user info first
  let query = supabase
    .from("reservations_with_users")
    .select(
      `
      *,
      inventory_items (
        item_name,
        item_brand,
        size,
        stock_qty
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })

  const { data: reservations, count, error: queryError } = await query

  // If view doesn't exist, fallback to regular table
  if (queryError) {
    console.log("View not available, falling back to regular table")
    const fallbackQuery = supabase
      .from("reservations")
      .select(
        `
        *,
        inventory_items (
          item_name,
          item_brand,
          size,
          stock_qty
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })

    // Apply filters to fallback query
    if (params.item && params.item !== "all") {
      fallbackQuery.eq("item_id", params.item)
    }
    if (params.status && params.status !== "all") {
      fallbackQuery.eq("status", params.status)
    }

    const { data: fallbackReservations, count: fallbackCount } = await fallbackQuery.range(from, to)
    const totalPages = Math.ceil((fallbackCount || 0) / itemsPerPage)

    return (
      <DashboardLayout userEmail={data.user.email!} userName={user.user_metadata?.full_name || user.email}>
        <div className="p-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Stock Reservations</h1>
              <p className="text-muted-foreground">Manage reserved stock for parties</p>
            </div>
            <Link href="/dashboard/reservations/add">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Reservation
              </Button>
            </Link>
          </div>
          <ReservationsTable
            reservations={fallbackReservations || []}
            inventoryItems={inventoryItems || []}
            currentPage={page}
            totalPages={totalPages}
            totalCount={fallbackCount || 0}
            filters={{
              item: params.item,
              status: params.status,
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  // Apply filters to the main query
  if (params.item && params.item !== "all") {
    query = query.eq("item_id", params.item)
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: finalReservations, count: finalCount } = await query.range(from, to)

  const totalPages = Math.ceil((finalCount || 0) / itemsPerPage)

  return (
    <DashboardLayout userEmail={data.user.email!} userName={user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stock Reservations</h1>
            <p className="text-muted-foreground">Manage reserved stock for parties</p>
          </div>
          <Link href="/dashboard/reservations/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Reservation
            </Button>
          </Link>
        </div>
        <ReservationsTable
          reservations={finalReservations || []}
          inventoryItems={inventoryItems || []}
          currentPage={page}
          totalPages={totalPages}
          totalCount={finalCount || 0}
          filters={{
            item: params.item,
            status: params.status,
          }}
        />
      </div>
    </DashboardLayout>
  )
}
