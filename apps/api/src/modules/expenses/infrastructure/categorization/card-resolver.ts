import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface CreditCardConfig {
    type: string;
    name: string;
    bank: string;
    icon: string;
    last_four_digits: string;
    milestones: Record<
        string,
        {
            type: string;
            description: string;
            amount: number;
            reward_points?: number;
            durations: string[];
        }
    >;
}

export interface ResolvedCard {
    cardName: string;
    bank: string;
    icon: string;
    milestones: CreditCardConfig["milestones"];
}

/**
 * Resolves credit card last-4 digits to card name, bank & metadata
 * using the credit_cards.json configuration file.
 */
export class CardResolver {
    private static instance: CardResolver | null = null;

    static getInstance(): CardResolver {
        if (!this.instance) {
            this.instance = new CardResolver();
        }
        return this.instance;
    }

    /** Map from last-4 digits → card metadata */
    private readonly cardMap: Map<string, ResolvedCard>;

    private constructor() {
        this.cardMap = this.loadCardConfig();
    }

    /**
     * Resolve a last-4 digit string to the card's display name.
     * Returns undefined if the card is not in the config.
     */
    resolve(last4: string | null | undefined): ResolvedCard | undefined {
        if (!last4) return undefined;
        return this.cardMap.get(last4);
    }

    /**
     * Resolve just the card display name for a given last-4 digits.
     * Falls back to "Card ••{last4}" if not found in config.
     */
    resolveCardName(last4: string | null | undefined): string | undefined {
        if (!last4) return undefined;
        const card = this.cardMap.get(last4);
        return card?.cardName ?? `Card ••${last4}`;
    }

    /** Get all configured cards (for analytics enrichment) */
    getAllCards(): Map<string, ResolvedCard> {
        return this.cardMap;
    }

    private loadCardConfig(): Map<string, ResolvedCard> {
        const moduleDir = dirname(fileURLToPath(import.meta.url));
        const candidatePaths = [
            join(moduleDir, "config", "credit_cards.json"),
            join(moduleDir, "..", "categorization", "config", "credit_cards.json"),
            join(
                process.cwd(),
                "src/modules/expenses/infrastructure/categorization/config/credit_cards.json",
            ),
        ];

        for (const p of candidatePaths) {
            if (existsSync(p)) {
                const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<
                    string,
                    CreditCardConfig
                >;
                const map = new Map<string, ResolvedCard>();

                for (const [_key, card] of Object.entries(raw)) {
                    map.set(card.last_four_digits, {
                        cardName: card.name,
                        bank: card.bank,
                        icon: card.icon,
                        milestones: card.milestones,
                    });
                }

                return map;
            }
        }

        // Return empty map if config not found (graceful degradation)
        return new Map();
    }
}
