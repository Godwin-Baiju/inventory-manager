"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function addInventoryItem(formData: FormData) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  console.log("[v0] Adding inventory item for user:", user.id)

  const itemName = formData.get("item_name") as string
  const itemBrand = formData.get("item_brand") as string
  const size = formData.get("size") as string
  const stockQty = Number.parseInt(formData.get("stock_qty") as string)
  const remark = formData.get("remark") as string
  const lowStockWarning = Number.parseInt(formData.get("low_stock_warning") as string)

  console.log("[v0] Form data:", { itemName, itemBrand, size, stockQty, remark, lowStockWarning })

  // Validate required fields
  if (!itemName || !itemBrand || !size || isNaN(stockQty) || isNaN(lowStockWarning)) {
    return { error: "Please fill in all required fields" }
  }

  if (stockQty < 0) {
    return { error: "Stock quantity cannot be negative" }
  }

  if (lowStockWarning < 1) {
    return { error: "Low stock warning must be at least 1" }
  }

  try {
    // Insert the new inventory item
    const { data: newItem, error: insertError } = await supabase
      .from("inventory_items")
      .insert({
        item_name: itemName,
        item_brand: itemBrand,
        size: size,
        stock_qty: stockQty,
        remark: remark || null,
        low_stock_warning: lowStockWarning,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting inventory item:", insertError)
      return { error: "Failed to add inventory item" }
    }

    console.log("[v0] Successfully created item:", newItem)

    // If initial stock is greater than 0, create a stock transaction record
    if (stockQty > 0) {
      const { error: transactionError } = await supabase.from("stock_transactions").insert({
        item_id: newItem.id,
        transaction_type: "in",
        quantity: stockQty,
        previous_stock: 0,
        new_stock: stockQty,
        reason: "Initial stock",
        created_by: user.id,
      })

      if (transactionError) {
        console.error("[v0] Error creating initial stock transaction:", transactionError)
        // Don't return error here as the item was created successfully
      } else {
        console.log("[v0] Successfully created initial stock transaction")
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard/low-stock")
    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function getAllFilteredInventoryItems(search?: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  try {
    // Try to get data from the view with user information first using pagination
    let allInventoryItems: any[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from("inventory_items_with_users")
        .select("*, reserved_quantity")
        .order("created_at", { ascending: false })
        .range(offset, offset + batchSize - 1)

      // Apply search filter if provided
      if (search) {
        const searchTerm = search.toLowerCase()
        query = query.or(`item_name.ilike.%${searchTerm}%,item_brand.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%,remark.ilike.%${searchTerm}%`)
      }

      const { data: batchItems, error } = await query

      if (error) {
        console.log("[v0] Error fetching inventory items for print:", error)
        throw error
      }

      if (batchItems && batchItems.length > 0) {
        allInventoryItems = allInventoryItems.concat(batchItems)
        offset += batchSize
        hasMore = batchItems.length === batchSize
      } else {
        hasMore = false
      }
    }

    return { inventoryItems: allInventoryItems, error: null }
  } catch (viewError) {
    console.log("[v0] View not available, falling back to regular table")
    
    // Fallback to regular table if view doesn't exist using pagination
    let allInventoryItems: any[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from("inventory_items")
        .select("*, reserved_quantity")
        .order("created_at", { ascending: false })
        .range(offset, offset + batchSize - 1)

      // Apply search filter if provided
      if (search) {
        const searchTerm = search.toLowerCase()
        query = query.or(`item_name.ilike.%${searchTerm}%,item_brand.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%,remark.ilike.%${searchTerm}%`)
      }

      const { data: batchItems, error } = await query

      if (error) {
        console.log("[v0] Error fetching inventory items for print (fallback):", error)
        return { inventoryItems: [], error }
      }

      if (batchItems && batchItems.length > 0) {
        allInventoryItems = allInventoryItems.concat(batchItems)
        offset += batchSize
        hasMore = batchItems.length === batchSize
      } else {
        hasMore = false
      }
    }

    return { inventoryItems: allInventoryItems, error: null }
  }
}

export async function getAllFilteredTransactions(filters: {
  item?: string
  type?: string
  search?: string
}) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  try {
    // Try to get data from the view with user information first
    let query = supabase
      .from("stock_transactions_with_users")
      .select(
        `
        *,
        inventory_items (
          item_name,
          item_brand,
          size
        )
      `
      )
      .order("created_at", { ascending: false })

    // Apply filters
    if (filters.item && filters.item !== "all") {
      query = query.eq("item_id", filters.item)
    }
    if (filters.type && filters.type !== "all" && (filters.type === "in" || filters.type === "out")) {
      query = query.eq("transaction_type", filters.type)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.log("[v0] Error fetching transactions for print:", error)
      throw error
    }

    // Apply client-side search filter if provided
    let filteredTransactions = transactions || []
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredTransactions = filteredTransactions.filter((transaction) => {
        return (
          transaction.inventory_items.item_name.toLowerCase().includes(searchLower) ||
          transaction.inventory_items.item_brand.toLowerCase().includes(searchLower) ||
          transaction.reason?.toLowerCase().includes(searchLower)
        )
      })
    }

    return { transactions: filteredTransactions, error: null }
  } catch (viewError) {
    console.log("[v0] View not available, falling back to regular table")
    
    // Fallback to regular table if view doesn't exist
    let query = supabase
      .from("stock_transactions")
      .select(
        `
        *,
        inventory_items (
          item_name,
          item_brand,
          size
        )
      `
      )
      .order("created_at", { ascending: false })

    // Apply filters
    if (filters.item && filters.item !== "all") {
      query = query.eq("item_id", filters.item)
    }
    if (filters.type && filters.type !== "all" && (filters.type === "in" || filters.type === "out")) {
      query = query.eq("transaction_type", filters.type)
    }

    const { data: transactions, error: fallbackError } = await query

    if (fallbackError) {
      console.log("[v0] Error fetching transactions for print:", fallbackError)
      return { transactions: [], error: fallbackError }
    }

    // Apply client-side search filter if provided
    let filteredTransactions = transactions || []
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredTransactions = filteredTransactions.filter((transaction) => {
        return (
          transaction.inventory_items.item_name.toLowerCase().includes(searchLower) ||
          transaction.inventory_items.item_brand.toLowerCase().includes(searchLower) ||
          transaction.reason?.toLowerCase().includes(searchLower)
        )
      })
    }

    return { transactions: filteredTransactions, error: null }
  }
}

export async function updateStock(formData: FormData) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const itemId = formData.get("item_id") as string
  const transactionType = formData.get("transaction_type") as "in" | "out"
  const quantity = Number.parseInt(formData.get("quantity") as string)
  const reason = formData.get("reason") as string
  const reservationId = (formData.get("reservation_id") as string) || ""

  // Validate required fields
  if (!itemId || !transactionType || isNaN(quantity)) {
    return { error: "Please fill in all required fields" }
  }

  if (quantity <= 0) {
    return { error: "Quantity must be greater than 0" }
  }

  try {
    // Get current item details including reserved quantity
    const { data: currentItem, error: fetchError } = await supabase
      .from("inventory_items")
      .select("stock_qty, reserved_quantity")
      .eq("id", itemId)
      .single()

    if (fetchError || !currentItem) {
      return { error: "Item not found" }
    }

    const previousStock = currentItem.stock_qty
    let newStock: number

    if (transactionType === "in") {
      newStock = previousStock + quantity
    } else {
      // Stock out logic
      const availableForOut = previousStock - (currentItem.reserved_quantity || 0)
      
      // If a reservation is selected, allow stock out from reserved quantity
      if (reservationId) {
        // Validate that the reservation exists and belongs to this item
        const { data: reservation, error: reservationError } = await supabase
          .from("reservations")
          .select("id, reserved_quantity, item_id")
          .eq("id", reservationId)
          .eq("item_id", itemId)
          .eq("status", "active")
          .single()

        if (reservationError || !reservation) {
          return { error: "Invalid or inactive reservation selected." }
        }

        // Allow stock out of the reserved quantity
        newStock = previousStock - quantity
      } else {
        // No reservation selected - can only stock out from available unreserved stock
        if (availableForOut < quantity) {
          return { error: "Insufficient available stock. Reserved quantity must be respected." }
        }
        newStock = previousStock - quantity
      }
    }

    // Update the inventory item stock
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        stock_qty: newStock,
        updated_by: user.id,
      })
      .eq("id", itemId)

    if (updateError) {
      console.error("[v0] Error updating inventory item:", updateError)
      return { error: "Failed to update stock" }
    }

    // Create stock transaction record
    const { error: transactionError } = await supabase.from("stock_transactions").insert({
      item_id: itemId,
      transaction_type: transactionType,
      quantity: quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: reason || null,
      created_by: user.id,
    })

    if (transactionError) {
      console.error("[v0] Error creating stock transaction:", transactionError)
      return { error: "Stock updated but failed to record transaction" }
    }

    // If stock out and a reservation was selected, fully satisfy the reservation and decrement aggregate
    if (transactionType === "out" && reservationId) {
      // Fetch reservation
      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .select("id, item_id, reserved_quantity, status")
        .eq("id", reservationId)
        .eq("item_id", itemId)
        .single()

      if (!resError && reservation) {
        // Delete the reservation when stocking out from it
        const { error: delResErr } = await supabase
          .from("reservations")
          .delete()
          .eq("id", reservationId)

        if (delResErr) {
          console.error("[v0] Error deleting reservation after stock-out:", delResErr)
        }

        // Decrement the item's aggregate reserved_quantity safely
        const newReserved = Math.max(0, (currentItem.reserved_quantity || 0) - reservation.reserved_quantity)
        const { error: updItemReservedErr } = await supabase
          .from("inventory_items")
          .update({ reserved_quantity: newReserved })
          .eq("id", itemId)
        if (updItemReservedErr) {
          console.error("[v0] Error decrementing item's reserved quantity:", updItemReservedErr)
        }

        // Attempt to recompute via RPC if available (ignore failures)
        try {
          await supabase.rpc("recompute_reserved_quantity", { p_item_id: itemId })
        } catch {}
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard/low-stock")
    revalidatePath("/dashboard/reservations")
    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function deleteInventoryItem(itemId: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Removing user_profiles-based permission check; default deny deletion in UI
  // If you need server-side permission, implement RLS or role checks here.

  try {
    // Delete in order due to foreign key constraints
    // 1. Delete reservations first
    const { error: reservationsError } = await supabase.from("reservations").delete().eq("item_id", itemId)

    if (reservationsError) {
      console.error("[v0] Error deleting reservations:", reservationsError)
      return { error: "Failed to delete associated reservations" }
    }

    // 2. Delete stock transactions
    const { error: transactionsError } = await supabase.from("stock_transactions").delete().eq("item_id", itemId)

    if (transactionsError) {
      console.error("[v0] Error deleting transactions:", transactionsError)
      return { error: "Failed to delete transaction history" }
    }

    // 3. Finally delete the inventory item
    const { error: itemError } = await supabase.from("inventory_items").delete().eq("id", itemId)

    if (itemError) {
      console.error("[v0] Error deleting inventory item:", itemError)
      return { error: "Failed to delete inventory item" }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard/low-stock")
    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return { error: "An unexpected error occurred" }
  }
}
