"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addInventoryItem } from "@/lib/actions/inventory"
import { ArrowLeft, Package } from "lucide-react"
import Link from "next/link"

export function AddItemForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await addInventoryItem(formData)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/dashboard/inventory")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Item Details
          </CardTitle>
          <CardDescription>Enter the details for your new inventory item</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  name="item_name"
                  type="text"
                  placeholder="Enter item name"
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item_brand">Brand *</Label>
                <Input
                  id="item_brand"
                  name="item_brand"
                  type="text"
                  placeholder="Enter brand name"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="size">Size *</Label>
                <Input
                  id="size"
                  name="size"
                  type="text"
                  placeholder="Enter size"
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_qty">Initial Stock Quantity *</Label>
                <Input
                  id="stock_qty"
                  name="stock_qty"
                  type="number"
                  min="0"
                  placeholder="Enter initial stock quantity"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="low_stock_warning">Low Stock Warning Quantity *</Label>
              <Input
                id="low_stock_warning"
                name="low_stock_warning"
                type="number"
                min="1"
                defaultValue="10"
                placeholder="Enter low stock warning quantity"
                required
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">You'll be notified when stock falls below this quantity</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remark">Remark</Label>
              <Textarea
                id="remark"
                name="remark"
                placeholder="Enter any additional notes or remarks (optional)"
                className="w-full"
                rows={3}
              />
            </div>

            {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Adding Item..." : "Add Item"}
              </Button>
              <Button type="button" variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/dashboard/inventory">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
