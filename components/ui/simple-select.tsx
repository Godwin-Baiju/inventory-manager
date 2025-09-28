"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SimpleSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  items: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  className?: string
  disabled?: boolean
  required?: boolean
}

export function SimpleSelect({
  value,
  onValueChange,
  placeholder = "Select item...",
  items,
  className,
  disabled = false,
  required = false,
}: SimpleSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedItem = items.find((item) => item.value === value)

  const handleSelect = (itemValue: string) => {
    console.log("SimpleSelect handleSelect called with:", itemValue)
    const newValue = itemValue === value ? "" : itemValue
    console.log("SimpleSelect calling onValueChange with:", newValue)
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedItem && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedItem ? selectedItem.label : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-60 overflow-auto">
          {items.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No items found.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.value}
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  value === item.value && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  if (!item.disabled) {
                    console.log("SimpleSelect item clicked:", item.value)
                    handleSelect(item.value)
                  }
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {item.label}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
