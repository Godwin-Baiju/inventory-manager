"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface CreateReservationData {
  itemId: string
  partyName: string
  partyContact: string | null
  partyAddress: string | null
  reservedQuantity: number
  reservedUntil: string
  notes: string | null
  createdBy: string
}

export async function createReservation(data: CreateReservationData) {
  try {
    const supabase = await createClient()

    // Check if there's enough available stock
    const { data: item, error: itemError } = await supabase
      .from("inventory_items")
      .select("stock_qty, reserved_quantity")
      .eq("id", data.itemId)
      .single()

    if (itemError) {
      return { success: false, error: "Item not found" }
    }

    const availableQuantity = item.stock_qty - (item.reserved_quantity || 0)
    if (data.reservedQuantity > availableQuantity) {
      return { success: false, error: `Only ${availableQuantity} units available for reservation` }
    }

    // Create the reservation in reservations table
    const { data: inserted, error } = await supabase
      .from("reservations")
      .insert({
        item_id: data.itemId,
        party_name: data.partyName,
        party_contact: data.partyContact,
        party_address: data.partyAddress,
        reserved_quantity: data.reservedQuantity,
        reserved_until: data.reservedUntil,
        notes: data.notes,
        created_by: data.createdBy,
        status: "active",
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating reservation:", error)
      return { success: false, error: "Failed to create reservation" }
    }

    // Recompute aggregate reserved quantity on the item (if you add an RPC later)
    // await supabase.rpc("recompute_reserved_quantity", { p_item_id: data.itemId })

    revalidatePath("/dashboard/reservations")
    revalidatePath("/dashboard/inventory")
    return { success: true, id: inserted?.id }
  } catch (error) {
    console.error("Error creating reservation:", error)
    return { success: false, error: "Failed to create reservation" }
  }
}

export async function updateReservationStatus(reservationId: string, status: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("reservations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reservationId)

    if (error) {
      console.error("Error updating reservation:", error)
      return { success: false, error: "Failed to update reservation" }
    }

    revalidatePath("/dashboard/reservations")
    revalidatePath("/dashboard/inventory")
    return { success: true }
  } catch (error) {
    console.error("Error updating reservation:", error)
    return { success: false, error: "Failed to update reservation" }
  }
}

export async function deleteReservation(reservationId: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservationId)

    if (error) {
      console.error("Error deleting reservation:", error)
      return { success: false, error: "Failed to delete reservation" }
    }

    revalidatePath("/dashboard/reservations")
    revalidatePath("/dashboard/inventory")
    return { success: true }
  } catch (error) {
    console.error("Error deleting reservation:", error)
    return { success: false, error: "Failed to delete reservation" }
  }
}
