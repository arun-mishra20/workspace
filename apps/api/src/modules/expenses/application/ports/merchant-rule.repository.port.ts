/**
 * Merchant Category Rule Repository interface
 *
 * Persists user-learned merchant → category mappings.
 * Rules are applied automatically during email sync categorization.
 */
export interface MerchantCategoryRule {
    id: string;
    userId: string;
    merchant: string;
    category: string;
    subcategory: string;
    categoryMetadata?: { icon: string; color: string; parent: string | null } | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface MerchantCategoryRuleRepository {
    /**
     * Upsert a merchant → category rule. If the merchant already has a rule
     * for this user, the category is overwritten.
     */
    upsert(params: {
        userId: string;
        merchant: string;
        category: string;
        subcategory: string;
        categoryMetadata?: { icon: string; color: string; parent: string | null };
    }): Promise<MerchantCategoryRule>;

    /**
     * Load all rules for a user. Used during sync to build the
     * UserCategorizationRules.exact_matches map.
     */
    findAllByUser(userId: string): Promise<MerchantCategoryRule[]>;

    /**
     * Delete a rule by merchant name for a user.
     */
    deleteByMerchant(params: { userId: string; merchant: string }): Promise<boolean>;
}

export const MERCHANT_RULE_REPOSITORY = Symbol("MERCHANT_RULE_REPOSITORY");
