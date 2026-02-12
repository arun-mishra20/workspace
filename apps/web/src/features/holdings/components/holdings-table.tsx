import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/ui/alert-dialog";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { useDeleteHolding } from "@/features/holdings/api/holdings";
import { formatCurrency } from "@/lib/utils";
import type { Holding } from "@workspace/domain";
import { toast } from "sonner";
import { HoldingFormDialog } from "./holding-form-dialog";

type SortKey =
  | "name"
  | "symbol"
  | "quantity"
  | "avgBuyPrice"
  | "currentPrice"
  | "investedValue"
  | "currentValue"
  | "totalReturns"
  | "returnsPercentage";

type SortDir = "asc" | "desc";

function numVal(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0;
}

function compareFn(a: Holding, b: Holding, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  if (key === "name" || key === "symbol") {
    cmp = (a[key] ?? "").localeCompare(b[key] ?? "");
  } else {
    cmp = numVal(a[key]) - numVal(b[key]);
  }
  return dir === "asc" ? cmp : -cmp;
}

type AssetType = "stock" | "mutual_fund" | "gold" | "etf" | "pf";

const assetTypeLabels: Record<AssetType, string> = {
  stock: "stocks",
  mutual_fund: "mutual funds",
  gold: "gold holdings",
  etf: "ETFs",
  pf: "provident fund entries",
};

interface HoldingsTableProps {
  holdings: Holding[];
  isLoading?: boolean;
  assetType: AssetType;
}

export function HoldingsTable({
  holdings,
  isLoading,
  assetType,
}: HoldingsTableProps) {
  const [editHolding, setEditHolding] = useState<Holding | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("investedValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const deleteMutation = useDeleteHolding();

  const filtered = holdings.filter((h) => h.assetType === assetType);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareFn(a, b, sortKey, sortDir)),
    [filtered, sortKey, sortDir],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "symbol" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Holding deleted");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Failed to delete holding");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          No {assetTypeLabels[assetType]} in your portfolio yet.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Import from Groww or add manually using the buttons above.
        </p>
      </div>
    );
  }

  const isMF = assetType === "mutual_fund";
  const isGold = assetType === "gold";
  const isPF = assetType === "pf";

  const symbolLabel = isMF
    ? "Scheme"
    : isGold
      ? "Type"
      : isPF
        ? "Account"
        : "Symbol";
  const qtyLabel = isMF
    ? "Units"
    : isGold
      ? "Grams/Units"
      : isPF
        ? "Balance"
        : "Qty";
  const avgPriceLabel = isMF
    ? "Avg NAV"
    : isGold
      ? "Avg Buy Price"
      : isPF
        ? "Total Contrib."
        : "Avg Price";
  const cmpLabel = isMF
    ? "Current NAV"
    : isGold
      ? "Current Price"
      : isPF
        ? "Current Value"
        : "CMP";

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-62.5 cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                Name
                <SortIcon col="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("symbol")}
              >
                {symbolLabel}
                <SortIcon col="symbol" />
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => toggleSort("quantity")}
              >
                {qtyLabel}
                <SortIcon col="quantity" />
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => toggleSort("avgBuyPrice")}
              >
                {avgPriceLabel}
                <SortIcon col="avgBuyPrice" />
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => toggleSort("currentPrice")}
              >
                {cmpLabel}
                <SortIcon col="currentPrice" />
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => toggleSort("investedValue")}
              >
                Invested
                <SortIcon col="investedValue" />
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => toggleSort("currentValue")}
              >
                Current
                <SortIcon col="currentValue" />
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => toggleSort("totalReturns")}
              >
                P&L
                <SortIcon col="totalReturns" />
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => toggleSort("returnsPercentage")}
              >
                P&L %
                <SortIcon col="returnsPercentage" />
              </TableHead>
              <TableHead className="w-12.5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((holding) => {
              const returns = holding.totalReturns
                ? parseFloat(holding.totalReturns)
                : 0;
              const returnsPct = holding.returnsPercentage
                ? parseFloat(holding.returnsPercentage)
                : 0;
              const isPositive = returns >= 0;

              return (
                <TableRow key={holding.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="truncate max-w-57.5">
                        {holding.name}
                      </span>
                      {holding.platform && (
                        <Badge
                          className="text-xs text-muted-foreground w-fit"
                          variant={"info"}
                        >
                          {holding.platform}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {holding.symbol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {parseFloat(holding.quantity).toFixed(
                      isMF || isGold ? 3 : isPF ? 2 : 0,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(parseFloat(holding.avgBuyPrice))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {holding.currentPrice
                      ? formatCurrency(parseFloat(holding.currentPrice))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(parseFloat(holding.investedValue))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {holding.currentValue
                      ? formatCurrency(parseFloat(holding.currentValue))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 tabular-nums font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatCurrency(Math.abs(returns))}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={isPositive ? "default" : "destructive"}
                      className="tabular-nums font-mono text-xs"
                    >
                      {isPositive ? "+" : ""}
                      {returnsPct.toFixed(2)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditHolding(holding)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(holding.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      {editHolding && (
        <HoldingFormDialog
          open={!!editHolding}
          onOpenChange={(open: boolean) => !open && setEditHolding(null)}
          holding={editHolding}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holding?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove this
              holding from your portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
