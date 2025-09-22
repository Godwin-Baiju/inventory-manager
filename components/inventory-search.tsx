"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  remark?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  creator_name?: string
  updater_name?: string
}

interface InventorySearchProps {
  items: InventoryItem[]
  onFilteredItems: (filteredItems: InventoryItem[]) => void
  initialSearchQuery?: string
}

export function InventorySearch({ items, onFilteredItems, initialSearchQuery }: InventorySearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery || "")

  useEffect(() => {
    setSearchTerm(initialSearchQuery || "")
  }, [initialSearchQuery])

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (term.trim()) {
      params.set("search", term.trim())
    } else {
      params.delete("search")
    }
    
    // Reset to page 1 when searching
    params.delete("page")
    
    router.push(`/dashboard/inventory?${params.toString()}`)
  }

  const clearSearch = () => {
    setSearchTerm("")
    handleSearch("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(searchTerm)
    }
  }

  // Since we're doing server-side search, just pass through the items
  useEffect(() => {
    onFilteredItems(items)
  }, [items, onFilteredItems])

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search items by name, brand, size, or remark..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Button
        onClick={() => handleSearch(searchTerm)}
        variant="outline"
        size="sm"
        className="shrink-0"
      >
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </div>
  )
}
