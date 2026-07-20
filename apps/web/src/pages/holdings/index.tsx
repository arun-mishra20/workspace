import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { MainLayout } from '@/components/layouts'
import { useAiPageContext } from '@/features/ai-assistant/ai-assistant-context'
import { buildHoldingsPageContext } from '@/features/ai-assistant/adapters/holdings-context'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/ui/tabs'
import { Button } from '@workspace/ui/components/ui/button'
import {
  useHoldings,
  usePortfolioSummary,
} from '@/features/holdings/api/holdings'
import type { Holding } from '@workspace/domain'
import { PortfolioSummary } from '@/features/holdings/components/portfolio-summary'
import { HoldingsTable } from '@/features/holdings/components/holdings-table'
import { ImportGrowwDialog } from '@/features/holdings/components/import-groww-dialog'
import { HoldingFormDialog } from '@/features/holdings/components/holding-form-dialog'

const EMPTY_HOLDINGS: Holding[] = []

export default function HoldingsPage() {
  const { data: holdings = EMPTY_HOLDINGS, isLoading } = useHoldings()
  const { data: portfolioSummary } = usePortfolioSummary()
  const [addOpen, setAddOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('stocks')

  const stockCount = holdings.filter((h) => h.assetType === 'stock').length
  const mfCount = holdings.filter((h) => h.assetType === 'mutual_fund').length
  const goldCount = holdings.filter((h) => h.assetType === 'gold').length
  const pfCount = holdings.filter((h) => h.assetType === 'pf').length

  const aiPageContext = useMemo(
    () =>
      buildHoldingsPageContext({
        activeTab,
        holdings,
        portfolioSummary,
      }),
    [activeTab, holdings, portfolioSummary],
  )

  useAiPageContext(aiPageContext)

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 pb-8 sm:px-6 lg:px-10">
        <header className="pb-5">
          <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Holdings
              </p>
              <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
                Investment allocation
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Track your complete investment portfolio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:pb-1">
              <ImportGrowwDialog />
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add holding
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <PortfolioSummary />

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="gap-4"
          >
            <TabsList className="h-auto w-fit max-w-full justify-start gap-0.5 overflow-x-auto rounded-[11px] border border-border bg-muted p-1">
              <TabsTrigger
                value="stocks"
                className="rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Stocks
                {stockCount > 0 ? (
                  <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                    ({stockCount})
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="mutual_funds"
                className="rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Mutual funds
                {mfCount > 0 ? (
                  <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                    ({mfCount})
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="gold"
                className="rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Gold
                {goldCount > 0 ? (
                  <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                    ({goldCount})
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="pf"
                className="rounded-lg px-3.5 py-2 text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Provident fund
                {pfCount > 0 ? (
                  <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                    ({pfCount})
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stocks" className="mt-0">
              <HoldingsTable
                holdings={holdings}
                isLoading={isLoading}
                assetType="stock"
              />
            </TabsContent>

            <TabsContent value="mutual_funds" className="mt-0">
              <HoldingsTable
                holdings={holdings}
                isLoading={isLoading}
                assetType="mutual_fund"
              />
            </TabsContent>

            <TabsContent value="gold" className="mt-0">
              <HoldingsTable
                holdings={holdings}
                isLoading={isLoading}
                assetType="gold"
              />
            </TabsContent>

            <TabsContent value="pf" className="mt-0">
              <HoldingsTable
                holdings={holdings}
                isLoading={isLoading}
                assetType="pf"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <HoldingFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultAssetType={
          activeTab === 'mutual_funds'
            ? 'mutual_fund'
            : activeTab === 'gold'
              ? 'gold'
              : activeTab === 'pf'
                ? 'pf'
                : 'stock'
        }
      />
    </MainLayout>
  )
}
