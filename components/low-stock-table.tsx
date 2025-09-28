"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Package, Search, Plus } from "lucide-react"
import Link from "next/link"
import { StockUpdateDialog } from "@/components/stock-update-dialog"

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  low_stock_warning: number
  remark?: string
  created_at: string
}

interface LowStockTableProps {
  items: InventoryItem[]
}

export function LowStockTable({ items }: LowStockTableProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredItems = items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.size.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStockStatus = (stockQty: number, warningQty: number) => {
    if (stockQty === 0) {
      return { label: "Out of Stock", variant: "destructive" as const }
    } else if (stockQty <= warningQty / 2) {
      return { label: "Critical", variant: "destructive" as const }
    } else {
      return { label: "Low Stock", variant: "secondary" as const }
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Low Stock Items</h3>
          <p className="text-muted-foreground text-center mb-4">All your inventory items are well stocked!</p>
          <Button asChild>
            <Link href="/dashboard/inventory">
              <Package className="mr-2 h-4 w-4" />
              View All Inventory
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
            Low Stock Alert ({filteredItems.length} items)
          </CardTitle>
          <CardDescription>
            Items that have fallen below their warning threshold and need immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button asChild>
              <Link href="/dashboard/add-item">
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Link>
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Warning Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const status = getStockStatus(item.stock_qty, item.low_stock_warning)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.item_brand} • {item.size}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.stock_qty}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground">{item.low_stock_warning}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <StockUpdateDialog item={item} onUpdate={() => window.location.reload()} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
