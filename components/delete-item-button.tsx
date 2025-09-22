"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import { deleteInventoryItem } from "@/lib/actions/inventory"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface DeleteItemButtonProps {
  itemId: string
  itemName: string
  canDelete: boolean
}

export function DeleteItemButton({ itemId, itemName, canDelete }: DeleteItemButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  if (!canDelete) {
    return null
  }

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteInventoryItem(itemId)
      if (result.success) {
        toast({
          title: "Item deleted",
          description: `${itemName} has been permanently deleted.`,
        })
        setIsOpen(false)
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete item",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Item</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete <strong>{itemName}</strong> and all associated
            data including:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Stock transaction history</li>
              <li>Reservation records</li>
              <li>All related data</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>DELETE</strong> to confirm deletion:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={confirmText !== "DELETE" || isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
