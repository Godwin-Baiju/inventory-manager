"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { StockUpdateForm } from "@/components/stock-update-form"

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  reserved_quantity?: number
}

export function StockUpdateFormWrapper() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadInventoryItems = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, item_name, item_brand, size, stock_qty, reserved_quantity")
        .order("item_name")

      if (error) {
        setError("Failed to load inventory items")
        console.error("Error loading inventory items:", error)
      } else {
        setInventoryItems(data || [])
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Unexpected error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInventoryItems()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading inventory items...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive mb-4">{error}</div>
        <button 
          onClick={loadInventoryItems}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <StockUpdateForm 
      inventoryItems={inventoryItems} 
      onInventoryUpdate={loadInventoryItems}
    />
  )
}
