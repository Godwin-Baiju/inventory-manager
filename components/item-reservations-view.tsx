"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ArrowLeft, Calendar, Package, MoreHorizontal, Trash2, Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { deleteReservation } from "@/lib/actions/reservations"
import { useToast } from "@/hooks/use-toast"

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  reserved_quantity?: number
}

interface Reservation {
  id: string
  party_name: string
  party_contact: string | null
  party_address: string | null
  reserved_quantity: number
  reservation_date: string
  reserved_until: string
  notes: string | null
  status: string
  created_at: string
  created_by: string
  user_name?: string
}

interface ItemReservationsViewProps {
  item: InventoryItem
}

export function ItemReservationsView({ item }: ItemReservationsViewProps) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null)
  const { toast } = useToast()

  const supabase = createClient()

  useEffect(() => {
    loadReservations()
  }, [item.id])

  const loadReservations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Try to get data from a view with user information first
      let query = supabase
        .from("reservations_with_users")
        .select("*")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })

      const { data, error } = await query

      if (error) {
        console.log("View not available, falling back to regular table")
        // Fallback to regular table if view doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("reservations")
          .select("*")
          .eq("item_id", item.id)
          .order("created_at", { ascending: false })

        if (fallbackError) {
          setError("Failed to load reservations")
          console.error("Error loading reservations:", fallbackError)
          return
        } else {
          setReservations(fallbackData || [])
        }
      } else {
        setReservations(data || [])
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Unexpected error:", err)
    } finally {
      setIsLoading(false)
    }
  }


  const handleDelete = async () => {
    if (!reservationToDelete) return

    try {
      const result = await deleteReservation(reservationToDelete.id)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Reservation deleted successfully",
        })
        loadReservations()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reservation",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setReservationToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800"><Clock className="w-3 h-3 mr-1" />Active</Badge>
      case "fulfilled":
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Fulfilled</Badge>
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const available = item.stock_qty - (item.reserved_quantity || 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading reservations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={loadReservations}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Item Reservations</h1>
        <p className="text-muted-foreground">View and manage reservations for this item</p>
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

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Reservations ({reservations.length})
          </CardTitle>
          <CardDescription>
            All reservations for this item
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reservations found</h3>
              <p className="text-muted-foreground">This item has no reservations yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto relative">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-muted z-20 border-r min-w-[120px] shadow-sm">Party Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reserved Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium sticky left-0 bg-background z-20 border-r min-w-[120px] shadow-sm">{reservation.party_name}</TableCell>
                      <TableCell>{reservation.party_contact || "-"}</TableCell>
                      <TableCell className="font-medium">{reservation.reserved_quantity}</TableCell>
                      <TableCell>
                        <div>
                          {new Date(reservation.reserved_until).toLocaleDateString('en-US')}
                          {(() => {
                            const reservedDate = new Date(reservation.reserved_until)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            reservedDate.setHours(0, 0, 0, 0)
                            return reservedDate < today
                          })() && (
                            <p className="text-xs text-red-500">Expired</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(reservation.created_at).toLocaleDateString('en-US')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {reservation.user_name || "Unknown"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{reservation.notes || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReservationToDelete(reservation)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reservation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
