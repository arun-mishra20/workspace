import { Download, FileText, Image } from 'lucide-react'
import { Button } from '@workspace/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/ui/dropdown-menu'
import type { ProjectionResult } from '@workspace/domain'
import {
  exportElementAsPng,
  exportProjectionCsv,
  exportProjectionPdf,
  exportSummaryCsv,
} from '../lib/export'
import { toast } from 'sonner'

interface ExportMenuProps {
  result: ProjectionResult
  chartRef: React.RefObject<HTMLDivElement | null>
}

export function ExportMenu({ result, chartRef }: ExportMenuProps) {
  const handleCsv = () => {
    exportProjectionCsv(result)
    toast.success('CSV exported')
  }

  const handleSummaryCsv = () => {
    exportSummaryCsv(result.summary)
    toast.success('Summary CSV exported')
  }

  const handlePng = async () => {
    if (!chartRef.current) return
    await exportElementAsPng(chartRef.current)
    toast.success('Chart exported as PNG')
  }

  const handlePdf = async () => {
    await exportProjectionPdf(result.summary, chartRef.current)
    toast.success('PDF exported')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsv}>
          <FileText className="h-4 w-4 mr-2" />
          Export CSV (time series)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSummaryCsv}>
          <FileText className="h-4 w-4 mr-2" />
          Export CSV (summary)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handlePng()}>
          <Image className="h-4 w-4 mr-2" />
          Export PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handlePdf()}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
