import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  useCreateHolding,
  useUpdateHolding,
} from "@/features/holdings/api/holdings";
import { toast } from "sonner";
import type { Holding } from "@workspace/domain";

interface HoldingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode */
  holding?: Holding | null;
  /** Pre-select an asset type when opening in create mode */
  defaultAssetType?: "stock" | "mutual_fund" | "gold" | "etf" | "pf";
}

export function HoldingFormDialog({
  open,
  onOpenChange,
  holding,
  defaultAssetType,
}: HoldingFormDialogProps) {
  const isEdit = !!holding;
  const createMutation = useCreateHolding();
  const updateMutation = useUpdateHolding();

  const [form, setForm] = useState({
    symbol: "",
    name: "",
    assetType: defaultAssetType ?? "stock",
    platform: "",
    quantity: "",
    avgBuyPrice: "",
    currentPrice: "",
  });

  useEffect(() => {
    if (holding) {
      setForm({
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType as
          | "stock"
          | "mutual_fund"
          | "gold"
          | "etf"
          | "pf",
        platform: holding.platform ?? "",
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        currentPrice: holding.currentPrice ?? "",
      });
    } else {
      setForm({
        symbol: "",
        name: "",
        assetType: defaultAssetType ?? "stock",
        platform: "",
        quantity: "",
        avgBuyPrice: "",
        currentPrice: "",
      });
    }
  }, [holding, defaultAssetType, open]);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.name || !form.quantity || !form.avgBuyPrice)
      return;

    const payload = {
      symbol: form.symbol.toUpperCase(),
      name: form.name,
      assetType: form.assetType as
        | "stock"
        | "mutual_fund"
        | "gold"
        | "etf"
        | "pf",
      platform: form.platform || undefined,
      quantity: form.quantity,
      avgBuyPrice: form.avgBuyPrice,
      currentPrice: form.currentPrice || undefined,
    };

    if (isEdit && holding) {
      updateMutation.mutate(
        { id: holding.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Holding updated");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to update holding"),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Holding added");
          onOpenChange(false);
        },
        onError: (err: any) => {
          const msg =
            err.response?.data?.message?.[0] ||
            err.response?.data?.message ||
            "Failed to add holding";
          toast.error(msg);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Holding" : "Add Holding"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the details of this holding."
                : "Manually add an investment to your portfolio."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Asset Type */}
            <div className="grid gap-2">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select
                value={form.assetType}
                onValueChange={(v) => setField("assetType", v)}
              >
                <SelectTrigger id="assetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="pf">Provident Fund</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Symbol */}
            <div className="grid gap-2">
              <Label htmlFor="symbol">
                {form.assetType === "mutual_fund"
                  ? "Scheme Code"
                  : form.assetType === "pf"
                    ? "Account ID"
                    : form.assetType === "gold"
                      ? "Type"
                      : "Symbol"}
              </Label>
              <Input
                id="symbol"
                placeholder={
                  form.assetType === "mutual_fund"
                    ? "e.g. PPFCF_DIRECT"
                    : form.assetType === "pf"
                      ? "e.g. EPF, PPF, VPF"
                      : form.assetType === "gold"
                        ? "e.g. SGB, PHYSICAL, DIGITAL"
                        : "e.g. RELIANCE"
                }
                value={form.symbol}
                onChange={(e) => setField("symbol", e.target.value)}
                required
                className="font-mono uppercase"
              />
            </div>

            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder={
                  form.assetType === "mutual_fund"
                    ? "Parag Parikh Flexi Cap Fund Direct Growth"
                    : form.assetType === "pf"
                      ? "Employee Provident Fund"
                      : form.assetType === "gold"
                        ? "Sovereign Gold Bond 2024-25"
                        : "Reliance Industries Ltd."
                }
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
              />
            </div>

            {/* Quantity & Avg Price side-by-side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">
                  {form.assetType === "mutual_fund"
                    ? "Units"
                    : form.assetType === "gold"
                      ? "Grams / Units"
                      : form.assetType === "pf"
                        ? "Balance"
                        : "Quantity"}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setField("quantity", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avgBuyPrice">
                  {form.assetType === "mutual_fund"
                    ? "Avg NAV"
                    : form.assetType === "pf"
                      ? "Total Contribution"
                      : "Avg Price"}
                </Label>
                <Input
                  id="avgBuyPrice"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={form.avgBuyPrice}
                  onChange={(e) => setField("avgBuyPrice", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Current Price */}
            <div className="grid gap-2">
              <Label htmlFor="currentPrice">
                {form.assetType === "mutual_fund"
                  ? "Current NAV (optional)"
                  : form.assetType === "pf"
                    ? "Current Balance (optional)"
                    : "Current Price (optional)"}
              </Label>
              <Input
                id="currentPrice"
                type="number"
                step="any"
                min="0"
                placeholder="Leave blank to use avg price"
                value={form.currentPrice}
                onChange={(e) => setField("currentPrice", e.target.value)}
              />
            </div>

            {/* Platform */}
            <div className="grid gap-2">
              <Label htmlFor="platform">Platform (optional)</Label>
              <Input
                id="platform"
                placeholder="e.g. Zerodha, Groww, Angel One"
                value={form.platform}
                onChange={(e) => setField("platform", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Add Holding"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
