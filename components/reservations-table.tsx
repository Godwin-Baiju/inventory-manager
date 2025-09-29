"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Search, Filter, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { deleteReservation } from "@/lib/actions/reservations"
import { useToast } from "@/hooks/use-toast"

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
  inventory_items: {
    item_name: string
    item_brand: string
    size: string
    stock_qty: number
  }
  created_by: string
  user_name?: string
}

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
}

interface ReservationsTableProps {
  reservations: Reservation[]
  inventoryItems: InventoryItem[]
  currentPage: number
  totalPages: number
  totalCount: number
  filters: {
    status?: string
  }
}

export function ReservationsTable({
  reservations,
  inventoryItems,
  currentPage,
  totalPages,
  totalCount,
  filters,
}: ReservationsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const updateFilters = (newFilters: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    params.delete("page") // Reset to first page when filtering
    router.push(`/dashboard/reservations?${params.toString()}`)
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/dashboard/reservations?${params.toString()}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "fulfilled":
        return <Badge variant="secondary">Fulfilled</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }


  const handleDeleteClick = (reservationId: string) => {
    setReservationToDelete(reservationId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reservationToDelete) return
    
    setIsLoading(true)
    try {
      const result = await deleteReservation(reservationToDelete)
      if (result.success) {
        toast({
          title: "Success",
          description: "Reservation deleted successfully",
        })
        setDeleteDialogOpen(false)
        setReservationToDelete(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete reservation",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reservation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredReservations = reservations.filter(
    (reservation) =>
      reservation.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.inventory_items.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.inventory_items.item_brand.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter reservations by item, status, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by party name or item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => updateFilters({ status: value || undefined })}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredReservations.length} of {totalCount} reservations
        </p>
      </div>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto relative">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-muted z-20 border-r min-w-[150px] shadow-sm">Party Details</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Reserved Qty</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Reserved Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No reservations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="sticky left-0 bg-background z-20 border-r min-w-[150px] shadow-sm">
                        <div>
                          <p className="font-medium">{reservation.party_name}</p>
                          {reservation.party_contact && (
                            <p className="text-sm text-muted-foreground">{reservation.party_contact}</p>
                          )}
                          {reservation.party_address && (
                            <p className="text-xs text-muted-foreground">{reservation.party_address}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reservation.inventory_items.item_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {reservation.inventory_items.item_brand} - {reservation.inventory_items.size}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{reservation.reserved_quantity}</TableCell>
                      <TableCell>
                        {reservation.created_at 
                          ? new Date(reservation.created_at).toLocaleDateString('en-US')
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <div>
                          {reservation.reserved_until 
                            ? new Date(reservation.reserved_until).toLocaleDateString('en-US')
                            : 'N/A'
                          }
                          {reservation.reserved_until && (() => {
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
                        <TableCell>{reservation.user_name || "Unknown"}</TableCell>
                      <TableCell>
                        {reservation.notes && (
                          <p className="text-sm text-muted-foreground max-w-[200px] truncate">{reservation.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(reservation.id)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
