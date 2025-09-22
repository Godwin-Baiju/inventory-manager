"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, TrendingUp, TrendingDown, History } from "lucide-react"
import Link from "next/link"

interface ItemTransaction {
  id: string
  transaction_type: "in" | "out"
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string | null
  created_at: string
  created_by: string
  user_name?: string
}

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  remark: string | null
  created_at: string
  updated_at: string
}

interface ItemHistoryViewProps {
  item: InventoryItem
  transactions: ItemTransaction[]
}

export function ItemHistoryView({ item, transactions }: ItemHistoryViewProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }

  const totalStockIn = transactions.filter((t) => t.transaction_type === "in").reduce((sum, t) => sum + t.quantity, 0)

  const totalStockOut = transactions.filter((t) => t.transaction_type === "out").reduce((sum, t) => sum + t.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Inventory
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Item History</h1>
          <p className="text-muted-foreground">Complete transaction history for this item</p>
        </div>
      </div>

      {/* Item Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Item Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Item Name</label>
                <p className="text-lg font-semibold">{item.item_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Brand</label>
                <p>{item.item_brand}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Size</label>
                <p>{item.size}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                <p className="text-2xl font-bold text-primary">{item.stock_qty} units</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Remark</label>
                <p>{item.remark || "No remarks"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p>{formatDateTime(item.updated_at).date}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{totalStockIn}</div>
            <p className="text-xs text-muted-foreground">Units added</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{totalStockOut}</div>
            <p className="text-xs text-muted-foreground">Units removed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">Stock movements</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All stock movements for this item</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-16">
              <History className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
              <p className="text-muted-foreground">This item hasn't had any stock movements</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Stock Change</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const { date, time } = formatDateTime(transaction.created_at)
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{date}</div>
                            <div className="text-sm text-muted-foreground">{time}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={transaction.transaction_type === "in" ? "default" : "secondary"}
                            className="flex items-center w-fit"
                          >
                            {transaction.transaction_type === "in" ? (
                              <TrendingUp className="mr-1 h-3 w-3" />
                            ) : (
                              <TrendingDown className="mr-1 h-3 w-3" />
                            )}
                            Stock {transaction.transaction_type === "in" ? "In" : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              transaction.transaction_type === "in" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {transaction.transaction_type === "in" ? "+" : "-"}
                            {transaction.quantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-muted-foreground">{transaction.previous_stock}</span>
                            <span className="mx-2">→</span>
                            <span className="font-medium">{transaction.new_stock}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{transaction.user_name || "Unknown"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {transaction.reason || "-"}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
