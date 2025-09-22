"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ArrowLeft, Package, CalendarPlus } from "lucide-react"
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
  reserved_quantity?: number
}

interface ItemReservationFormProps {
  item: InventoryItem
  userId: string
}

export function ItemReservationForm({ item, userId }: ItemReservationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [reservedUntil, setReservedUntil] = useState<Date>()
  const [isDateOpen, setIsDateOpen] = useState(false)

  const [formData, setFormData] = useState({
    partyName: "",
    partyContact: "",
    partyAddress: "",
    reservedQuantity: "",
    notes: "",
  })

  const available = item.stock_qty - (item.reserved_quantity || 0)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Validate required fields
    if (!formData.partyName.trim()) {
      alert("Party name is required")
      setIsLoading(false)
      return
    }

    if (!formData.reservedQuantity || Number.parseInt(formData.reservedQuantity) <= 0) {
      alert("Reserved quantity must be greater than 0")
      setIsLoading(false)
      return
    }

    if (!reservedUntil) {
      alert("Reserved until date is required")
      setIsLoading(false)
      return
    }

    const quantity = Number.parseInt(formData.reservedQuantity)
    if (quantity > available) {
      alert(`Cannot reserve more than available stock. Available: ${available}`)
      setIsLoading(false)
      return
    }

    try {
      const result = await createReservation({
        itemId: item.id,
        partyName: formData.partyName.trim(),
        partyContact: formData.partyContact.trim() || null,
        partyAddress: formData.partyAddress.trim() || null,
        reservedQuantity: quantity,
        reservedUntil: reservedUntil.toISOString().split('T')[0],
        notes: formData.notes.trim() || null,
        createdBy: userId,
      })

      if (result.error) {
        alert(result.error)
      } else {
        router.push(`/dashboard/inventory/${item.id}/reservations`)
      }
    } catch (error) {
      alert("An unexpected error occurred")
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

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Reservation</h1>
        <p className="text-muted-foreground">Reserve stock for this specific item</p>
      </div>

      {/* Item Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Item Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Item Name</p>
              <p className="font-medium">{item.item_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Brand</p>
              <p className="font-medium">{item.item_brand}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Size</p>
              <p className="font-medium">{item.size}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Stock</p>
              <p className="font-medium">{item.stock_qty}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reserved</p>
              <p className="font-medium text-orange-600">{item.reserved_quantity || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="font-medium text-green-600">{available}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarPlus className="mr-2 h-5 w-5" />
            Reservation Details
          </CardTitle>
          <CardDescription>Fill in the details for this reservation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="partyName">Party Name *</Label>
                <Input
                  id="partyName"
                  value={formData.partyName}
                  onChange={(e) => handleInputChange("partyName", e.target.value)}
                  placeholder="Enter party name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyContact">Party Contact</Label>
                <Input
                  id="partyContact"
                  value={formData.partyContact}
                  onChange={(e) => handleInputChange("partyContact", e.target.value)}
                  placeholder="Phone number or email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partyAddress">Party Address</Label>
              <Textarea
                id="partyAddress"
                value={formData.partyAddress}
                onChange={(e) => handleInputChange("partyAddress", e.target.value)}
                placeholder="Enter party address"
                rows={2}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reservedQuantity">Reserved Quantity *</Label>
                <Input
                  id="reservedQuantity"
                  type="number"
                  min="1"
                  max={available}
                  value={formData.reservedQuantity}
                  onChange={(e) => handleInputChange("reservedQuantity", e.target.value)}
                  placeholder="Enter quantity"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Maximum available: {available} units
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reserved Until *</Label>
                <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !reservedUntil && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reservedUntil ? format(reservedUntil, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reservedUntil}
                      onSelect={(date) => {
                        setReservedUntil(date)
                        setIsDateOpen(false)
                      }}
                      disabled={(date) => date < new Date()}
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
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Creating Reservation..." : "Create Reservation"}
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
