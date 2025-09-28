"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { History, TrendingUp, TrendingDown, Search, Filter, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react"
import { getAllFilteredTransactions } from "@/lib/actions/inventory"
import jsPDF from "jspdf"

interface Transaction {
  id: string
  transaction_type: "in" | "out"
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string | null
  created_at: string
  created_by: string
  user_name?: string
  inventory_items: {
    item_name: string
    item_brand: string
    size: string
  }
}

interface InventoryItem {
  id: string
  item_name: string
  item_brand: string
  size: string
}

interface HistoryTableProps {
  transactions: Transaction[]
  inventoryItems: InventoryItem[]
  currentPage: number
  totalPages: number
  totalCount: number
  filters: {
    type?: string
  }
  isLoading?: boolean
}

export function HistoryTable({
  transactions,
  inventoryItems,
  currentPage,
  totalPages,
  totalCount,
  filters,
  isLoading = false,
}: HistoryTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [localCurrentPage, setLocalCurrentPage] = useState(1)
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true)
    try {
      // Fetch all filtered transactions for PDF
      const { transactions: allFilteredTransactions, error } = await getAllFilteredTransactions({
        type: filters.type && filters.type !== 'all' ? filters.type : undefined,
        search: searchTerm
      })

      if (error) {
        console.error("Error fetching transactions for PDF:", error)
        return
      }

      const currentDate = new Date().toLocaleDateString('en-US')
      const currentTime = new Date().toLocaleTimeString()
      
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
      addText('TRANSACTION HISTORY', 20, true, '#1f2937')
      addText(`Generated on ${currentDate} at ${currentTime}`, 10, false, '#374151')
      addText(`Total Transactions: ${totalCount}`, 10, false, '#374151')
      if (allFilteredTransactions.length !== totalCount) {
        addText(`Filtered Results: ${allFilteredTransactions.length}`, 10, false, '#374151')
      }
      
      yPosition += 10
      
      // Filters section
      if ((filters.type && filters.type !== 'all') || searchTerm) {
        addText('Applied Filters:', 12, true, '#1f2937')
        if (filters.type && filters.type !== 'all') {
          addText(`Type: ${filters.type === 'in' ? 'Stock In' : 'Stock Out'}`, 10, false, '#374151')
        }
        if (searchTerm) {
          addText(`Search: "${searchTerm}"`, 10, false, '#374151')
        }
        yPosition += 5
      }
      
      addLine()
      
      // Table headers with better spacing for landscape
      const headers = ['Date & Time', 'Item', 'Type', 'Quantity', 'Stock Change', 'User', 'Reason']
      const columnWidths = [35, 60, 20, 20, 25, 50, 40] // in mm - adjusted for landscape
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
      
      for (let rowIndex = 0; rowIndex < allFilteredTransactions.length; rowIndex++) {
        const transaction = allFilteredTransactions[rowIndex]
        
        if (yPosition > pageHeight - margin - 20) {
          pdf.addPage()
          yPosition = margin
        }
        
                  const { date, time } = formatDateTime(transaction.created_at)
        
        const rowData = [
          `${date}\n${time}`,
          `${transaction.inventory_items.item_name}\n${transaction.inventory_items.item_brand} • ${transaction.inventory_items.size}`,
          `Stock ${transaction.transaction_type === 'in' ? 'In' : 'Out'}`,
          `${transaction.transaction_type === 'in' ? '+' : '-'}${transaction.quantity}`,
          `${transaction.previous_stock} to ${transaction.new_stock}`,
          transaction.user_name || 'Unknown',
          transaction.reason || '-'
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
          
          // Color coding for transaction types (using website colors)
          let cellColor = '#374151' // default foreground color
          if (i === 2) { // Type column
            cellColor = transaction.transaction_type === 'in' ? '#16a34a' : '#dc2626' // green for in, red for out
          } else if (i === 3) { // Quantity column
            cellColor = transaction.transaction_type === 'in' ? '#16a34a' : '#dc2626' // green for in, red for out
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
      addText(`Showing all ${allFilteredTransactions.length} filtered transactions`, 8, false, '#374151')
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `transaction-history-${timestamp}.pdf`
      
      pdf.save(filename)
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  const updateFilters = (newFilters: Record<string, string | undefined>) => {
    setIsFilterLoading(true)
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    // Reset to page 1 when filters change
    params.delete("page")

    router.push(`/dashboard/history?${params.toString()}`)
  }

  const goToPage = (page: number) => {
    setLocalCurrentPage(page)
  }


  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      transaction.inventory_items.item_name.toLowerCase().includes(searchLower) ||
      transaction.inventory_items.item_brand.toLowerCase().includes(searchLower) ||
      transaction.reason?.toLowerCase().includes(searchLower)
    )
  })

  // Reset to page 1 when search term or server-side filters change
  useEffect(() => {
    setLocalCurrentPage(1)
  }, [searchTerm, filters.item, filters.type])

  // Reset filter loading state when transactions change
  useEffect(() => {
    setIsFilterLoading(false)
  }, [transactions])

  // Calculate pagination based on filtered results
  const itemsPerPage = 20
  const filteredTotalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (localCurrentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US'),
      time: date.toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit", hour12: true }),
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters & Search
          </CardTitle>
          <CardDescription>Filter transactions by item, type, or search by keywords</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-9">
            <div className="space-y-2 md:col-span-6">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items or reasons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-3">
              <label className="text-sm font-medium">Transaction Type</label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) => updateFilters({ type: value || undefined })}
                disabled={isFilterLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <History className="mr-2 h-5 w-5" />
              Transaction History
            </div>
            <div className="flex items-center gap-4">
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
            </div>
          </CardTitle>
          <CardDescription>Complete record of all inventory movements</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || isFilterLoading ? (
            <div className="text-center py-16">
              <Loader2 className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Loading transactions...</h3>
              <p className="text-muted-foreground">Please wait while we fetch your transaction history</p>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="text-center py-16">
              <History className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filters.item || filters.type
                  ? "Try adjusting your filters or search terms"
                  : "Start by adding items and updating stock to see transaction history"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Stock Change</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((transaction) => {
                      const { date, time } = formatDateTime(transaction.created_at)
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{date}</div>
                              <div className="text-sm text-muted-foreground">{time}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{transaction.inventory_items.item_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.inventory_items.item_brand} • {transaction.inventory_items.size}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={transaction.transaction_type === "in" ? "default" : "secondary"}
                              className="flex items-center w-fit"
                            >
                              {transaction.transaction_type === "in" ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              Stock {transaction.transaction_type === "in" ? "In" : "Out"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-medium ${
                                transaction.transaction_type === "in" ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {transaction.transaction_type === "in" ? "+" : "-"}
                              {transaction.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-muted-foreground">{transaction.previous_stock}</span>
                              <span className="mx-2">→</span>
                              <span className="font-medium">{transaction.new_stock}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{transaction.user_name || "Unknown"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground max-w-xs truncate">
                              {transaction.reason || "-"}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {filteredTotalPages > 1 && (
                <div className="flex items-center justify-between pt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {localCurrentPage} of {filteredTotalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(localCurrentPage - 1)}
                      disabled={localCurrentPage <= 1}
                      className="bg-transparent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(localCurrentPage + 1)}
                      disabled={localCurrentPage >= filteredTotalPages}
                      className="bg-transparent"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
