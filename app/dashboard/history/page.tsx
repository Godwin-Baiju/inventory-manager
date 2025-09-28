import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { HistoryTable } from "@/components/history-table"

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user info from auth.users
  const user = data.user


  console.log("[v0] Fetching transactions...")

  // No server-side pagination - fetch all results for client-side pagination

  // Try to get data from the view with user information first
  let count, transactions, transactionsError, countError

  try {
    // First, try to get total count with filters
    let countQuery = supabase
      .from("stock_transactions_with_users")
      .select("*", { count: 'exact', head: true })

    // Apply filters to count query
    if (params.type && params.type !== "all" && (params.type === "in" || params.type === "out")) {
      countQuery = countQuery.eq("transaction_type", params.type)
    }

    const countResult = await countQuery
    count = countResult.count
    countError = countResult.error

    if (countError) {
      console.log("[v0] Error fetching count from view:", countError)
      throw new Error("View not available")
    } else {
      console.log("[v0] Total transaction count:", count)
    }

    // Now get the actual transactions with pagination and user information
    let query = supabase
      .from("stock_transactions_with_users")
      .select(
        `
        *,
        inventory_items (
          item_name,
          item_brand,
          size
        )
      `
      )
      .order("created_at", { ascending: false })

    // Apply filters
    if (params.type && params.type !== "all" && (params.type === "in" || params.type === "out")) {
      query = query.eq("transaction_type", params.type)
    }

    const transactionsResult = await query
    transactions = transactionsResult.data
    transactionsError = transactionsResult.error

  } catch (error) {
    console.log("[v0] View not available, falling back to regular table")
    
    // Fallback to regular table if view doesn't exist
    let countQuery = supabase
      .from("stock_transactions")
      .select("*", { count: 'exact', head: true })

    // Apply filters to count query
    if (params.type && params.type !== "all" && (params.type === "in" || params.type === "out")) {
      countQuery = countQuery.eq("transaction_type", params.type)
    }

    const countResult = await countQuery
    count = countResult.count
    countError = countResult.error

    if (countError) {
      console.log("[v0] Error fetching count:", countError)
    } else {
      console.log("[v0] Total transaction count:", count)
    }

    // Now get the actual transactions with pagination
    let query = supabase
      .from("stock_transactions")
      .select(
        `
        *,
        inventory_items (
          item_name,
          item_brand,
          size
        )
      `
      )
      .order("created_at", { ascending: false })

    // Apply filters
    if (params.type && params.type !== "all" && (params.type === "in" || params.type === "out")) {
      query = query.eq("transaction_type", params.type)
    }

    const transactionsResult = await query
    transactions = transactionsResult.data
    transactionsError = transactionsResult.error
  }

  if (transactionsError) {
    console.log("[v0] Error fetching transactions:", transactionsError)
  } else {
    console.log("[v0] Fetched transactions:", transactions?.length || 0)
  }

  // Calculate total pages based on filtered results
  // Since we're doing server-side filtering, we need to get the count of filtered results
  // No server-side pagination needed

  return (
    <DashboardLayout userEmail={data.user.email!} userName={user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground">Complete audit trail of all stock movements</p>
        </div>
        <HistoryTable
          transactions={transactions || []}
          inventoryItems={[]}
          currentPage={1}
          totalPages={1}
          totalCount={count || 0}
          filters={{
            type: params.type,
          }}
        />
      </div>
    </DashboardLayout>
  )
}
