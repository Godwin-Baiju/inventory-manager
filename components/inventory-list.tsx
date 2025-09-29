"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, History, Download, FileDown, ChevronLeft, ChevronRight, Calendar, CalendarPlus, PackageSearch, Loader2 } from "lucide-react"
import Link from "next/link"
import { DeleteItemButton } from "@/components/delete-item-button"
import { InventorySearch } from "@/components/inventory-search"
import { StockUpdateDialog } from "@/components/stock-update-dialog"
import { getAllFilteredInventoryItems } from "@/lib/actions/inventory"
import jsPDF from "jspdf"

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
  stock_qty: number
  reserved_quantity?: number
  remark?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  creator_name?: string
  updater_name?: string
}

interface InventoryListProps {
  items: InventoryItem[]
  currentPage: number
  totalPages: number
  totalCount: number
  searchQuery?: string
}

export function InventoryList({ 
  items, 
  currentPage, 
  totalPages, 
  totalCount, 
  searchQuery 
}: InventoryListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filteredItems, setFilteredItems] = useState(items)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchQuery || "")
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false)

  useEffect(() => {
    setFilteredItems(items)
  }, [items])

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page > 1) {
      params.set("page", page.toString())
    } else {
      params.delete("page")
    }
    router.push(`/dashboard/inventory?${params.toString()}`)
  }

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true)
    try {
      console.log("Button clicked - starting PDF generation...")
      
      // Fetch all filtered inventory items for PDF
      const { inventoryItems: allFilteredItems, error } = await getAllFilteredInventoryItems(searchQuery)

      if (error) {
        console.error("Error fetching inventory items for PDF:", error)
        alert("Error fetching data for PDF generation")
        return
      }

      console.log("Fetched items:", allFilteredItems.length)

      const currentDate = new Date().toLocaleDateString('en-US')
      const currentTime = new Date().toLocaleTimeString('en-US')
      
      // Create PDF with selectable text in landscape
      const pdf = new jsPDF('l', 'mm', 'a4')
      const pageWidth = 297
      const pageHeight = 210
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)
      let yPosition = margin
      
      // Helper function to add text with word wrapping and middle-left alignment
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: string = '#374151') => {
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
        pdf.setTextColor(color)
        
        const lines = pdf.splitTextToSize(text, contentWidth)
        for (const line of lines) {
          if (yPosition > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }
          // Middle-left alignment: text starts at margin, vertically centered
          pdf.text(line, margin, yPosition, { align: 'left', baseline: 'middle' })
          yPosition += fontSize * 0.5
        }
        yPosition += 2
      }

      // Helper function to add text in a cell with proper wrapping and centering
      const addCellText = (text: string, x: number, y: number, width: number, height: number, fontSize: number = 8, color: string = '#374151') => {
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(color)
        
        // Split text to fit within cell width
        const lines = pdf.splitTextToSize(text, width - 4) // 4mm padding (2mm each side)
        
        // Calculate starting Y position to center text vertically
        const lineHeight = fontSize * 0.5
        const totalTextHeight = lines.length * lineHeight
        const startY = y + height / 2 - totalTextHeight / 2 + lineHeight / 2
        
        // Add each line
        for (let i = 0; i < lines.length; i++) {
          const lineY = startY + (i * lineHeight)
          if (lineY <= y + height - 1) { // Make sure text fits in cell
            pdf.text(lines[i], x + 2, lineY, { align: 'left', baseline: 'middle' })
          }
        }
      }
      
      // Helper function to add a line
      const addLine = () => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
        }
        pdf.line(margin, yPosition, pageWidth - margin, yPosition)
        yPosition += 5
      }
      
      // Header
      addText('INVENTORY LIST', 20, true, '#1f2937')
      addText(`Generated on ${currentDate} at ${currentTime}`, 10, false, '#374151')
      addText(`Total Items: ${totalCount}`, 10, false, '#374151')
      if (allFilteredItems.length !== totalCount) {
        addText(`Filtered Results: ${allFilteredItems.length}`, 10, false, '#374151')
      }
      
      yPosition += 10
      
      // Filters section
      if (searchQuery) {
        addText('Applied Filters:', 12, true, '#1f2937')
        addText(`Search: "${searchQuery}"`, 10, false, '#374151')
        yPosition += 5
      }
      
      addLine()
      
      // Table headers with better spacing for landscape
      const headers = ['Item Name', 'Brand', 'Size', 'Total Stock', 'Reserved', 'Available', 'Remark', 'Last Updated', 'Updated By']
      const columnWidths = [45, 30, 20, 20, 18, 18, 30, 25, 25] // in mm - adjusted for landscape
      let xPosition = margin
      
      // Add table headers with borders
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor('#1f2937')
      
      // Draw header background (muted color from website)
      pdf.setFillColor(248, 250, 252) // #f8fafc - card background
      pdf.rect(margin, yPosition - 3, contentWidth, 12, 'F')
      
      // Draw header borders (including left border)
      pdf.setDrawColor(209, 213, 219) // #d1d5db - border color from website
      pdf.line(margin, yPosition - 3, margin, yPosition + 9) // left border
      pdf.line(pageWidth - margin, yPosition - 3, pageWidth - margin, yPosition + 9) // right border
      pdf.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3) // top border
      pdf.line(margin, yPosition + 9, pageWidth - margin, yPosition + 9) // bottom border
      
      for (let i = 0; i < headers.length; i++) {
        if (xPosition + columnWidths[i] > pageWidth - margin) {
          xPosition = margin
          yPosition += 8
          if (yPosition > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }
        }
        // Use new cell text function for proper centering
        addCellText(headers[i], xPosition, yPosition - 3, columnWidths[i], 12, 9, '#1f2937')
        xPosition += columnWidths[i]
      }
      yPosition += 12
      
      // Add table rows with consistent styling
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      
      for (let rowIndex = 0; rowIndex < allFilteredItems.length; rowIndex++) {
        const item = allFilteredItems[rowIndex]
        
        if (yPosition > pageHeight - margin - 20) {
          pdf.addPage()
          yPosition = margin
        }
        
        const reserved = item.reserved_quantity || 0
        const available = item.stock_qty - reserved
        
        const rowData = [
          item.item_name,
          item.item_brand,
          item.size,
          item.stock_qty.toString(),
          reserved.toString(),
          available.toString(),
          item.remark || '-',
          new Date(item.updated_at).toLocaleDateString('en-US'),
          item.updater_name || 'Unknown'
        ]
        
        // Alternate row background colors (like the header design)
        const isEvenRow = rowIndex % 2 === 0
        const rowBgColor = isEvenRow ? [255, 255, 255] : [248, 250, 252] // White or light gray
        
        // Draw row background
        pdf.setFillColor(rowBgColor[0], rowBgColor[1], rowBgColor[2])
        pdf.rect(margin, yPosition - 3, contentWidth, 12, 'F')
        
        // Draw row borders (including left border)
        pdf.setDrawColor(209, 213, 219) // #d1d5db - border color from website
        pdf.line(margin, yPosition - 3, margin, yPosition + 9) // left border
        pdf.line(pageWidth - margin, yPosition - 3, pageWidth - margin, yPosition + 9) // right border
        pdf.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3) // top border
        pdf.line(margin, yPosition + 9, pageWidth - margin, yPosition + 9) // bottom border
        
        xPosition = margin
        for (let i = 0; i < rowData.length; i++) {
          if (xPosition + columnWidths[i] > pageWidth - margin) {
            xPosition = margin
            yPosition += 8
            if (yPosition > pageHeight - margin) {
              pdf.addPage()
              yPosition = margin
            }
          }
          
          // Color coding for stock levels (using website colors)
          let cellColor = '#374151' // default foreground color
          if (i === 3 && item.stock_qty <= 10) { // Total Stock column
            cellColor = '#dc2626' // destructive color
          } else if (i === 5 && available <= 10) { // Available column
            cellColor = available === 0 ? '#dc2626' : '#f59e0b' // destructive or warning
          }
          
          // Draw vertical line between columns
          if (i > 0) {
            pdf.line(xPosition, yPosition - 3, xPosition, yPosition + 9)
          }
          
          // Use new cell text function for proper wrapping and centering
          addCellText(rowData[i], xPosition, yPosition - 3, columnWidths[i], 12, 8, cellColor)
          xPosition += columnWidths[i]
        }
        
        yPosition += 12
      }
      
      // Footer
      yPosition += 20
      if (yPosition > pageHeight - margin) {
        pdf.addPage()
        yPosition = margin
      }
      
      addText('This report was generated from the Inventory Management System', 8, false, '#374151')
      addText(`Showing all ${allFilteredItems.length} filtered items`, 8, false, '#374151')
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `inventory-list-${timestamp}.pdf`
      
      console.log("Saving PDF:", filename)
      pdf.save(filename)
      console.log("PDF saved successfully")
      
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error generating PDF: " + error.message)
    } finally {
      setIsDownloadingPDF(false)
    }
  }


  const getUserDisplayName = (userName?: string) => {
    return userName || "Unknown"
  }

  // Show "no items found" message when there are no items to display
  if (filteredItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <PackageSearch className="mr-2 h-5 w-5" />
                  Inventory Items
                </CardTitle>
                <CardDescription>
                  {searchQuery || localSearchTerm ? "No items found matching your search criteria" : "No inventory items available"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InventorySearch 
            items={items} 
            onFilteredItems={setFilteredItems} 
            initialSearchQuery={searchQuery}
            onSearchChange={setLocalSearchTerm}
          />
          <div className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground text-center mb-6">
                {searchQuery || localSearchTerm 
                  ? "No inventory items match your search criteria. Try adjusting your search terms."
                  : "No inventory items are currently available."
                }
              </p>
              {(searchQuery || localSearchTerm) && (
                <Button variant="outline" onClick={() => {
                  setLocalSearchTerm("")
                  setFilteredItems(items)
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete("search")
                  router.push(`/dashboard/inventory?${params.toString()}`)
                }}>
                  Clear Search
            </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Items ({totalCount})</CardTitle>
              <CardDescription>
                {totalPages > 1 
                  ? `Page ${currentPage} of ${totalPages} • Showing ${items.length} of ${totalCount} items`
                  : `Complete list of your inventory items (${totalCount} total)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloadingPDF}>
                {isDownloadingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                setIsDownloadingCSV(true)
                try {
                  const { inventoryItems: allFilteredItems, error } = await getAllFilteredInventoryItems(searchQuery)
                  if (error) {
                    console.error("Error fetching inventory items for CSV:", error)
                    alert("Error fetching data for CSV generation")
                    return
                  }
                  const headers = [
                    'Item Name','Brand','Size','Total Stock','Reserved','Available','Remark','Last Updated','Updated By'
                  ]
                  const rows = allFilteredItems.map((item) => {
                    const reserved = item.reserved_quantity || 0
                    const available = item.stock_qty - reserved
                    return [
                      item.item_name,
                      item.item_brand,
                      item.size,
                      String(item.stock_qty),
                      String(reserved),
                      String(available),
                      item.remark ? item.remark.replace(/\n/g, ' ') : '-',
                      new Date(item.updated_at).toLocaleDateString('en-US'),
                      item.updater_name || 'Unknown'
                    ]
                  })
                  const csv = [headers, ...rows]
                    .map((row) => row.map((cell) => {
                      const needsQuotes = /[",\n]/.test(cell)
                      const escaped = cell.replace(/"/g, '""')
                      return needsQuotes ? `"${escaped}"` : escaped
                    }).join(","))
                    .join("\n")
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
                  link.download = `inventory-list-${timestamp}.csv`
                  link.click()
                  URL.revokeObjectURL(url)
                } catch (err: any) {
                  console.error('Error generating CSV:', err)
                  alert('Error generating CSV')
                } finally {
                  setIsDownloadingCSV(false)
                }
              }} disabled={isDownloadingCSV}>
                {isDownloadingCSV ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating CSV...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download CSV
                  </>
                )}
              </Button>
            </div>
          </div>
          <InventorySearch 
            items={items} 
            onFilteredItems={setFilteredItems} 
            initialSearchQuery={searchQuery}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted z-20 border-r min-w-[120px] shadow-sm">Item Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Total Stock</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const reserved = item.reserved_quantity || 0
                const available = item.stock_qty - reserved
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-20 border-r min-w-[120px] shadow-sm">{item.item_name}</TableCell>
                    <TableCell>{item.item_brand}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {item.stock_qty === 0 && <AlertTriangle className="h-4 w-4 text-destructive mr-1" />}
                        <span className={item.stock_qty <= 10 ? "text-destructive font-medium" : ""}>
                          {item.stock_qty}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={reserved > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                        {reserved}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={available <= 10 && available > 0 ? "text-yellow-600 font-medium" : available === 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                        {available}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.remark || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.updated_at).toLocaleDateString('en-US')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getUserDisplayName(item.updater_name)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StockUpdateDialog item={item} onUpdate={() => window.location.reload()} />
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/inventory/${item.id}/history`}>
                            <History className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/inventory/${item.id}/reservations`}>
                            <Calendar className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/inventory/${item.id}/create-reservation`}>
                            <CalendarPlus className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteItemButton
                          itemId={item.id}
                          itemName={item.item_name}
                          canDelete={true}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {filteredItems.length === 0 && items.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No items match your search criteria.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="bg-transparent"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
