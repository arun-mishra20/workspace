import type { ProjectionResult, SummaryMetrics } from '@workspace/domain'
import { fmtCompact, fmtCurrency, fmtMultiplier, fmtPercent } from '../lib/format-utils'

export function exportProjectionCsv(result: ProjectionResult): void {
  const headers = ['Month', 'Label', 'Total Value', 'Invested', 'Gains', 'Real Value']
  const rows = result.snapshots.map((s) => [
    s.month,
    s.label,
    s.totalValue.toFixed(2),
    s.totalInvested.toFixed(2),
    s.totalGains.toFixed(2),
    s.realValue.toFixed(2),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  downloadBlob(csv, 'projection.csv', 'text/csv')
}

export function exportSummaryCsv(summary: SummaryMetrics): void {
  const rows = [
    ['Metric', 'Value'],
    ['Total Invested', summary.totalInvested.toFixed(2)],
    ['Estimated Returns', summary.estimatedReturns.toFixed(2)],
    ['Final Corpus', summary.finalCorpus.toFixed(2)],
    ['Real Final Corpus', summary.realFinalCorpus.toFixed(2)],
    ['CAGR', summary.cagr.toFixed(2)],
    ['Wealth Multiplier', summary.wealthMultiplier.toFixed(2)],
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  downloadBlob(csv, 'projection-summary.csv', 'text/csv')
}

export async function exportElementAsPng(
  element: HTMLElement,
  filename = 'projection-chart.png',
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue(
      '--background',
    ) || '#ffffff',
    scale: 2,
  })
  canvas.toBlob((blob) => {
    if (!blob) return
    downloadBlob(blob, filename, 'image/png')
  })
}

export async function exportProjectionPdf(
  summary: SummaryMetrics,
  chartElement?: HTMLElement | null,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('Investment Projection Report', 14, 20)

  doc.setFontSize(11)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 30)

  const lines = [
    `Total Invested: ${fmtCurrency(summary.totalInvested)}`,
    `Estimated Returns: ${fmtCurrency(summary.estimatedReturns)}`,
    `Final Corpus: ${fmtCurrency(summary.finalCorpus)}`,
    `Real Value: ${fmtCurrency(summary.realFinalCorpus)}`,
    `CAGR: ${fmtPercent(summary.cagr)}`,
    `Wealth Multiplier: ${fmtMultiplier(summary.wealthMultiplier)}`,
  ]

  let y = 42
  for (const line of lines) {
    doc.text(line, 14, y)
    y += 8
  }

  if (chartElement) {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(chartElement, { scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    doc.addImage(imgData, 'PNG', 14, y + 4, 180, 80)
  }

  doc.save('investment-projection.pdf')
}

function downloadBlob(
  content: string | Blob,
  filename: string,
  mimeType: string,
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function formatExportFilename(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}-${date}`
}

export { fmtCompact }
