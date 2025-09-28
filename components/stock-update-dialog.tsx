"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateStock } from "@/lib/actions/inventory"
import { TrendingUp, TrendingDown, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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

interface StockUpdateDialogProps {
  item: InventoryItem
  onUpdate?: () => void
}

export function StockUpdateDialog({ item, onUpdate }: StockUpdateDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionType, setTransactionType] = useState<"in" | "out">("in")
  const [selectedReservationId, setSelectedReservationId] = useState<string>("")
  const [reservations, setReservations] = useState<ReservationOption[]>([])
  const [isLoadingReservations, setIsLoadingReservations] = useState(false)
  const [manualQuantity, setManualQuantity] = useState<string>("")
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  // Load active reservations for the item when doing stock out
  useEffect(() => {
    const loadReservations = async () => {
      if (transactionType !== "out") {
        setReservations([])
        return
      }
      setIsLoadingReservations(true)
      const { data, error } = await supabase
        .from("reservations")
        .select("id, party_name, reserved_quantity, reserved_until")
        .eq("item_id", item.id)
        .eq("status", "active")
        .order("reserved_until", { ascending: true })
      
      if (!error && data) {
        setReservations(data as unknown as ReservationOption[])
      } else {
        setReservations([])
      }
      setIsLoadingReservations(false)
    }
    loadReservations()
  }, [item.id, transactionType, supabase])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setTransactionType("in")
      setSelectedReservationId("")
      setManualQuantity("")
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set("item_id", item.id)
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
        setIsOpen(false)
        if (onUpdate) {
          onUpdate()
        }
        router.refresh()
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const quantityDisabled = transactionType === "out" && !!selectedReservationId
  const reservationDisabled = transactionType !== "out" || isLoadingReservations || reservations.length === 0
  const reserved = item.reserved_quantity || 0
  const available = item.stock_qty - reserved

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Update Stock">
          <TrendingUp className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Update Stock - {item.item_name}
          </DialogTitle>
          <DialogDescription>
            Update the stock quantity for {item.item_name} - {item.item_brand} ({item.size})
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-muted rounded-lg mb-6">
          <h4 className="font-medium mb-2">Item Details</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item:</span>
              <span>{item.item_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Brand:</span>
              <span>{item.item_brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{item.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Stock:</span>
              <span className="font-medium">{item.stock_qty} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reserved:</span>
              <span className="font-medium text-orange-600">{reserved} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available:</span>
              <span className="font-medium text-green-600">{available} units</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                max={transactionType === "out" ? available : undefined}
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

          {transactionType === "out" && (
            <div className="space-y-2">
              <Label htmlFor="reservation_id">Reservation (optional)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="space-y-2">
                    {isLoadingReservations ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading reservations...
                      </div>
                    ) : reservations.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground border rounded">
                        No active reservations available
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reservations.map((r) => (
                          <div
                            key={r.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                              selectedReservationId === r.id 
                                ? 'bg-accent border-primary ring-1 ring-primary' 
                                : 'hover:border-border'
                            }`}
                            onClick={() => {
                              setSelectedReservationId(r.id)
                              setManualQuantity("")
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{r.party_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {r.reserved_quantity} units • until {new Date(r.reserved_until).toLocaleDateString('en-US')}
                                </div>
                              </div>
                              {selectedReservationId === r.id && (
                                <div className="text-primary font-medium text-sm">✓ Selected</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                unselected and enter a quantity (max: {available} units).
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
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Updating Stock..." : `Update Stock ${transactionType === "in" ? "In" : "Out"}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
