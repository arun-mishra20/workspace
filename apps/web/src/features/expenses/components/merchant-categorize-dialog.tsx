import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tags, Search, Check, Loader2 } from "lucide-react";

import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
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
  fetchDistinctMerchants,
  bulkCategorizeByMerchant,
  type MerchantCategoryInfo,
  type BulkCategorizeRequest,
} from "@/features/expenses/api/bulk-categorize";
import { CATEGORY_OPTIONS } from "../constants/category-options";

function getCategoryMeta(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value);
}

export function MerchantCategorizeDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMerchant, setSelectedMerchant] =
    useState<MerchantCategoryInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ["expenses", "merchants"],
    queryFn: fetchDistinctMerchants,
    enabled: open,
  });

  const bulkMutation = useMutation({
    mutationFn: bulkCategorizeByMerchant,
    onSuccess: () => {
      // Invalidate both merchants list and transactions
      void queryClient.invalidateQueries({
        queryKey: ["expenses", "merchants"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["expenses", "transactions"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["expenses", "analytics"],
      });
      // Reset selection
      setSelectedMerchant(null);
      setSelectedCategory("");
      setSelectedSubcategory("");
    },
  });

  const filteredMerchants = useMemo(() => {
    if (!merchants) return [];
    if (!searchQuery.trim()) return merchants;
    return merchants.filter((m) =>
      m.merchant.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [merchants, searchQuery]);

  function handleMerchantSelect(merchant: MerchantCategoryInfo) {
    setSelectedMerchant(merchant);
    setSelectedCategory(merchant.category);
    setSelectedSubcategory(merchant.subcategory);
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value);
    // Keep subcategory as the category value for simplicity (user can change)
    setSelectedSubcategory(value);
  }

  function handleApply() {
    if (!selectedMerchant || !selectedCategory || !selectedSubcategory) return;

    const categoryMeta = getCategoryMeta(selectedCategory);

    const payload: BulkCategorizeRequest = {
      merchant: selectedMerchant.merchant,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      categoryMetadata: categoryMeta
        ? {
          icon: categoryMeta.icon,
          color: categoryMeta.color,
          parent: categoryMeta.parent,
        }
        : undefined,
    };

    bulkMutation.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-1">
          <Tags className="size-4" />
          Categorize by Merchant
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Categorize by Merchant</DialogTitle>
          <DialogDescription>
            Select a merchant and assign a category &amp; subcategory to all
            their transactions at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="m-1 pl-9 w-[98%]"
            />
          </div>

          {/* Merchant List */}
          <div className="min-h-0 max-h-70 flex-1 overflow-y-auto rounded-md border">
            {merchantsLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading merchants...
              </div>
            ) : filteredMerchants.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                No merchants found.
              </div>
            ) : (
              <ul className="divide-y">
                {filteredMerchants.map((merchant) => {
                  const isSelected =
                    selectedMerchant?.merchant === merchant.merchant;
                  const categoryMeta = getCategoryMeta(merchant.category);

                  return (
                    <li key={merchant.merchant}>
                      <button
                        type="button"
                        onClick={() => handleMerchantSelect(merchant)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent ${isSelected ? "bg-accent" : ""
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected && (
                            <Check className="size-4 text-primary" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {merchant.merchant}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {merchant.transactionCount} transaction
                              {merchant.transactionCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                          style={{
                            borderColor: categoryMeta?.color,
                            color: categoryMeta?.color,
                          }}
                        >
                          {categoryMeta?.label ??
                            merchant.category.replace(/_/g, " ")}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Category & Subcategory Selectors */}
          {selectedMerchant && (
            <div className="space-y-4 rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium">
                Assign category for{" "}
                <span className="text-primary">
                  &quot;{selectedMerchant.merchant}&quot;
                </span>
                <span className="ml-1 text-muted-foreground">
                  ({selectedMerchant.transactionCount} transactions)
                </span>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-category">Category</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger id="bulk-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-subcategory">Subcategory</Label>
                  <Input
                    id="bulk-subcategory"
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    placeholder="Subcategory"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleApply}
                  disabled={
                    !selectedCategory ||
                    !selectedSubcategory ||
                    bulkMutation.isPending
                  }
                >
                  {bulkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 size-4" />
                      Apply to {selectedMerchant.transactionCount} transactions
                    </>
                  )}
                </Button>
              </div>

              {bulkMutation.isSuccess && (
                <p className="text-sm text-emerald-600">
                  ✓ Updated {bulkMutation.data.updatedCount} transactions for
                  &quot;{bulkMutation.data.merchant}&quot;
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
