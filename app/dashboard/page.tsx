import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, TrendingUp, AlertTriangle, History } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user info from auth.users
  const user = data.user

  // Get inventory statistics
  // Get total count of items
  const { count: totalItems } = await supabase
    .from("inventory_items")
    .select("*", { count: 'exact', head: true })

  // Get total stock quantity using pagination to handle large datasets
  let totalStock = 0
  let offset = 0
  const batchSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: stockData, error: stockError } = await supabase
      .from("inventory_items")
      .select("stock_qty")
      .range(offset, offset + batchSize - 1)

    if (stockError) {
      console.error("Error fetching stock data:", stockError)
      break
    }

    if (stockData && stockData.length > 0) {
      const batchTotal = stockData.reduce((sum, item) => sum + (item.stock_qty || 0), 0)
      totalStock += batchTotal
      offset += batchSize
      hasMore = stockData.length === batchSize
    } else {
      hasMore = false
    }
  }

  // Get low stock items count using the same view as low stock page
  const { count: lowStockItems } = await supabase
    .from("low_stock_items")
    .select("*", { count: 'exact', head: true })

  // Get recent transactions count
  const { data: recentTransactions } = await supabase
    .from("stock_transactions")
    .select("id")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const recentTransactionsCount = recentTransactions?.length || 0

  return (
    <DashboardLayout userEmail={data.user.email!} userName={user.user_metadata?.full_name || user.email}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Items in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStock}</div>
              <p className="text-xs text-muted-foreground">Units in stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Items need restocking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentTransactionsCount}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your inventory efficiently</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href="/dashboard/add-item"
                className="flex items-center w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Package className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Add New Item</p>
                  <p className="text-sm text-muted-foreground">Create a new inventory item</p>
                </div>
              </a>
              <a
                href="/dashboard/history"
                className="flex items-center w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <History className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">View History</p>
                  <p className="text-sm text-muted-foreground">Track all stock changes</p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Summary</CardTitle>
              <CardDescription>Current stock status</CardDescription>
            </CardHeader>
            <CardContent>
              {totalItems === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">No inventory items yet</p>
                  <p className="text-sm">Start by adding your first inventory item</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Items in stock</span>
                    <span className="font-medium">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total units</span>
                    <span className="font-medium">{totalStock}</span>
                  </div>
                  {lowStockItems > 0 && (
                    <div className="flex justify-between items-center text-destructive">
                      <span className="text-sm">Low stock alerts</span>
                      <span className="font-medium">{lowStockItems}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
