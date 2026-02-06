import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CategoryMetadata } from "@workspace/domain";

type CategorizationMethod =
  | "manual"
  | "merchant_rule"
  | "vpa_rule"
  | "neft_rule"
  | "default";

interface CategoryInfo {
  category: string;
  confidence: number;
  method: CategorizationMethod;
  requiresReview: boolean;
}

interface MerchantPatternRule {
  category: string;
  confidence?: number;
  keywords: string[];
}

interface VpaAmountRule {
  vpa?: string;
  category?: string;
  confidence?: number;
  min_amount?: number;
  max_amount?: number;
  requires_manual?: boolean;
}

interface VpaPatternRule {
  pattern: string;
  category?: string;
  confidence?: number;
}

interface NeftPatternConfig {
  category?: string;
  confidence?: number;
  salary_keywords?: string[];
}

interface MerchantRulesConfig {
  exact_matches?: Record<string, string>;
  merchant_patterns?: MerchantPatternRule[];
  vpa_amount_rules?: VpaAmountRule[];
  vpa_patterns?: VpaPatternRule[];
  neft_patterns?: NeftPatternConfig;
}

interface DefaultCategoriesConfig {
  categories?: Record<
    string,
    {
      icon?: string;
      color?: string;
      parent?: string | null;
    }
  >;
}

type UserVpaRule = string | { category?: string; default_category?: string; confidence?: number; requires_manual?: boolean };

export interface UserCategorizationRules {
  manual_overrides?: Record<string, string>;
  exact_matches?: Record<string, string>;
  merchant_patterns?: MerchantPatternRule[];
  vpa_amount_rules?: VpaAmountRule[];
  vpa_rules?: Record<string, UserVpaRule>;
}

export interface CategorizationInput {
  id?: string;
  paid_to?: string;
  vpa?: string;
  transaction_mode?: string;
  amount?: number;
  transaction_type?: string;
}

export interface CategorizationResult {
  category: string;
  subcategory: string;
  confidence: number;
  method: CategorizationMethod;
  requiresReview: boolean;
  categoryMetadata: CategoryMetadata;
}

export class TransactionCategorizer {
  private static instance: TransactionCategorizer | null = null;

  static getInstance(): TransactionCategorizer {
    if (!this.instance) {
      this.instance = new TransactionCategorizer();
    }
    return this.instance;
  }

  private readonly defaultCategories: DefaultCategoriesConfig;
  private readonly merchantRules: MerchantRulesConfig;

  private constructor() {
    this.defaultCategories = this.loadConfig<DefaultCategoriesConfig>("default_categories.json");
    this.merchantRules = this.loadConfig<MerchantRulesConfig>("merchant_rules.json");
  }

  categorizeTransaction(
    transaction: CategorizationInput,
    userRules?: UserCategorizationRules,
  ): CategorizationResult {
    const paidTo = transaction.paid_to?.toLowerCase().trim() ?? "";
    const transactionMode = transaction.transaction_mode;
    const transactionType = transaction.transaction_type;
    const amount = transaction.amount ?? 0;

    let categoryInfo: CategoryInfo = {
      category: "uncategorized",
      confidence: 0,
      method: "default",
      requiresReview: false,
    };

    if (userRules?.manual_overrides) {
      const txnId = transaction.id;
      if (txnId && userRules.manual_overrides[txnId]) {
        categoryInfo = {
          category: userRules.manual_overrides[txnId]!,
          confidence: 1,
          method: "manual",
          requiresReview: false,
        };
        return this.enrichCategoryInfo(categoryInfo);
      }
    }

    if (paidTo) {
      const exactMatch = this.checkExactMatch(paidTo, userRules);
      if (exactMatch) {
        return this.enrichCategoryInfo(exactMatch);
      }
    }

    if (transactionMode === "upi" && paidTo) {
      const vpaMatch = this.checkVpaPattern(transaction, userRules, amount);
      if (vpaMatch) {
        return this.enrichCategoryInfo(vpaMatch);
      }
    }

    if (transactionMode === "neft" && transactionType === "credited" && paidTo) {
      const neftMatch = this.checkNeftPattern(paidTo);
      if (neftMatch) {
        return this.enrichCategoryInfo(neftMatch);
      }
    }

    if (paidTo) {
      const keywordMatch = this.checkKeywordPatterns(paidTo, userRules);
      if (keywordMatch) {
        return this.enrichCategoryInfo(keywordMatch);
      }
    }

    categoryInfo.requiresReview = true;
    return this.enrichCategoryInfo(categoryInfo);
  }

  private checkExactMatch(
    paidTo: string,
    userRules?: UserCategorizationRules,
  ): CategoryInfo | null {
    if (userRules?.exact_matches) {
      for (const [merchant, category] of Object.entries(userRules.exact_matches)) {
        if (paidTo === merchant.toLowerCase()) {
          return {
            category,
            confidence: 1,
            method: "merchant_rule",
            requiresReview: false,
          };
        }
      }
    }

    const exactMatches = this.merchantRules.exact_matches ?? {};
    for (const [merchant, category] of Object.entries(exactMatches)) {
      if (paidTo === merchant.toLowerCase()) {
        return {
          category,
          confidence: 0.95,
          method: "merchant_rule",
          requiresReview: false,
        };
      }
    }

    return null;
  }

