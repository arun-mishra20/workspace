import { z } from "zod";

export const HoldingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string(),
  name: z.string(),
  assetType: z.enum(["stock", "mutual_fund", "gold", "etf", "pf"]),
  platform: z.string().nullable(),
  quantity: z.string(),
  avgBuyPrice: z.string(),
  currentPrice: z.string().nullable(),
  investedValue: z.string(),
  currentValue: z.string().nullable(),
  totalReturns: z.string().nullable(),
  returnsPercentage: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Holding = z.infer<typeof HoldingSchema>;

export const CreateHoldingSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetType: z.enum(["stock", "mutual_fund", "gold", "etf", "pf"]),
  platform: z.string().optional(),
  quantity: z.string().or(z.number()),
  avgBuyPrice: z.string().or(z.number()),
  currentPrice: z.string().or(z.number()).optional(),
});

export type CreateHolding = z.infer<typeof CreateHoldingSchema>;

export const PortfolioSummarySchema = z.object({
  totalInvestedValue: z.number(),
  totalCurrentValue: z.number(),
  totalReturns: z.number(),
  totalReturnsPercentage: z.number(),
  assetTypeBreakdown: z.array(
    z.object({
      assetType: z.string(),
      investedValue: z.number(),
      currentValue: z.number(),
      returns: z.number(),
      returnsPercentage: z.number(),
      count: z.number(),
    }),
  ),
  platformBreakdown: z.array(
    z.object({
      platform: z.string(),
      investedValue: z.number(),
      currentValue: z.number(),
      returns: z.number(),
      returnsPercentage: z.number(),
      count: z.number(),
    }),
  ),
});

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

// ── Groww Equity Holding (Stock) ────────────────────────────────────────
export const GrowwEquityHoldingSchema = z.object({
  trading_symbol: z.string(),
  quantity: z.number(),
  invested_value: z.string(),
  tradable_exchanges: z.array(z.string()).optional(),
  average_price: z.number(),
  isin: z.string().optional(),
  title: z.string(),
  current_value: z.string(),
  "p&l": z.string().optional(),
  "p&l_percent": z.string().optional(),
});
export type GrowwEquityHolding = z.infer<typeof GrowwEquityHoldingSchema>;

// ── Groww Mutual Fund Holding ──────────────────────────────────────────
export const GrowwMutualFundHoldingSchema = z.object({
  units: z.number(),
  amountInvested: z.string(),
  averageNav: z.number(),
  currentNav: z.number(),
  xirr: z.number().optional(),
  schemeName: z.string(),
  fundName: z.string().optional(),
  schemeType: z.string().optional(),
  return_1d: z
    .object({
      nav: z.number().optional(),
      percentage: z.number().optional(),
    })
    .optional(),
  planType: z.string().optional(),
  currentValue: z.string(),
  category: z.string().optional(),
});
export type GrowwMutualFundHolding = z.infer<
  typeof GrowwMutualFundHoldingSchema
>;

// ── Root Groww Export Envelope ──────────────────────────────────────────
export const GrowwImportDataSchema = z.object({
  result_timestamp: z.string().optional(),
  result: z.object({
    EQUITY: z
      .object({
        holdings: z.array(GrowwEquityHoldingSchema),
        total_invested_value: z.string().optional(),
        total_current_value: z.string().optional(),
        "total_p&l": z.string().optional(),
        "total_p&l_percent": z.string().optional(),
      })
      .optional(),
    MUTUAL_FUNDS: z
      .object({
        portfolio_details: z.object({
          investedAmount: z.string().optional(),
          currentValue: z.string().optional(),
          nav: z.number().optional(),
          oneDayReturnValue: z.number().optional(),
          xirr: z.number().optional(),
          sip_details: z
            .object({
              sipCount: z.number().optional(),
              sipAmount: z.number().optional(),
            })
            .passthrough()
            .optional(),
          holdings: z.array(GrowwMutualFundHoldingSchema),
        }),
        insights: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
  }),
});

export type GrowwImportData = z.infer<typeof GrowwImportDataSchema>;

// ── Normalised holding produced by the parser ──────────────────────────
export interface ParsedGrowwHolding {
  symbol: string;
  name: string;
  isin?: string;
  assetType: "stock" | "mutual_fund" | "gold" | "etf" | "pf";
  platform: "Groww";
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  totalReturns: number;
  returnsPercentage: number;
  exchanges?: string[];
  planType?: string;
  category?: string;
  xirr?: number;
  schemeType?: string;
}
