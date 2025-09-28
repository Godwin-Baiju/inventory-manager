"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { updateStock } from "@/lib/actions/inventory"
import { ArrowLeft, TrendingUp, TrendingDown, Package } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  reserved_quantity?: number
}

interface ReservationOption {
  id: string
  party_name: string
  reserved_quantity: number
  reserved_until: string
}

interface StockUpdateFormProps {
  inventoryItems: InventoryItem[]
  onInventoryUpdate?: () => void
}

export function StockUpdateForm({ inventoryItems, onInventoryUpdate }: StockUpdateFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [transactionType, setTransactionType] = useState<"in" | "out">("in")
  const [selectedReservationId, setSelectedReservationId] = useState<string>("")
  const [reservations, setReservations] = useState<ReservationOption[]>([])
  const [isLoadingReservations, setIsLoadingReservations] = useState(false)
  const [manualQuantity, setManualQuantity] = useState<string>("")
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  const handleItemSelect = (itemId: string) => {
    const item = inventoryItems.find((item) => item.id === itemId)
    setSelectedItem(item || null)
    // Reset selection and quantity on item change
    setSelectedReservationId("")
    setManualQuantity("")
  }

  // Load active reservations for selected item when doing stock out
  useEffect(() => {
    const loadReservations = async () => {
      if (!selectedItem || transactionType !== "out") {
        setReservations([])
        return
      }
      setIsLoadingReservations(true)
      const { data, error } = await supabase
        .from("reservations")
        .select("id, party_name, reserved_quantity, reserved_until")
        .eq("item_id", selectedItem.id)
        .eq("status", "active")
        .order("reserved_until", { ascending: true })
      
      if (!error && data) {
        setReservations(data as unknown as ReservationOption[])
        
        // If no active reservations found, update the item's reserved_quantity to 0
        if (data.length === 0 && selectedItem.reserved_quantity && selectedItem.reserved_quantity > 0) {
          const { error: updateError } = await supabase
            .from("inventory_items")
            .update({ reserved_quantity: 0 })
            .eq("id", selectedItem.id)
          
          if (!updateError) {
            // Update the selectedItem state to reflect the change
            setSelectedItem(prev => prev ? { ...prev, reserved_quantity: 0 } : null)
            // Notify parent component to refresh inventory data
            if (onInventoryUpdate) {
              onInventoryUpdate()
            }
          }
        }
      } else {
        setReservations([])
      }
      setIsLoadingReservations(false)
    }
    loadReservations()
  }, [selectedItem?.id, transactionType, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate that an item is selected
    if (!selectedItem) {
      setIsLoading(false)
      setError("Please select an item")
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set("item_id", selectedItem.id)
    formData.append("transaction_type", transactionType)

    // Handle quantity based on transaction type and reservation selection
    if (transactionType === "out") {
      if (selectedReservationId) {
        // Use the selected reservation's reserved_quantity as quantity
        const res = reservations.find((r) => r.id === selectedReservationId)
        const qty = res?.reserved_quantity ?? 0
        formData.set("quantity", String(qty))
        formData.set("reservation_id", selectedReservationId)
        if (qty <= 0) {
          setIsLoading(false)
          setError("Selected reservation has zero quantity")
          return
        }
      } else {
        // No reservation selected; use manual quantity
        if (!manualQuantity || Number.parseInt(manualQuantity) <= 0) {
          setIsLoading(false)
          setError("Enter a quantity to stock out or select a reservation")
          return
        }
        formData.set("quantity", manualQuantity)
      }
    } else {
      // Stock in - use manual quantity
      if (!manualQuantity || Number.parseInt(manualQuantity) <= 0) {
        setIsLoading(false)
        setError("Enter a quantity to stock in")
        return
      }
      formData.set("quantity", manualQuantity)
    }

    try {
      const result = await updateStock(formData)
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

  const quantityDisabled = transactionType === "out" && !!selectedReservationId
  const reservationDisabled = transactionType !== "out" || isLoadingReservations || reservations.length === 0

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

      {inventoryItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No inventory items found</h3>
            <p className="text-muted-foreground text-center mb-6">You need to add some items before updating stock</p>
            <Button asChild>
              <Link href="/dashboard/add-item">Add Your First Item</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Stock Update
            </CardTitle>
            <CardDescription>Select an item and update its stock quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="item_id">Select Item *</Label>
                <SearchableSelect
                  value={selectedItem?.id || ""}
                  onValueChange={handleItemSelect}
                  placeholder="Choose an inventory item"
                  searchPlaceholder="Search items..."
                  emptyMessage="No items found."
                  items={inventoryItems.map((item) => {
                    const reserved = item.reserved_quantity || 0
                    const available = item.stock_qty - reserved
                    return {
                      value: item.id,
                      label: `${item.item_name} - ${item.item_brand} (${item.size}) - Total: ${item.stock_qty}, Available: ${available}`
                    }
                  })}
                  required
                />
              </div>

              {selectedItem && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Selected Item Details</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item:</span>
                      <span>{selectedItem.item_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Brand:</span>
                      <span>{selectedItem.item_brand}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{selectedItem.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Stock:</span>
                      <span className="font-medium">{selectedItem.stock_qty} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reserved:</span>
                      <span className="font-medium text-orange-600">{(selectedItem.reserved_quantity || 0)} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available:</span>
                      <span className="font-medium text-green-600">{selectedItem.stock_qty - (selectedItem.reserved_quantity || 0)} units</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Transaction Type *</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={transactionType === "in" ? "default" : "outline"}
                      onClick={() => {
                        setTransactionType("in")
                        setSelectedReservationId("")
                      }}
                      className="flex-1"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Stock In
                    </Button>
                    <Button
                      type="button"
                      variant={transactionType === "out" ? "default" : "outline"}
                      onClick={() => setTransactionType("out")}
                      className="flex-1"
                    >
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Stock Out
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max={transactionType === "out" && selectedItem ? selectedItem.stock_qty - (selectedItem.reserved_quantity || 0) : undefined}
                    placeholder="Enter quantity"
                    required
                    className="w-full"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(e.target.value)}
                    disabled={quantityDisabled}
                  />
                  {quantityDisabled && selectedReservationId && (
                    <p className="text-xs text-muted-foreground">
                      Quantity is determined by the selected reservation.
                    </p>
                  )}
                </div>
              </div>

              {transactionType === "out" && selectedItem && (
                <div className="space-y-2">
                  <Label htmlFor="reservation_id">Reservation (optional)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        value={selectedReservationId}
                        onValueChange={(val) => {
                          setSelectedReservationId(val)
                          if (val) {
                            // Clear manual quantity when a reservation is selected
                            setManualQuantity("")
                          }
                        }}
                        placeholder={
                          isLoadingReservations
                            ? "Loading reservations..."
                            : reservations.length === 0
                            ? "No active reservations"
                            : "Select a reservation"
                        }
                        searchPlaceholder="Search reservations..."
                        emptyMessage="No reservations found."
                        items={reservations.map((r) => ({
                          value: r.id,
                          label: `${r.party_name} • ${r.reserved_quantity} units • until ${new Date(r.reserved_until).toLocaleDateString('en-US')}`
                        }))}
                        disabled={reservationDisabled}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={!selectedReservationId}
                      onClick={() => setSelectedReservationId("")}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select a reservation to stock out its full reserved quantity. To stock out a custom amount from available stock, leave this
                    unselected and enter a quantity (max: {selectedItem ? selectedItem.stock_qty - (selectedItem.reserved_quantity || 0) : 0} units).
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Enter reason for stock update (optional)"
                  className="w-full"
                  rows={3}
                />
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading || !selectedItem} className="flex-1">
                  {isLoading ? "Updating Stock..." : `Update Stock ${transactionType === "in" ? "In" : "Out"}`}
                </Button>
                <Button type="button" variant="outline" asChild className="flex-1 bg-transparent">
                  <Link href="/dashboard/inventory">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