  private checkKeywordPatterns(
    paidTo: string,
    userRules?: UserCategorizationRules,
  ): CategoryInfo | null {
    let bestMatch: CategoryInfo | null = null;
    let bestConfidence = 0;

    const userPatterns = userRules?.merchant_patterns ?? [];
    for (const pattern of userPatterns) {
      for (const keyword of pattern.keywords) {
        if (paidTo.includes(keyword.toLowerCase())) {
          const confidence = pattern.confidence ?? 0.9;
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestMatch = {
              category: pattern.category,
              confidence,
              method: "merchant_rule",
              requiresReview: false,
            };
          }
        }
      }
    }

    const globalPatterns = this.merchantRules.merchant_patterns ?? [];
    for (const pattern of globalPatterns) {
      for (const keyword of pattern.keywords) {
        if (paidTo.includes(keyword.toLowerCase())) {
          const confidence = pattern.confidence ?? 0.85;
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestMatch = {
              category: pattern.category,
              confidence,
              method: "merchant_rule",
              requiresReview: false,
            };
          }
        }
      }
    }

    return bestMatch;
  }

  private checkVpaPattern(
    transaction: CategorizationInput,
    userRules: UserCategorizationRules | undefined,
    amount: number,
  ): CategoryInfo | null {
    const vpa = transaction.vpa?.toLowerCase();
    if (!vpa) {
      return null;
    }

    const userVpaAmountRules = userRules?.vpa_amount_rules ?? [];
    for (const rule of userVpaAmountRules) {
      if (vpa !== rule.vpa?.toLowerCase()) {
        continue;
      }

      if (!this.matchesAmountRange(amount, rule)) {
        continue;
      }

      if (!rule.category) {
        continue;
      }

      return {
        category: rule.category,
        confidence: rule.confidence ?? 0.95,
        method: "vpa_rule",
        requiresReview: rule.requires_manual ?? false,
      };
    }

    const globalVpaAmountRules = this.merchantRules.vpa_amount_rules ?? [];
    for (const rule of globalVpaAmountRules) {
      if (vpa !== rule.vpa?.toLowerCase()) {
        continue;
      }

      if (!this.matchesAmountRange(amount, rule)) {
        continue;
      }

      if (!rule.category) {
        continue;
      }

      return {
        category: rule.category,
        confidence: rule.confidence ?? 0.95,
        method: "vpa_rule",
        requiresReview: rule.requires_manual ?? false,
      };
    }

    if (userRules?.vpa_rules?.[vpa]) {
      const rule = userRules.vpa_rules[vpa];
      if (typeof rule === "string") {
        return {
          category: rule,
          confidence: 0.95,
          method: "vpa_rule",
          requiresReview: false,
        };
      }

      const category = rule.category ?? rule.default_category;
      if (category) {
        return {
          category,
          confidence: rule.confidence ?? 0.95,
          method: "vpa_rule",
          requiresReview: rule.requires_manual ?? false,
        };
      }
    }

    const vpaPatterns = this.merchantRules.vpa_patterns ?? [];
    for (const patternRule of vpaPatterns) {
      let pattern: RegExp;
      try {
        pattern = new RegExp(patternRule.pattern);
      } catch {
        continue;
      }
      if (!pattern.test(vpa)) {
        continue;
      }

      if (!patternRule.category) {
        continue;
      }

      return {
        category: patternRule.category,
        confidence: patternRule.confidence ?? 0.9,
        method: "vpa_rule",
        requiresReview: false,
      };
    }

    return null;
  }

  private checkNeftPattern(paidTo: string): CategoryInfo | null {
    const neftConfig = this.merchantRules.neft_patterns;
    if (!neftConfig) {
      return null;
    }

    const salaryKeywords = neftConfig.salary_keywords ?? [];
    for (const keyword of salaryKeywords) {
      if (paidTo.includes(keyword.toLowerCase())) {
        return {
          category: neftConfig.category ?? "income_salary",
          confidence: neftConfig.confidence ?? 0.9,
          method: "neft_rule",
          requiresReview: false,
        };
      }
    }

    return null;
  }

  private matchesAmountRange(amount: number, rule: VpaAmountRule): boolean {
    if (rule.min_amount !== undefined && amount < rule.min_amount) {
      return false;
    }
    if (rule.max_amount !== undefined && amount > rule.max_amount) {
      return false;
    }
    return true;
  }

  private enrichCategoryInfo(categoryInfo: CategoryInfo): CategorizationResult {
    const categoryData = this.defaultCategories.categories?.[categoryInfo.category];
    return {
      category: categoryInfo.category,
      subcategory: categoryInfo.category,
      confidence: categoryInfo.confidence,
      method: categoryInfo.method,
      requiresReview: categoryInfo.requiresReview,
      categoryMetadata: {
        icon: categoryData?.icon ?? "question-circle",
        color: categoryData?.color ?? "#BDC3C7",
        parent: categoryData?.parent ?? null,
      },
    };
  }

  private loadConfig<T>(fileName: string): T {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const candidatePaths = [
      join(moduleDir, "config", fileName),
      join(process.cwd(), "src/modules/expenses/infrastructure/categorization/config", fileName),
      join(
        process.cwd(),
        "apps/api/src/modules/expenses/infrastructure/categorization/config",
        fileName,
      ),
    ];

    for (const path of candidatePaths) {
      if (!existsSync(path)) {
        continue;
      }

      const contents = readFileSync(path, "utf-8");
      return JSON.parse(contents) as T;
    }

    throw new Error(
      `Categorization config not found (${fileName}). Checked: ${candidatePaths.join(", ")}`,
    );
  }
}
