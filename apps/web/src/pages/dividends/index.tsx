import { useMemo, useState } from 'react'
import { MainLayout } from '@/components/layouts'
import { useAiPageContext } from '@/features/ai-assistant/ai-assistant-context'
import { buildDividendsPageContext } from '@/features/ai-assistant/adapters/dividends-context'
import { useDividendDashboard } from '@/features/dividends/api/dividends'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import { ImportDividendsDialog } from '@/features/dividends/components/import-dividends-dialog'
import { DividendsTable } from '@/features/dividends/components/dividends-table'
import { DividendDashboardView } from '@/features/dividends/components/dividend-dashboard'

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function DividendsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { data: dashboard } = useDividendDashboard(selectedYear)

  const aiPageContext = useMemo(
    () =>
      buildDividendsPageContext({
        activeTab,
        selectedYear,
        dashboard,
      }),
    [activeTab, dashboard, selectedYear],
  )

  useAiPageContext(aiPageContext)

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 pb-8 sm:px-6 lg:px-10">
        <header className="pb-5">
          <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Dividends
              </p>
              <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
                Dividend income
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Track and analyze your dividend income across all holdings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:pb-1">
              <ImportDividendsDialog />
            </div>
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gap-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-auto w-fit max-w-full justify-start gap-0.5 overflow-x-auto rounded-[11px] border border-border bg-muted p-1">
              <TabsTrigger
                value="overview"
                className="rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                All dividends
              </TabsTrigger>
            </TabsList>

            {activeTab === 'overview' ? (
              <div className="flex items-center gap-2 rounded-[14px] border border-border bg-card px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Year
                </span>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[110px]" size="sm">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        FY {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <TabsContent value="overview" className="mt-0">
            <DividendDashboardView year={selectedYear} />
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <DividendsTable />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
