"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { createReservation } from "@/lib/actions/reservations"
import Link from "next/link"

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  reserved_quantity: number
}

interface AddReservationFormProps {
  inventoryItems: InventoryItem[]
  userId: string
}

export function AddReservationForm({ inventoryItems, userId }: AddReservationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [reservedUntil, setReservedUntil] = useState<Date>()
  const [isDateOpen, setIsDateOpen] = useState(false)

  const [formData, setFormData] = useState({
    itemId: "",
    partyName: "",
    partyContact: "",
    partyAddress: "",
    reservedQuantity: "",
    notes: "",
  })

  const handleItemChange = (itemId: string) => {
    const item = inventoryItems.find((i) => i.id === itemId)
    setSelectedItem(item || null)
    setFormData({ ...formData, itemId })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reservedUntil) return

    setIsLoading(true)
    try {
      const result = await createReservation({
        itemId: formData.itemId,
        partyName: formData.partyName,
        partyContact: formData.partyContact || null,
        partyAddress: formData.partyAddress || null,
        reservedQuantity: Number.parseInt(formData.reservedQuantity),
        reservedUntil: format(reservedUntil, "yyyy-MM-dd"),
        notes: formData.notes || null,
        createdBy: userId,
      })

      if (result.success) {
        router.push("/dashboard/reservations")
      } else {
        alert(result.error || "Failed to create reservation")
      }
    } catch (error) {
      console.error("Error creating reservation:", error)
      alert("Failed to create reservation")
    } finally {
      setIsLoading(false)
    }
  }

  const availableQuantity = selectedItem ? selectedItem.stock_qty - selectedItem.reserved_quantity : 0

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/reservations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reservations
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservation Details</CardTitle>
          <CardDescription>Fill in the details to create a new stock reservation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Selection */}
            <div className="space-y-2">
              <Label htmlFor="item">Select Item *</Label>
              <SearchableSelect
                value={formData.itemId}
                onValueChange={handleItemChange}
                placeholder="Choose an item to reserve"
                searchPlaceholder="Search items..."
                emptyMessage="No items found."
                items={inventoryItems.map((item) => ({
                  value: item.id,
                  label: `${item.item_name} - ${item.item_brand} (${item.size}) - Available: ${item.stock_qty - item.reserved_quantity}`,
                  disabled: item.stock_qty - item.reserved_quantity <= 0
                }))}
                required
              />
              {selectedItem && (
                <p className="text-sm text-muted-foreground">
                  Total Stock: {selectedItem.stock_qty} | Reserved: {selectedItem.reserved_quantity} | Available:{" "}
                  {availableQuantity}
                </p>
              )}
            </div>

            {/* Party Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partyName">Party Name *</Label>
                <Input
                  id="partyName"
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder="Enter party name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyContact">Contact Number</Label>
                <Input
                  id="partyContact"
                  value={formData.partyContact}
                  onChange={(e) => setFormData({ ...formData, partyContact: e.target.value })}
                  placeholder="Enter contact number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partyAddress">Address</Label>
              <Textarea
                id="partyAddress"
                value={formData.partyAddress}
                onChange={(e) => setFormData({ ...formData, partyAddress: e.target.value })}
                placeholder="Enter party address"
                rows={3}
              />
            </div>

            {/* Reservation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reservedQuantity">Reserved Quantity *</Label>
                <Input
                  id="reservedQuantity"
                  type="number"
                  min="1"
                  max={availableQuantity}
                  value={formData.reservedQuantity}
                  onChange={(e) => setFormData({ ...formData, reservedQuantity: e.target.value })}
                  placeholder="Enter quantity to reserve"
                  required
                />
                {selectedItem && (
                  <p className="text-sm text-muted-foreground">Maximum available: {availableQuantity}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Reserved Until *</Label>
                <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !reservedUntil && "text-muted-foreground",
                      )}
                      aria-haspopup="dialog"
                      aria-expanded={isDateOpen}
                      onClick={() => setIsDateOpen((v) => !v)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reservedUntil ? format(reservedUntil, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reservedUntil}
                      onSelect={(date) => {
                        setReservedUntil(date)
                        setIsDateOpen(false)
                      }}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes or comments"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || !selectedItem || !reservedUntil || availableQuantity === 0}>
                {isLoading ? "Creating..." : "Create Reservation"}
              </Button>
              <Link href="/dashboard/reservations">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
