import { describe, expect, it } from "vitest";

import { TransactionCategorizer } from "@/modules/expenses/infrastructure/categorization/transaction-categorizer";

describe("TransactionCategorizer", () => {
  it("is a singleton", () => {
    const first = TransactionCategorizer.getInstance();
    const second = TransactionCategorizer.getInstance();

    expect(first).toBe(second);
  });

  it("applies manual overrides with highest priority", () => {
    const categorizer = TransactionCategorizer.getInstance();

    const result = categorizer.categorizeTransaction(
      {
        id: "txn-1",
        paid_to: "swiggy",
        transaction_mode: "upi",
        amount: 499,
        transaction_type: "debited",
        vpa: "food@okaxis",
      },
      {
        manual_overrides: {
          "txn-1": "utilities",
        },
      },
    );

    expect(result.category).toBe("utilities");
    expect(result.method).toBe("manual");
    expect(result.confidence).toBe(1);
    expect(result.requiresReview).toBe(false);
  });

  it("matches exact merchant rules before keyword rules", () => {
    const categorizer = TransactionCategorizer.getInstance();

    const result = categorizer.categorizeTransaction({
      paid_to: "swiggy",
      transaction_mode: "upi",
      amount: 250,
      transaction_type: "debited",
      vpa: "swiggy@okicici",
    });

    expect(result.category).toBe("food_dining");
    expect(result.method).toBe("merchant_rule");
  });

  it("applies VPA rule for UPI when no exact match exists", () => {
    const categorizer = TransactionCategorizer.getInstance();

    const result = categorizer.categorizeTransaction({
      paid_to: "random merchant",
      transaction_mode: "upi",
      amount: 2000,
      transaction_type: "credited",
      vpa: "salary.ops@corpbank",
    });

    expect(result.category).toBe("income_salary");
    expect(result.method).toBe("vpa_rule");
    expect(result.requiresReview).toBe(false);
  });

  it("falls back to uncategorized and review required", () => {
    const categorizer = TransactionCategorizer.getInstance();

    const result = categorizer.categorizeTransaction({
      paid_to: "unknown vendor",
      transaction_mode: "imps",
      amount: 123,
      transaction_type: "debited",
    });

    expect(result.category).toBe("uncategorized");
    expect(result.method).toBe("default");
    expect(result.requiresReview).toBe(true);
  });
});
