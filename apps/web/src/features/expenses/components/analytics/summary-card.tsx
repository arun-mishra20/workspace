import type { MetricTrendPoint } from '@/lib/metric-trends'
import { MetricTrendCard } from '@/components/metric-trend-card'

export function SummaryCard({
  title,
  value,
  icon,
  subtitle,
  footer,
  loading,
  trendData,
  formatTrendValue,
}: {
  title: string
  value?: string
  icon: React.ReactNode
  subtitle?: string
  footer?: React.ReactNode
  loading: boolean
  trendData?: MetricTrendPoint[]
  formatTrendValue?: (value: number) => string
}) {
  return (
    <MetricTrendCard
      title={title}
      value={value}
      icon={icon}
      description={subtitle}
      descriptionClassName="mt-1 truncate text-xs text-muted-foreground"
      footer={footer}
      loading={loading}
      trendData={trendData}
      formatTrendValue={formatTrendValue}
      valueClassName="text-2xl font-bold tabular-nums"
    />
  )
}
