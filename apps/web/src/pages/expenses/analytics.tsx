import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { MainLayout } from "@/components/layouts";
import {
  fetchSpendingSummary,
  fetchSpendingByCategory,
  fetchSpendingByMode,
  fetchTopMerchants,
  fetchDailySpending,
  fetchMonthlyTrend,
  fetchSpendingByCard,
} from "@/features/expenses/api/analytics";
import { useSyncJob } from "@/features/expenses/hooks/use-sync-job";

import type { AnalyticsPeriod, MilestoneProgress } from "@workspace/domain";

import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/ui/chart";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Receipt,
  RotateCw,
  Target,
  TrendingDown,
} from "lucide-react";

// ── Helpers ──

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" },
  { label: "90 days", value: "quarter" },
  { label: "1 year", value: "year" },
];

const CHART_TOKEN_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const getChartTokenColor = (index: number) =>
  CHART_TOKEN_COLORS[index % CHART_TOKEN_COLORS.length]!;

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

// ── Component ──

const AnalyticsPage = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const queryClient = useQueryClient();

  const { startReprocess, job, isSyncing } = useSyncJob({
    onComplete: () => {
      // Refresh all analytics queries after reprocess
      queryClient.invalidateQueries({ queryKey: ["expenses", "analytics"] });
    },
  });

  const summaryQ = useQuery({
    queryKey: ["expenses", "analytics", "summary", period],
    queryFn: () => fetchSpendingSummary(period),
  });

  const categoryQ = useQuery({
    queryKey: ["expenses", "analytics", "by-category", period],
    queryFn: () => fetchSpendingByCategory(period),
  });

  const modeQ = useQuery({
    queryKey: ["expenses", "analytics", "by-mode", period],
    queryFn: () => fetchSpendingByMode(period),
  });

  const merchantQ = useQuery({
    queryKey: ["expenses", "analytics", "top-merchants", period],
    queryFn: () => fetchTopMerchants(period),
  });

  const dailyQ = useQuery({
    queryKey: ["expenses", "analytics", "daily", period],
    queryFn: () => fetchDailySpending(period),
  });

  const trendQ = useQuery({
    queryKey: ["expenses", "analytics", "monthly-trend"],
    queryFn: () => fetchMonthlyTrend(12),
  });

  const cardQ = useQuery({
    queryKey: ["expenses", "analytics", "by-card", period],
    queryFn: () => fetchSpendingByCard(period),
  });

  const summary = summaryQ.data;

  const categoryChartData = (categoryQ.data ?? []).map((category, index) => ({
    ...category,
    chartColor: getChartTokenColor(index),
  }));

  const modeChartData = (modeQ.data ?? []).map((mode, index) => ({
    ...mode,
    chartColor: getChartTokenColor(index),
  }));

  const cardChartData = (cardQ.data ?? []).map((card, index) => ({
    ...card,
    chartColor: getChartTokenColor(index),
  }));

  // ── Chart configs ──

  const dailyChartConfig: ChartConfig = {
    debited: { label: "Spent", color: "var(--color-chart-1)" },
    credited: { label: "Received", color: "var(--color-chart-2)" },
  };

  const trendChartConfig: ChartConfig = {
    debited: { label: "Spent", color: "var(--color-chart-1)" },
    credited: { label: "Received", color: "var(--color-chart-2)" },
    net: { label: "Net", color: "var(--color-chart-3)" },
  };

  // Build category pie chart config
  const categoryChartConfig: ChartConfig = Object.fromEntries(
    categoryChartData.map((c) => [
      c.category,
      { label: c.displayName, color: c.chartColor },
    ]),
  );

  const modeChartConfig: ChartConfig = Object.fromEntries(
    modeChartData.map((m) => [
      m.mode,
      {
        label: m.mode.replace(/_/g, " "),
        color: m.chartColor,
      },
    ]),
  );

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col gap-6 px-6 py-10 mx-8">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Expenses
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Analytics
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Spending patterns, category breakdowns and trends.
            </p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={startReprocess}
                disabled={isSyncing}
              >
                <RotateCw className={isSyncing ? "animate-spin" : ""} />
                {isSyncing && job?.totalEmails
                  ? `Reprocessing (${job.processedEmails}/${job.totalEmails})`
                  : job?.status === "completed"
                    ? "Reprocessed ✓"
                    : "Reprocess Emails"}
              </Button>
            </div>
          </div>
        </header>

        {/* ── Summary cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Spent"
            value={summary ? fmtCurrency(summary.totalSpent) : undefined}
            icon={<ArrowDownRight className="size-4 text-red-500" />}
            subtitle={
              summary ? `${summary.transactionCount} transactions` : undefined
            }
            loading={summaryQ.isLoading}
          />
          <SummaryCard
            title="Total Received"
            value={summary ? fmtCurrency(summary.totalReceived) : undefined}
            icon={<ArrowUpRight className="size-4 text-emerald-500" />}
            subtitle={
              summary ? `Net flow: ${fmtCurrency(summary.netFlow)}` : undefined
            }
            loading={summaryQ.isLoading}
          />
          <SummaryCard
            title="Avg Transaction"
            value={summary ? fmtCurrency(summary.avgTransaction) : undefined}
            icon={<Receipt className="size-4 text-blue-500" />}
            subtitle={summary ? `Top: ${summary.topMerchant}` : undefined}
            loading={summaryQ.isLoading}
          />
          <SummaryCard
            title="Pending Review"
            value={summary ? String(summary.reviewPending) : undefined}
            icon={<TrendingDown className="size-4 text-amber-500" />}
            subtitle={
              summary
                ? `Top category: ${summary.topCategory.replace(/_/g, " ")}`
                : undefined
            }
            loading={summaryQ.isLoading}
          />
        </div>

        {/* ── Charts row 1: Daily spending + Category pie ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Daily spending bar chart — 2 cols */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Daily Spending</CardTitle>
              <CardDescription>Debits &amp; credits per day</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyQ.isLoading ? (
                <Skeleton className="h-75 w-full" />
              ) : dailyQ.data && dailyQ.data.length > 0 ? (
                <ChartContainer
                  config={dailyChartConfig}
                  className="h-75 w-full"
                >
                  <BarChart data={dailyQ.data}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => {
                        try {
                          return format(parseISO(v), "dd MMM");
                        } catch {
                          return v;
                        }
                      }}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={fmtCompact}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      fontSize={12}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => fmtCurrency(Number(value))}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="debited"
                      fill="var(--color-debited)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="credited"
                      fill="var(--color-credited)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No data for this period.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Category pie — 1 col */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Category</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryQ.isLoading ? (
                <Skeleton className="mx-auto size-55 rounded-full" />
              ) : categoryChartData.length > 0 ? (
                <ChartContainer
                  config={categoryChartConfig}
                  className="mx-auto aspect-square h-65"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => fmtCurrency(Number(value))}
                        />
                      }
                    />
                    <Pie
                      data={categoryChartData}
                      dataKey="amount"
                      nameKey="displayName"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {categoryChartData.map((entry) => (
                        <Cell key={entry.category} fill={entry.chartColor} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No spending data.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Charts row 2: Monthly trend + Payment modes ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Monthly trend line chart — 2 cols */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Monthly Trend</CardTitle>
              <CardDescription>Last 12 months overview</CardDescription>
            </CardHeader>
            <CardContent>
              {trendQ.isLoading ? (
                <Skeleton className="h-75 w-full" />
              ) : trendQ.data && trendQ.data.length > 0 ? (
                <ChartContainer
                  config={trendChartConfig}
                  className="h-75 w-full"
                >
                  <LineChart data={trendQ.data}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v: string) => {
                        try {
                          return format(parseISO(`${v}-01`), "MMM yy");
                        } catch {
                          return v;
                        }
                      }}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={fmtCompact}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      fontSize={12}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => fmtCurrency(Number(value))}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="debited"
                      stroke="var(--color-debited)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="credited"
                      stroke="var(--color-credited)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="var(--color-net)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No trend data yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment mode pie — 1 col */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Modes</CardTitle>
              <CardDescription>How you pay</CardDescription>
            </CardHeader>
            <CardContent>
              {modeQ.isLoading ? (
                <Skeleton className="mx-auto size-55 rounded-full" />
              ) : modeChartData.length > 0 ? (
                <ChartContainer
                  config={modeChartConfig}
                  className="mx-auto aspect-square h-65"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => fmtCurrency(Number(value))}
                        />
                      }
                    />
                    <Pie
                      data={modeChartData}
                      dataKey="amount"
                      nameKey="mode"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {modeChartData.map((entry) => (
                        <Cell key={entry.mode} fill={entry.chartColor} />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="mode" />}
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No mode data.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Spending by Card ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Spending by Card</CardTitle>
                <CardDescription>
                  Track spend across your credit cards
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cardQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cardChartData.length > 0 ? (
              <div className="space-y-4">
                {cardChartData.map((card) => {
                  const maxAmount = cardChartData[0]!.amount;
                  const pct =
                    maxAmount > 0 ? (card.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={card.cardLast4} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-3 rounded-full"
                            style={{ backgroundColor: card.chartColor }}
                          />
                          <span className="text-sm font-medium">
                            {card.cardName}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            ••{card.cardLast4}
                          </Badge>
                          {card.bank && (
                            <span className="text-xs text-muted-foreground">
                              {card.bank}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="tabular-nums">
                            {card.count} txns
                          </Badge>
                          <span className="min-w-25 text-right text-sm font-semibold tabular-nums">
                            {fmtCurrency(card.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: card.chartColor,
                          }}
                        />
                      </div>

                      {/* Milestone progress */}
                      {card.milestones && card.milestones.length > 0 && (
                        <MilestoneProgressSection
                          milestones={card.milestones}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No card spending data. Card details are extracted from credit
                card transaction emails.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Top Merchants ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Merchants</CardTitle>
            <CardDescription>Where you spend the most</CardDescription>
          </CardHeader>
          <CardContent>
            {merchantQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : merchantQ.data && merchantQ.data.length > 0 ? (
              <div className="space-y-3">
                {merchantQ.data.map((m, i) => {
                  const maxAmount = merchantQ.data![0]!.amount;
                  const pct = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={m.merchant} className="flex items-center gap-3">
                      <span className="w-5 text-xs text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{m.merchant}</span>
                          <span className="tabular-nums">
                            {fmtCurrency(m.amount)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <Badge variant="secondary" className="tabular-nums">
                        {m.count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No merchant data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Category table breakdown ── */}
        {categoryChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Breakdown</CardTitle>
              <CardDescription>Detailed spending per category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {categoryChartData.map((c) => (
                  <div
                    key={c.category}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: c.chartColor }}
                      />
                      <span className="text-sm font-medium capitalize">
                        {c.displayName}
                      </span>
                      {c.parent && (
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {c.parent}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="tabular-nums">
                        {c.count} txns
                      </Badge>
                      <span className="min-w-25 text-right text-sm font-semibold tabular-nums">
                        {fmtCurrency(c.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

// ── Subcomponents ──

function SummaryCard({
  title,
  value,
  icon,
  subtitle,
  loading,
}: {
  title: string;
  value?: string;
  icon: React.ReactNode;
  subtitle?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        )}
        {loading ? (
          <Skeleton className="mt-1 h-4 w-36" />
        ) : (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneProgressSection({
  milestones,
}: {
  milestones: MilestoneProgress[];
}) {
  const getMilestoneColor = (pct: number) => {
    if (pct >= 100) return "var(--color-chart-2)"; // green / success
    if (pct >= 50) return "var(--color-chart-4)"; // amber / in-progress
    return "var(--color-chart-5)"; // muted / low
  };

  return (
    <div className="mt-2 ml-5 space-y-2.5 border-l-2 border-muted pl-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Target className="size-3" />
        <span>Milestones</span>
      </div>

      {milestones.map((m) => {
        const color = getMilestoneColor(m.percentage);
        return (
          <div key={m.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground/80">
                  {m.description}
                </span>
                <Badge variant="outline" className="text-[9px] capitalize">
                  {m.type}
                </Badge>
              </div>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color }}
              >
                {m.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, m.percentage)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="min-w-20 text-right text-[10px] tabular-nums text-muted-foreground">
                {fmtCurrency(m.currentSpend)} / {fmtCurrency(m.targetAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{m.periodLabel}</span>
              {m.remaining > 0 ? (
                <span>{fmtCurrency(m.remaining)} remaining</span>
              ) : (
                <span
                  className="font-medium"
                  style={{ color: "var(--color-chart-2)" }}
                >
                  ✓ Milestone reached!
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AnalyticsPage;
